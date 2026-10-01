import { createAdminClient } from '@/lib/supabase/server'
import { fromParis, parisParts } from '@/lib/time/paris'
import { revalidatePath } from 'next/cache'
import { deleteCacheKeys } from '@/lib/redis'
import { getServerConfig } from '@/lib/serverConfig'

export function nextDuelDeadline(from: Date): Date {
  const p = parisParts(from)
  let daysUntilWed = (3 - p.dow + 7) % 7
  if (daysUntilWed === 0 && p.h >= 20) daysUntilWed = 7
  if (daysUntilWed === 0 && p.h < 20) daysUntilWed = 0
  const target = new Date(Date.UTC(p.y, p.m - 1, p.d) + daysUntilWed * 86400000)
  return fromParis(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), 20)
}

type DuelRow = { id: number; film1_id: number; film2_id: number }
type VoteRow = { film_choice: number }

export async function pickWinner(
  duel: DuelRow,
  votes: VoteRow[],
  rule: 'note' | 'hasard'
): Promise<number> {
  const v1 = votes.filter(v => v.film_choice === duel.film1_id).length
  const v2 = votes.filter(v => v.film_choice === duel.film2_id).length

  if (v1 > v2) return duel.film1_id
  if (v2 > v1) return duel.film2_id

  if (rule === 'note') {
    const admin = createAdminClient()
    const { data: r1 } = await admin
      .from('ratings')
      .select('score')
      .eq('film_id', duel.film1_id)
    const { data: r2 } = await admin
      .from('ratings')
      .select('score')
      .eq('film_id', duel.film2_id)

    const avg1 = r1?.length ? r1.reduce((s, r) => s + r.score, 0) / r1.length : 0
    const avg2 = r2?.length ? r2.reduce((s, r) => s + r.score, 0) / r2.length : 0

    if (avg1 > avg2) return duel.film1_id
    if (avg2 > avg1) return duel.film2_id
  }

  return Math.random() < 0.5 ? duel.film1_id : duel.film2_id
}

export async function closeDueDuels({ duringRender = false } = {}) {
  const admin = createAdminClient()
  const cfg = await getServerConfig()
  const now = new Date()

  const { data: duels, error } = await admin
    .from('duels')
    .select('id, film1_id, film2_id, created_at, closes_at')
    .eq('closed', false)
    .eq('pending', false)

  if (error || !duels?.length) return 0

  let closed = 0
  for (const duel of duels) {
    const deadline = duel.closes_at
      ? new Date(duel.closes_at)
      : nextDuelDeadline(new Date(duel.created_at))

    if (now < deadline) continue

    const { data: votes } = await admin
      .from('votes')
      .select('film_choice')
      .eq('duel_id', duel.id)

    const winnerId = await pickWinner(duel, votes ?? [], cfg.duel_egalite as 'note' | 'hasard')

    const { error: updateErr } = await admin
      .from('duels')
      .update({
        winner_id: winnerId,
        closed: true,
        closed_at: now.toISOString(),
      })
      .eq('id', duel.id)
      .eq('closed', false)

    if (!updateErr) closed++
  }

  if (closed > 0) {
    await deleteCacheKeys(['duels:list'])
    if (!duringRender) {
      revalidatePath('/duels')
      revalidatePath('/')
      revalidatePath('/admin')
    }
  }

  return closed
}
