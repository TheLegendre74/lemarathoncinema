'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApproveDuel, adminDeleteDuel } from '@/lib/actions'

export default function PendingDuelCard({ duel }: { duel: { id: number; film1: { titre: string }; film2: { titre: string } } }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleApprove() {
    setBusy(true)
    const res = await adminApproveDuel(duel.id)
    setBusy(false)
    if (res.error) alert(res.error)
    else { setDone(true); router.refresh() }
  }

  async function handleReject() {
    if (!confirm(`Refuser et supprimer le duel "${duel.film1.titre} VS ${duel.film2.titre}" ?`)) return
    setBusy(true)
    const res = await adminDeleteDuel(duel.id)
    setBusy(false)
    if (res.error) alert(res.error)
    else { setDone(true); router.refresh() }
  }

  if (done) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', background: 'rgba(232,196,106,.06)', border: '1px solid rgba(232,196,106,.3)', borderRadius: 'var(--r, 8px)', padding: '.7rem 1rem', flexWrap: 'wrap' }}>
      <span style={{ flex: 1, fontSize: '.85rem' }}>
        <strong>{duel.film1.titre}</strong> VS <strong>{duel.film2.titre}</strong>
        <span style={{ marginLeft: '.5rem', fontSize: '.68rem', color: 'var(--gold, #e8c46a)', background: 'rgba(232,196,106,.12)', padding: '.15rem .5rem', borderRadius: 99 }}>En attente</span>
      </span>
      <button
        disabled={busy}
        onClick={handleApprove}
        style={{ fontSize: '.78rem', padding: '.35rem .8rem', background: 'rgba(79,217,138,.15)', border: '1px solid rgba(79,217,138,.4)', borderRadius: 6, color: 'var(--ok, #4fd98a)', cursor: busy ? 'wait' : 'pointer', fontWeight: 600 }}
      >
        {busy ? '...' : '✓ Confirmer'}
      </button>
      <button
        disabled={busy}
        onClick={handleReject}
        style={{ fontSize: '.78rem', padding: '.35rem .8rem', background: 'rgba(231,76,60,.1)', border: '1px solid rgba(231,76,60,.35)', borderRadius: 6, color: '#e74c3c', cursor: busy ? 'wait' : 'pointer', fontWeight: 600 }}
      >
        {busy ? '...' : '✗ Refuser'}
      </button>
    </div>
  )
}
