'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import {
  adminApproveFilmRequest, adminRejectFilmRequest,
  adminSet18Flag, adminSetFilmCategory, adminApproveAllPending,
  adminResolveReport, adminDeleteFilm,
  adminFetchFilmPoster, adminRefreshMissingPosters,
  adminVerifyPosters, adminRepairBrokenPosters,
  adminFetchFrenchPosters, adminFetchOverviews,
  adminScanAgeRestrictions, adminTestFilmCertification,
  adminSearchFilms, updateFilm,
} from '@/lib/actions'
import styles from '../admin.module.css'

interface Props {
  pendingApproval: any[]
  flagged18: any[]
  reports: any[]
  totalFilms: number
  saisonNumero: number
}

export default function FilmsPage({ pendingApproval, flagged18, reports, totalFilms, saisonNumero }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const [editFilm, setEditFilm] = useState<any>(null)
  const [editTitre, setEditTitre] = useState('')
  const [editAnnee, setEditAnnee] = useState('')
  const [editReal, setEditReal] = useState('')
  const [editSaison, setEditSaison] = useState('')

  const [testFilmId, setTestFilmId] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)

  const [toolRunning, setToolRunning] = useState<string | null>(null)
  const [brokenPosters, setBrokenPosters] = useState<any[]>([])

  async function search(q: string) {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    const { films } = await adminSearchFilms(q)
    setSearchResults(films)
    setSearching(false)
  }

  async function handleApproveFilm(filmId: number) {
    setBusy(true)
    const r = await adminApproveFilmRequest(filmId)
    if (r?.error) addToast(r.error); else { addToast('Film approuve.'); router.refresh() }
    setBusy(false)
  }

  async function handleRejectFilm(filmId: number) {
    setBusy(true)
    const r = await adminRejectFilmRequest(filmId)
    if (r?.error) addToast(r.error); else { addToast('Film refuse.'); router.refresh() }
    setBusy(false)
  }

  async function handleSet18(filmId: number, is18: boolean) {
    setBusy(true)
    const r = await adminSet18Flag(filmId, is18)
    if ('error' in r) addToast(r.error!); else { addToast(is18 ? 'Confirme 18+.' : 'Repasse Normal.'); router.refresh() }
    setBusy(false)
  }

  async function handleSetCategory(filmId: number, cat: 'normal' | '18plus' | 'strange') {
    setBusy(true)
    const r = await adminSetFilmCategory(filmId, cat)
    if (r?.error) addToast(r.error); else { addToast('Categorie mise a jour.'); router.refresh() }
    setBusy(false)
  }

  async function handleApproveAll() {
    if (!confirm(`Confirmer les ${flagged18.length} films comme 18+ ?`)) return
    setBusy(true)
    const r = await adminApproveAllPending()
    if ('error' in r) addToast(r.error!); else { addToast(`${r.count} films confirmes.`); router.refresh() }
    setBusy(false)
  }

  async function handleResolveReport(id: string) {
    setBusy(true)
    const r = await adminResolveReport(id)
    if (r.error) addToast(r.error); else { addToast('Signalement resolu.'); router.refresh() }
    setBusy(false)
  }

  async function handleDeleteFilm(filmId: number, titre: string) {
    if (!confirm(`Retirer "${titre}" du catalogue ?`)) return
    setBusy(true)
    await adminDeleteFilm(filmId)
    addToast(`"${titre}" retire.`)
    router.refresh()
    setBusy(false)
  }

  async function handleFetchPoster(filmId: number) {
    setBusy(true)
    const r = await adminFetchFilmPoster(filmId)
    if (r.error) addToast(r.error); else { addToast('Affiche recuperee.'); router.refresh() }
    setBusy(false)
  }

  function startEdit(film: any) {
    setEditFilm(film)
    setEditTitre(film.titre)
    setEditAnnee(String(film.annee))
    setEditReal(film.realisateur)
    setEditSaison(String(film.saison ?? saisonNumero))
  }

  async function handleSaveEdit() {
    if (!editFilm) return
    setBusy(true)
    const r = await updateFilm(editFilm.id, {
      titre: editTitre.trim(),
      annee: parseInt(editAnnee),
      realisateur: editReal.trim(),
      saison: parseInt(editSaison),
    })
    if (r?.error) addToast(r.error)
    else { addToast('Film modifie.'); setEditFilm(null); router.refresh() }
    setBusy(false)
  }

  async function runTool(name: string, fn: () => Promise<void>) {
    setToolRunning(name)
    try { await fn() } catch (e: any) { addToast(e.message ?? 'Erreur') }
    setToolRunning(null)
  }

  async function handleTestCert() {
    const id = parseInt(testFilmId)
    if (isNaN(id)) { addToast('ID invalide.'); return }
    setTestLoading(true)
    const r = await adminTestFilmCertification(id)
    setTestResult(r)
    setTestLoading(false)
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Films ({totalFilms})</h1>

      {/* File d'attente */}
      {(pendingApproval.length > 0 || flagged18.length > 0 || reports.length > 0) && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>File d'attente</h2>

          {pendingApproval.map((f: any) => (
            <div key={f.id} className={styles.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <span><strong>{f.titre}</strong> ({f.annee}) — {f.realisateur}</span>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button className={styles.btnPrimary} style={{ fontSize: 'var(--fs-1)' }} disabled={busy} onClick={() => handleApproveFilm(f.id)}>Approuver</button>
                <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-1)' }} disabled={busy} onClick={() => handleRejectFilm(f.id)}>Refuser</button>
              </div>
            </div>
          ))}

          {flagged18.length > 0 && (
            <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
                <div className={styles.label}>Films 18+ a confirmer ({flagged18.length})</div>
                <button className={styles.btnPrimary} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={handleApproveAll}>Tout confirmer</button>
              </div>
              {flagged18.map((f: any) => (
                <div key={f.id} className={styles.row} style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                  <span style={{ flex: 1, minWidth: 180 }}>{f.titre} ({f.annee})</span>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className={styles.btn} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleSetCategory(f.id, 'normal')}>Normal</button>
                    <button className={styles.btn} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleSetCategory(f.id, '18plus')}>18+</button>
                    <button className={styles.btn} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleSetCategory(f.id, 'strange')}>18+ Etrange</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {reports.map((r: any) => (
            <div key={r.id} className={styles.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <div>
                <strong>{(r.films as any)?.titre ?? 'Film inconnu'}</strong>
                <span style={{ color: 'var(--ink3)', marginLeft: 'var(--sp-2)', fontSize: 'var(--fs-1)' }}>{r.reason}</span>
              </div>
              <button className={styles.btnPrimary} style={{ fontSize: 'var(--fs-1)' }} disabled={busy} onClick={() => handleResolveReport(r.id)}>Resolu</button>
            </div>
          ))}
        </div>
      )}

      {/* Catalogue */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Catalogue</h2>
        <input
          className={styles.input}
          style={{ marginBottom: 'var(--sp-4)' }}
          placeholder="Rechercher un film..."
          value={searchQuery}
          onChange={e => search(e.target.value)}
        />
        {searching && <p style={{ fontSize: 'var(--fs-1)', color: 'var(--ink3)' }}>Recherche...</p>}

        {searchResults.map(f => (
          <div key={f.id} className={styles.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            <span><strong>{f.titre}</strong> ({f.annee}) — {f.realisateur}</span>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <button className={styles.btn} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleFetchPoster(f.id)}>Affiche TMDB</button>
              <button className={styles.btn} style={{ fontSize: 'var(--fs-0)' }} onClick={() => startEdit(f)}>Modifier</button>
              <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleDeleteFilm(f.id, f.titre)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>

      {/* Edition modale */}
      {editFilm && (
        <div className={styles.card} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(460px, 90vw)', zIndex: 1000, background: 'var(--s1)' }}>
          <h3 className={styles.sectionTitle}>Modifier — {editFilm.titre}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div><div className={styles.label}>Titre</div><input className={styles.input} value={editTitre} onChange={e => setEditTitre(e.target.value)} /></div>
            <div className={styles.grid2}>
              <div><div className={styles.label}>Annee</div><input className={styles.input} type="number" value={editAnnee} onChange={e => setEditAnnee(e.target.value)} /></div>
              <div><div className={styles.label}>Saison</div><input className={styles.input} type="number" value={editSaison} onChange={e => setEditSaison(e.target.value)} /></div>
            </div>
            <div><div className={styles.label}>Realisateur</div><input className={styles.input} value={editReal} onChange={e => setEditReal(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <button className={styles.btn} onClick={() => setEditFilm(null)}>Annuler</button>
              <button className={styles.btnPrimary} disabled={busy} onClick={handleSaveEdit}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Outils du catalogue */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Outils du catalogue</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          <button className={styles.btn} disabled={!!toolRunning} onClick={() => runTool('missing', async () => {
            const r = await adminRefreshMissingPosters()
            if (r.error) addToast(r.error)
            else addToast(r.count === 0 ? 'Aucune affiche manquante.' : `${r.count} affiche(s) recuperee(s).`)
            router.refresh()
          })}>
            {toolRunning === 'missing' ? '...' : 'Affiches manquantes'}
          </button>

          <button className={styles.btn} disabled={!!toolRunning} onClick={() => runTool('verify', async () => {
            const r = await adminVerifyPosters(0)
            if (r.error) { addToast(r.error); return }
            const broken = r.broken ?? []
            setBrokenPosters(broken)
            addToast(`${broken.length} affiche(s) cassee(s) trouvee(s).`)
          })}>
            {toolRunning === 'verify' ? '...' : 'Verifier les liens'}
          </button>

          {brokenPosters.length > 0 && (
            <button className={styles.btnPrimary} disabled={!!toolRunning} onClick={() => runTool('repair', async () => {
              const ids = brokenPosters.map(b => b.id)
              const r = await adminRepairBrokenPosters(ids)
              if (r.error) addToast(r.error)
              else { addToast(`${r.count} affiche(s) reparee(s).`); setBrokenPosters([]); router.refresh() }
            })}>
              {toolRunning === 'repair' ? '...' : `Reparer (${brokenPosters.length})`}
            </button>
          )}

          <button className={styles.btn} disabled={!!toolRunning} onClick={() => runTool('french', async () => {
            let nextId: number | null = 0; let total = 0
            while (nextId !== null) {
              const r = await adminFetchFrenchPosters(nextId)
              if (r.error) { addToast(r.error); break }
              total += r.count ?? 0
              nextId = r.nextId ?? null
            }
            addToast(`${total} affiche(s) francaise(s) mises a jour.`)
            router.refresh()
          })}>
            {toolRunning === 'french' ? '...' : 'Affiches francaises'}
          </button>

          <button className={styles.btn} disabled={!!toolRunning} onClick={() => runTool('overview', async () => {
            const r = await adminFetchOverviews()
            if (r.error) addToast(r.error)
            else addToast(`${r.count} synopsis recupere(s).`)
          })}>
            {toolRunning === 'overview' ? '...' : 'Synopsis TMDB'}
          </button>

          <button className={styles.btn} disabled={!!toolRunning} onClick={() => runTool('scan18', async () => {
            let nextId: number | null = 0; let total = 0
            while (nextId !== null) {
              const r = await adminScanAgeRestrictions(nextId)
              if (r.error) { addToast(r.error); break }
              total += r.count ?? 0
              nextId = r.nextId ?? null
            }
            addToast(`${total} film(s) scanne(s).`)
            router.refresh()
          })}>
            {toolRunning === 'scan18' ? '...' : 'Scan 18+ TMDB'}
          </button>
        </div>

        <div className={styles.card} style={{ marginTop: 'var(--sp-4)' }}>
          <div className={styles.label}>Tester la certification d'un film</div>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
            <input className={styles.input} style={{ width: 120 }} placeholder="ID du film" value={testFilmId} onChange={e => setTestFilmId(e.target.value)} />
            <button className={styles.btn} disabled={testLoading} onClick={handleTestCert}>{testLoading ? '...' : 'Tester'}</button>
          </div>
          {testResult && (
            <pre style={{ fontSize: 'var(--fs-0)', marginTop: 'var(--sp-2)', whiteSpace: 'pre-wrap', color: 'var(--ink2)' }}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </>
  )
}
