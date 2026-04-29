import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache avec fallback silencieux — si Redis est down, on fetch directement
// Ne cache jamais null/undefined (timeout Supabase, erreur réseau)
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get<T>(key)
    if (cached !== null && cached !== undefined) return cached
  } catch {}

  const data = await fn()

  if (data !== null && data !== undefined) {
    try {
      await redis.set(key, data, { ex: ttlSeconds })
    } catch {}
  }

  return data
}
