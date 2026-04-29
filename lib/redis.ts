import { createClient } from 'redis'

// Connexion réutilisée entre les requêtes (Vercel Fluid Compute)
let _client: ReturnType<typeof createClient> | null = null
let _connectPromise: Promise<ReturnType<typeof createClient> | null> | null = null
let _disabledUntil = 0

const CONNECT_TIMEOUT_MS = 250
const OP_TIMEOUT_MS = 250
const FAILURE_COOLDOWN_MS = 15_000

function timeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

async function getClient() {
  if (!process.env.REDIS_URL) return null
  if (Date.now() < _disabledUntil) return null

  if (_client?.isReady) return _client
  if (_connectPromise) return _connectPromise

  _connectPromise = (async () => {
    const client = createClient({ url: process.env.REDIS_URL })
    client.on('error', () => {}) // erreurs silencieuses

    try {
      const connected = await timeout(
        client.connect().then(() => client).catch(() => null),
        CONNECT_TIMEOUT_MS,
        null
      )

      if (!connected?.isReady) {
        try { await client.disconnect() } catch {}
        _disabledUntil = Date.now() + FAILURE_COOLDOWN_MS
        return null
      }

      _client = connected
      return _client
    } finally {
      _connectPromise = null
    }
  })()

  return _connectPromise
}

// Cache avec fallback silencieux — si Redis est down, on fetch directement Supabase
// Ne cache jamais null/undefined (timeout ou erreur)
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  let client: Awaited<ReturnType<typeof getClient>> = null
  try {
    client = await timeout(
      getClient(),
      OP_TIMEOUT_MS,
      null
    )
  } catch {}

  if (!client) return fn()

  try {
    const cached = await timeout(
      client.get(key),
      OP_TIMEOUT_MS,
      null
    )
    if (cached) return JSON.parse(cached) as T
  } catch {}

  const data = await fn()

  if (data !== null && data !== undefined) {
    try {
      await timeout(
        client.setEx(key, ttlSeconds, JSON.stringify(data)),
        OP_TIMEOUT_MS,
        null
      )
    } catch {}
  }

  return data
}

export async function deleteCacheKeys(keys: string[]) {
  let client: Awaited<ReturnType<typeof getClient>> = null
  try {
    client = await timeout(
      getClient(),
      OP_TIMEOUT_MS,
      null
    )
  } catch {}

  if (!client) return

  try {
    await timeout(
      client.del(keys),
      OP_TIMEOUT_MS,
      null
    )
  } catch {}
}
