'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import {
  adminGrantExp, adminDeleteUser, adminSetAdmin,
  adminReviewSeasonJoinRequest, adminReviewMarathonRequest,
  adminDirectAdmitToMarathon, adminGetPreMarathonStats,
} from '@/lib/actions'
import styles from '../admin.module.css'

interface UserRow {
  id: string
  pseudo: string
  avatar_url: string | null
  is_admin: boolean
  exp: number
  saison: number
  in_marathon: boolean
  created_at: string
  watchCount: number
  voteCount: number
}

interface Props {
  users: UserRow[]
  seasonJoinRequests: any[]
  marathonRequests: any[]
  saisonNumero: number
}

export default function JoueursPage({ users, seasonJoinRequests, marathonRequests, saisonNumero }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [expUserId, setExpUserId] = useState<string | null>(null)
  const [expAmount, setExpAmount] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteInput, setDeleteInput] = useState('')

  const [preStats, setPreStats] = useState<any>(null)
  const [preStatsLoading, setPreStatsLoading] = useState(false)

  const filtered = search.length >= 2
    ? users.filter(u => u.pseudo.toLowerCase().includes(search.toLowerCase()))
    : users

  const inMarathon = users.filter(u => u.in_marathon)
  const outMarathon = users.filter(u => !u.in_marathon)

  async function handleGrantExp(userId: string, pseudo: string) {
    const amount = parseInt(expAmount)
    if (isNaN(amount) || amount === 0) { addToast('Montant invalide.'); return }
    if (amount < -1000 || amount > 1000) { addToast('Montant entre -1000 et 1000.'); return }
    setBusy(true)
    await adminGrantExp(userId, amount)
    addToast(`${amount > 0 ? '+' : ''}${amount} EXP pour ${pseudo}. Enregistre — en ligne.`)
    setExpUserId(null); setExpAmount('')
    router.refresh()
    setBusy(false)
  }

  async function handleToggleAdmin(userId: string, pseudo: string, makeAdmin: boolean) {
    const msg = makeAdmin
      ? `Accorder les droits admin a "${pseudo}" ?`
      : `Retirer les droits admin a "${pseudo}" ?`
    if (!confirm(msg)) return
    setBusy(true)
    const result = await adminSetAdmin(userId, makeAdmin)
    if (result?.error) addToast(result.error)
    else { addToast(`Droits admin ${makeAdmin ? 'accordes' : 'retires'} pour ${pseudo}.`); router.refresh() }
    setBusy(false)
  }

  async function handleDeleteUser(userId: string, pseudo: string) {
    if (deleteInput !== pseudo) { addToast(`Tape "${pseudo}" pour confirmer.`); return }
    setBusy(true)
    await adminDeleteUser(userId)
    addToast(`${pseudo} supprime.`)
    setDeleteConfirm(null); setDeleteInput('')
    router.refresh()
    setBusy(false)
  }

  async function handleAdmit(userId: string) {
    setBusy(true)
    const result = await adminDirectAdmitToMarathon(userId)
    if (result?.error) addToast(result.error)
    else { addToast('Joueur admis.'); router.refresh() }
    setBusy(false)
  }

  async function handleJoinReview(requestId: string, action: 'approve_current' | 'approve_next' | 'reject') {
    setBusy(true)
    const result = await adminReviewSeasonJoinRequest(requestId, action)
    if (result?.error) addToast(result.error)
    else { addToast(action !== 'reject' ? 'Demande acceptee.' : 'Demande refusee.'); router.refresh() }
    setBusy(false)
  }

  async function handleMarathonReview(requestId: string, action: 'approve' | 'reject') {
    setBusy(true)
    const result = await adminReviewMarathonRequest(requestId, action)
    if (result?.error) addToast(result.error)
    else { addToast(action === 'approve' ? 'Demande approuvee.' : 'Demande refusee.'); router.refresh() }
    setBusy(false)
  }

  async function loadPreStats() {
    setPreStatsLoading(true)
    const result = await adminGetPreMarathonStats()
    setPreStats(result)
    setPreStatsLoading(false)
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Joueurs</h1>

      {/* Demandes en attente */}
      {(seasonJoinRequests.length > 0 || marathonRequests.length > 0) && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Demandes en attente</h2>

          {seasonJoinRequests.map((r: any) => (
            <div key={r.id} className={styles.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <div>
                <strong>{r.profiles?.pseudo ?? '?'}</strong>
                <span style={{ color: 'var(--ink3)', marginLeft: 'var(--sp-3)', fontSize: 'var(--fs-1)' }}>
                  {r.type === 'next_season' ? 'Saison prochaine' : 'Cette saison'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button className={styles.btnPrimary} style={{ fontSize: 'var(--fs-1)' }} disabled={busy} onClick={() => handleJoinReview(r.id, r.type === 'next_season' ? 'approve_next' : 'approve_current')}>Accepter</button>
                <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-1)' }} disabled={busy} onClick={() => handleJoinReview(r.id, 'reject')}>Refuser</button>
              </div>
            </div>
          ))}

          {marathonRequests.map((r: any) => (
            <div key={r.id} className={styles.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <div>
                <strong>{r.profiles?.pseudo ?? '?'}</strong>
                <span style={{ color: 'var(--ink3)', marginLeft: 'var(--sp-3)', fontSize: 'var(--fs-1)' }}>Depassement de limite</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button className={styles.btnPrimary} style={{ fontSize: 'var(--fs-1)' }} disabled={busy} onClick={() => handleMarathonReview(r.id, 'approve')}>Accepter</button>
                <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-1)' }} disabled={busy} onClick={() => handleMarathonReview(r.id, 'reject')}>Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recherche joueurs */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Tous les joueurs ({users.length})</h2>
        <input
          className={styles.input}
          style={{ marginBottom: 'var(--sp-4)' }}
          placeholder="Rechercher par pseudo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className={styles.card}>
          {filtered.slice(0, 50).map(u => (
            <div key={u.id} className={styles.row} style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <strong>{u.pseudo}</strong>
                {u.is_admin && <span style={{ color: 'var(--accent-fg)', marginLeft: 'var(--sp-2)', fontSize: 'var(--fs-0)' }}>admin</span>}
              </div>
              <span style={{ fontSize: 'var(--fs-1)', color: 'var(--ink2)', minWidth: 60 }}>S{u.saison}</span>
              <span style={{ fontSize: 'var(--fs-1)', color: 'var(--ink2)', minWidth: 80 }}>{u.exp} EXP</span>
              <span style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)', minWidth: 60 }}>{u.watchCount} vus</span>
              <span style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)', minWidth: 60 }}>{u.voteCount} votes</span>

              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button className={styles.btn} style={{ fontSize: 'var(--fs-0)' }} onClick={() => setExpUserId(expUserId === u.id ? null : u.id)}>EXP</button>
                <button className={styles.btn} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleToggleAdmin(u.id, u.pseudo, !u.is_admin)}>
                  {u.is_admin ? 'Retirer admin' : 'Rendre admin'}
                </button>
                <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} onClick={() => setDeleteConfirm(deleteConfirm === u.id ? null : u.id)}>Supprimer</button>
              </div>

              {expUserId === u.id && (
                <div style={{ width: '100%', display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', paddingTop: 'var(--sp-2)' }}>
                  <input className={styles.input} style={{ width: 120 }} type="number" min="-1000" max="1000" placeholder="Montant" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
                  <button className={styles.btnPrimary} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleGrantExp(u.id, u.pseudo)}>Appliquer</button>
                </div>
              )}

              {deleteConfirm === u.id && (
                <div style={{ width: '100%', display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', paddingTop: 'var(--sp-2)' }}>
                  <input className={styles.input} style={{ width: 200 }} placeholder={`Tape "${u.pseudo}"`} value={deleteInput} onChange={e => setDeleteInput(e.target.value)} />
                  <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} disabled={busy || deleteInput !== u.pseudo} onClick={() => handleDeleteUser(u.id, u.pseudo)}>Confirmer</button>
                </div>
              )}
            </div>
          ))}
          {filtered.length > 50 && (
            <p className={styles.empty}>{filtered.length - 50} joueurs supplementaires non affiches. Affine ta recherche.</p>
          )}
        </div>
      </div>

      {/* Participants saison */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Participants — Saison {saisonNumero}</h2>
        <div className={styles.grid2}>
          <div className={styles.card}>
            <div className={styles.label}>Dans le marathon ({inMarathon.length})</div>
            {inMarathon.map(u => (
              <div key={u.id} style={{ fontSize: 'var(--fs-1)', padding: 'var(--sp-1) 0' }}>{u.pseudo}</div>
            ))}
          </div>
          <div className={styles.card}>
            <div className={styles.label}>Hors marathon ({outMarathon.length})</div>
            {outMarathon.slice(0, 30).map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--fs-1)', padding: 'var(--sp-1) 0' }}>
                <span>{u.pseudo}</span>
                <button className={styles.btn} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleAdmit(u.id)}>Admettre</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats pre-marathon */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Statistiques pre-marathon</h2>
        {!preStats ? (
          <button className={styles.btn} disabled={preStatsLoading} onClick={loadPreStats}>
            {preStatsLoading ? 'Chargement...' : 'Charger les statistiques'}
          </button>
        ) : (
          <div className={styles.card}>
            <div className={styles.row}><span>Moyenne</span><span>{preStats.avg?.toFixed(1)} films</span></div>
            <div className={styles.row}><span>Total joueurs</span><span>{preStats.total}</span></div>
            <div className={styles.row}><span>Total visionnages</span><span>{preStats.totalWatches}</span></div>
            {preStats.most?.length > 0 && (
              <>
                <div className={styles.label} style={{ marginTop: 'var(--sp-3)' }}>Films les plus vus</div>
                {preStats.most.map((f: any, i: number) => (
                  <div key={i} style={{ fontSize: 'var(--fs-1)', padding: 'var(--sp-1) 0' }}>{f.titre} — {f.count} vus</div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
