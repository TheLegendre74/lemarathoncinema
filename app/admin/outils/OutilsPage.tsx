'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import { adminDiagnostic, adminEndSeason, adminSetConfig } from '@/lib/actions'
import styles from '../admin.module.css'

interface Props {
  recentLog: any[]
  hasRedis: boolean
  hasTmdb: boolean
  hasOmdb: boolean
  commitSha: string | null
  saisonNumero: number
}

export default function OutilsPage({ recentLog, hasRedis, hasTmdb, hasOmdb, commitSha, saisonNumero }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [diagResult, setDiagResult] = useState<any>(null)
  const [diagLoading, setDiagLoading] = useState(false)
  const [endConfirm, setEndConfirm] = useState('')

  async function handleDiag() {
    setDiagLoading(true)
    const r = await adminDiagnostic()
    setDiagResult(r)
    setDiagLoading(false)
  }

  async function handleClearCaches() {
    setBusy(true)
    try {
      await adminSetConfig({ _cache_bust: Date.now().toString() })
      addToast('Caches vides — en ligne.')
      router.refresh()
    } catch { addToast('Erreur lors du vidage.') }
    setBusy(false)
  }

  async function handleEndSeason() {
    const expected = `CLOTURER LA SAISON ${saisonNumero}`
    if (endConfirm !== expected) { addToast(`Tape "${expected}" pour confirmer.`); return }
    setBusy(true)
    const r = await adminEndSeason(saisonNumero)
    if (r?.error) addToast(r.error)
    else { addToast('Saison cloturee.'); setEndConfirm(''); router.refresh() }
    setBusy(false)
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Outils</h1>

      {/* État */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Etat</h2>
        <div className={styles.card}>
          <div className={styles.row}>
            <span>Cache Redis</span>
            <span style={{ color: hasRedis ? 'var(--ok)' : 'var(--bad)' }}>{hasRedis ? 'Actif' : 'Absent'}</span>
          </div>
          <div className={styles.row}>
            <span>Cle TMDB</span>
            <span style={{ color: hasTmdb ? 'var(--ok)' : 'var(--bad)' }}>{hasTmdb ? 'Presente' : 'Absente'}</span>
          </div>
          <div className={styles.row}>
            <span>Cle OMDB</span>
            <span style={{ color: hasOmdb ? 'var(--ok)' : 'var(--bad)' }}>{hasOmdb ? 'Presente' : 'Absente'}</span>
          </div>
          {commitSha && (
            <div className={styles.row}>
              <span>Version deployee</span>
              <span style={{ fontFamily: 'var(--f-data)', fontSize: 'var(--fs-1)' }}>{commitSha.slice(0, 8)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostic */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Diagnostic</h2>
        <button className={styles.btn} disabled={diagLoading} onClick={handleDiag}>
          {diagLoading ? 'Analyse...' : 'Lancer le diagnostic'}
        </button>
        {diagResult && (
          <div className={styles.card} style={{ marginTop: 'var(--sp-4)' }}>
            <pre style={{ fontSize: 'var(--fs-0)', whiteSpace: 'pre-wrap', color: 'var(--ink2)' }}>
              {JSON.stringify(diagResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Vider les caches */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Vider les caches</h2>
        <button className={styles.btn} disabled={busy} onClick={handleClearCaches}>
          Vider tous les caches
        </button>
        <p style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)', marginTop: 'var(--sp-2)' }}>
          Vide les tags site-config, season-weeks et les cles Redis connues.
        </p>
      </div>

      {/* Journal */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Journal ({recentLog.length} dernieres lignes)</h2>
        {recentLog.length === 0 ? (
          <p className={styles.empty}>Aucune entree.</p>
        ) : (
          <div className={styles.card}>
            {recentLog.map((entry: any) => (
              <div key={entry.id} className={styles.row} style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                <span style={{ flex: 1, minWidth: 200, fontSize: 'var(--fs-1)' }}>
                  {entry.action}
                  {entry.detail && (
                    <span style={{ color: 'var(--ink3)' }}>
                      {' '}— {typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail).slice(0, 80)}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)', flexShrink: 0 }}>
                  {new Date(entry.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zone dangereuse */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle} style={{ color: 'var(--bad)' }}>Zone dangereuse</h2>
        <div className={styles.card} style={{ borderColor: 'var(--bad)' }}>
          <div className={styles.label} style={{ color: 'var(--bad)' }}>Cloturer la saison {saisonNumero}</div>
          <p style={{ fontSize: 'var(--fs-1)', color: 'var(--ink2)', marginBottom: 'var(--sp-3)' }}>
            Remet les compteurs a zero et passe a la saison suivante. Irreversible.
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
            <input
              className={styles.input}
              style={{ width: 300 }}
              placeholder={`Tape "CLOTURER LA SAISON ${saisonNumero}"`}
              value={endConfirm}
              onChange={e => setEndConfirm(e.target.value)}
            />
            <button className={styles.btnDanger} disabled={busy || endConfirm !== `CLOTURER LA SAISON ${saisonNumero}`} onClick={handleEndSeason}>
              Cloturer
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
