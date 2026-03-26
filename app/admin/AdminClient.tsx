'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateDuel, adminCloseDuel, adminSetWeekFilm, adminDeleteFilm, adminDeleteUser, adminGrantExp } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { CONFIG } from '@/lib/config'
import type { Film, Profile } from '@/lib/supabase/types'

interface Props {
  profile: Profile
  films: Film[]
  users: any[]
  duels: any[]
  weekFilm: any
  totalUsers: number
  watchCountMap: Record<number, number>
}

export default function AdminClient({ profile, films, users, duels, weekFilm, totalUsers, watchCountMap }: Props) {
  const { addToast } = useToast()
  const router = useRouter()

  function getWatchPct(filmId: number) {
    if (!totalUsers) return 0
    return Math.round(((watchCountMap[filmId] ?? 0) / totalUsers) * 100)
  }

  async function createDuel() {
    const eligible = films.filter(f => f.saison === 1 && getWatchPct(f.id) < CONFIG.SEUIL_MAJORITY)
    if (eligible.length < 2) { addToast('Pas assez de films éligibles', '⚠️'); return }
    const sorted = [...eligible].sort((a, b) => getWatchPct(a.id) - getWatchPct(b.id)).slice(0, Math.min(10, eligible.length))
    let f1 = sorted[0], f2 = sorted[1]
    let tries = 0
    while (f1.id === f2.id && tries < 20) {
      f1 = sorted[Math.floor(Math.random() * sorted.length)]
      f2 = sorted[Math.floor(Math.random() * sorted.length)]
      tries++
    }
    const weekNum = duels.length + 1
    const result = await adminCreateDuel(f1.id, f2.id, weekNum)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast(`Duel S${weekNum} créé : ${f1.titre} VS ${f2.titre}`, '⚔️'); router.refresh() }
  }

  async function closeDuel(duelId: number) {
    const result = await adminCloseDuel(duelId)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast('Duel clôturé — vainqueur désigné !', '🏆'); router.refresh() }
  }

  async function setWeekFilm(filmId: string) {
    if (!filmId) return
    const result = await adminSetWeekFilm(parseInt(filmId), `${CONFIG.FDLS_JOUR} soir à ${CONFIG.FDLS_HEURE}`)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast('Film de la semaine défini !', '🎬'); router.refresh() }
  }

  async function deleteFilm(filmId: number, titre: string) {
    if (!confirm(`Retirer "${titre}" de la liste ?`)) return
    await adminDeleteFilm(filmId)
    addToast(`"${titre}" retiré`, '🗑️')
    router.refresh()
  }

  async function deleteUser(userId: string, pseudo: string) {
    if (!confirm(`Supprimer "${pseudo}" ?`)) return
    await adminDeleteUser(userId)
    addToast(`${pseudo} supprimé`, '🗑️')
    router.refresh()
  }

  async function grantExp(userId: string, pseudo: string, amount: number) {
    await adminGrantExp(userId, amount)
    addToast(`+${amount} EXP donné à ${pseudo}`, '🎖️')
    router.refresh()
  }

  const Section = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <div style={{ background: 'rgba(232,90,90,.04)', border: '1px solid rgba(232,90,90,.18)', borderRadius: 'var(--rl)', padding: '1.3rem', marginBottom: '1.2rem' }}>
      <div style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1rem' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Administration</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>Accès restreint · {CONFIG.SAISON_LABEL}</div>
      </div>

      {/* Duels */}
      <Section icon="⚔️" title="Gestion des duels">
        <button className="btn btn-gold" onClick={createDuel} style={{ marginBottom: '1rem' }}>
          Générer un duel aléatoire (films les moins vus)
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {duels.map((d: any) => {
            const v1 = d.votes?.filter((v: any) => v.film_choice === d.film1_id).length ?? 0
            const v2 = d.votes?.filter((v: any) => v.film_choice === d.film2_id).length ?? 0
            return (
              <div key={d.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.75rem 1rem', display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, fontSize: '.82rem' }}>
                  <strong>{d.film1?.titre}</strong> VS <strong>{d.film2?.titre}</strong>
                  <span style={{ color: 'var(--text3)', marginLeft: '.5rem' }}>S{d.week_num}</span>
                </span>
                <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{v1 + v2} votes</span>
                {d.closed ? (
                  <span style={{ fontSize: '.72rem', color: 'var(--green)' }}>✓ Clôturé</span>
                ) : (
                  <button className="btn btn-outline" style={{ fontSize: '.73rem', padding: '.28rem .65rem' }} onClick={() => closeDuel(d.id)}>Clôturer</button>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Week film */}
      <Section icon="🎬" title="Film de la semaine">
        {weekFilm && (
          <div style={{ marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.8rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.7rem 1rem' }}>
            <span style={{ fontSize: '.85rem', flex: 1 }}>Actuel : <strong>{(weekFilm as any).films?.titre}</strong></span>
            <button className="btn btn-red" style={{ fontSize: '.73rem', padding: '.28rem .65rem' }} onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client')
              const sb = createClient()
              await (sb.from('week_films') as any).update({ active: false }).eq('active', true)
              addToast('Film de la semaine retiré', '↩️')
              router.refresh()
            }}>Retirer</button>
          </div>
        )}
        <select
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.65rem .9rem', color: 'var(--text2)', fontFamily: 'var(--font-body)', fontSize: '.88rem' }}
          defaultValue=""
          onChange={e => setWeekFilm(e.target.value)}
        >
          <option value="">Choisir le film de cette semaine…</option>
          {films.filter(f => f.saison === 1).map(f => (
            <option key={f.id} value={f.id}>{f.titre} ({f.annee}) — {getWatchPct(f.id)}% vus</option>
          ))}
        </select>
      </Section>

      {/* Users */}
      <Section icon="👥" title={`Joueurs (${users.length})`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', maxHeight: 400, overflowY: 'auto' }}>
          {users.map((u: any) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.6rem 1rem', flexWrap: 'wrap' }}>
              <span style={{ flex: 1, fontSize: '.85rem', fontWeight: 500 }}>{u.pseudo}</span>
              <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>S{u.saison}</span>
              <span style={{ fontSize: '.8rem', color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{u.exp} EXP</span>
              <span style={{ fontSize: '.72rem', color: 'var(--text2)' }}>🎬 {u.watched?.length ?? 0}</span>
              <button className="btn btn-green" style={{ fontSize: '.7rem', padding: '.22rem .55rem' }} onClick={() => grantExp(u.id, u.pseudo, 10)}>+10 EXP</button>
              {!u.is_admin && (
                <button className="btn btn-red" style={{ fontSize: '.7rem', padding: '.22rem .55rem' }} onClick={() => deleteUser(u.id, u.pseudo)}>✕</button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Films */}
      <Section icon="🎥" title={`Films (${films.length})`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', maxHeight: 350, overflowY: 'auto' }}>
          {films.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.5rem .85rem', flexWrap: 'wrap' }}>
              <span style={{ flex: 1, fontSize: '.82rem' }}>{f.titre} <span style={{ color: 'var(--text3)', fontSize: '.7rem' }}>({f.annee})</span></span>
              <span style={{ fontSize: '.68rem', color: f.saison === 2 ? 'var(--red)' : 'var(--text3)', border: '1px solid var(--border)', borderRadius: 99, padding: '1px 6px' }}>S{f.saison}</span>
              <span style={{ fontSize: '.72rem', color: 'var(--text2)' }}>{getWatchPct(f.id)}% vus</span>
              <button className="btn btn-red" style={{ fontSize: '.68rem', padding: '.2rem .5rem' }} onClick={() => deleteFilm(f.id, f.titre)}>✕</button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
