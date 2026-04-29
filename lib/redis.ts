import { Redis } from '@upstash/redis'

function createRedisClient(): Redis | null {
  // Format standard Upstash (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }

  // Format Vercel Storage : rediss://default:TOKEN@HOST.upstash.io:PORT
  if (process.env.REDIS_URL) {
    try {
      const parsed = new URL(process.env.REDIS_URL)
      const token = parsed.password          // le token est dans le mot de passe
      const restUrl = `https://${parsed.hostname}`  // REST API = même host, https
      if (token && parsed.hostname.includes('upstash')) {
        return new Redis({ url: restUrl, token })
      }
    } catch {}
  }

  return null
}

export const redis = createRedisClient()

// Cache avec fallback silencieux — si Redis est down, on fetch directement
// Ne cache jamais null/undefined (timeout Supabase, erreur réseau)
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!redis) return fn()

  try {
    const cached = await Promise.race([
      redis.get<T>(key),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 400)),
    ]) as T | null
    if (cached !== null && cached !== undefined) return cached
  } catch {}

  const data = await fn()

  if (data !== null && data !== undefined) {
    try {
      await Promise.race([
        redis.set(key, data, { ex: ttlSeconds }),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 400)),
      ])
    } catch {}
  }

  return data
}
