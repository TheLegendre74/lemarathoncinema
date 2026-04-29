import { createClient } from 'redis'

// Connexion réutilisée entre les requêtes (Vercel Fluid Compute)
let _client: ReturnType<typeof createClient> | null = null

async function getClient() {
  if (!process.env.REDIS_URL) return null

  if (_client?.isReady) return _client

  try {
    const client = createClient({ url: process.env.REDIS_URL })
    client.on('error', () => {}) // erreurs silencieuses

    await Promise.race([
      client.connect(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ])

    _client = client
    return _client
  } catch {
    _client = null
    return null
  }
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
    client = await Promise.race([
      getClient(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
    ])
  } catch {}

  if (!client) return fn()

  try {
    const cached = await Promise.race([
      client.get(key),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 400)),
    ])
    if (cached) return JSON.parse(cached) as T
  } catch {}

  const data = await fn()

  if (data !== null && data !== undefined) {
    try {
      await Promise.race([
        client.setEx(key, ttlSeconds, JSON.stringify(data)),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 400)),
      ])
    } catch {}
  }

  return data
}

export async function deleteCacheKeys(keys: string[]) {
  let client: Awaited<ReturnType<typeof getClient>> = null
  try {
    client = await Promise.race([
      getClient(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
    ])
  } catch {}

  if (!client) return

  try {
    await Promise.race([
      client.del(keys),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 400)),
    ])
  } catch {}
}
