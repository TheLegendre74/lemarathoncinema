'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import {
  adminSetWeekFilm, adminClearWeekFilm, adminDeleteWeekFilmArchive,
  adminCreateDuelFromFilms, adminCloseDuel, adminApproveDuel, adminDeleteDuel, adminCleanDuels,
  adminSetSitePrive, adminSearchFilms,
} from '@/lib/actions'
import styles from '../admin.module.css'

interface Props {
  weekFilm: any
  weekFilmArchives: any[]
  duels: any[]
  activeDuel: any
  fdlsJour: string
  fdlsHeure: string
  seanceJour: string
  seanceHeure: string
  saisonNumero: number
  seuilMajority: number
  liveUrl: string
  liveLabel: string
}

export default function SeancesPage({
  weekFilm, weekFilmArchives, duels, activeDuel,
  fdlsJour, fdlsHeure, seanceJour, seanceHeure,
  saisonNumero, seuilMajority, liveUrl, liveLabel,
}: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState(false)

  const [filmQuery, setFilmQuery] = useState('')
  const [filmResults, setFilmResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const [duelQuery1, setDuelQuery1] = useState('')
  const [duelQuery2, setDuelQuery2] = useState('')
  const [duelResults1, setDuelResults1] = useState<any[]>([])
  const [duelResults2, setDuelResults2] = useState<any[]>([])
  const [duelFilm1, setDuelFilm1] = useState<any>(null)
  const [duelFilm2, setDuelFilm2] = useState<any>(null)
  const [duelSearching1, setDuelSearching1] = useState(false)
  const [duelSearching2, setDuelSearching2] = useState(false)

  const [localLiveUrl, setLocalLiveUrl] = useState(liveUrl)
  const [localLiveLabel, setLocalLiveLabel] = useState(liveLabel || 'Rejoindre la seance')
  const [liveDirty, setLiveDirty] = useState(false)

  const [cleanConfirm, setCleanConfirm] = useState('')

  async function searchFilms(query: string) {
    if (query.length < 2) { setFilmResults([]); return }
    setSearching(true)
    const { films } = await adminSearchFilms(query)
    setFilmResults(films)
    setSearching(false)
  }

  async function searchDuel(idx: 1 | 2, query: string) {
    if (query.length < 2) { idx === 1 ? setDuelResults1([]) : setDuelResults2([]); return }
    idx === 1 ? setDuelSearching1(true) : setDuelSearching2(true)
    const { films } = await adminSearchFilms(query)
    idx === 1 ? setDuelResults1(films) : setDuelResults2(films)
    idx === 1 ? setDuelSearching1(false) : setDuelSearching2(false)
  }

  async function handleSetWeekFilm(filmId: number, titre: string) {
    if (busy) return
    setBusy(true)
    const sessionTime = `${fdlsJour} soir a ${fdlsHeure}`
    const result = await adminSetWeekFilm(filmId, sessionTime)
    if (result.error) addToast(result.error)
    else { addToast(`Film de la semaine : ${titre}. Enregistre — en ligne.`); setFilmQuery(''); setFilmResults([]); router.refresh() }
    setBusy(false)
  }

  async function handleClearWeekFilm() {
    if (busy) return
    if (!confirm('Retirer le film de la semaine ?')) return
    setBusy(true)
    const result = await adminClearWeekFilm()
    if (result.error) addToast(result.error)
    else { addToast('Film de la semaine retire.'); router.refresh() }
    setBusy(false)
  }

  async function handleDeleteArchive(id: number) {
    if (busy) return
    if (!confirm('Supprimer cette archive ?')) return
    setBusy(true)
    const result = await adminDeleteWeekFilmArchive(id)
    if (result.error) addToast(result.error)
    else { addToast('Archive supprimee.'); router.refresh() }
    setBusy(false)
  }

  async function handleApproveDuel(id: number) {
    if (busy) return
    setBusy(true)
    const result = await adminApproveDuel(id)
    if (result.error) addToast(result.error)
    else { addToast('Duel approuve et publie.'); router.refresh() }
    setBusy(false)
  }

  async function handleCloseDuel(id: number) {
    if (busy) return
    if (!confirm('Cloturer ce duel maintenant ?')) return
    setBusy(true)
    const result = await adminCloseDuel(id)
    if (result.error) addToast(result.error)
    else { addToast('Duel cloture.'); router.refresh() }
    setBusy(false)
  }

  async function handleDeleteDuel(id: number, label: string) {
    if (busy) return
    if (!confirm(`Supprimer le duel "${label}" ? Les votes et messages associes seront supprimes.`)) return
    setBusy(true)
    const result = await adminDeleteDuel(id)
    if (result.error) addToast(result.error)
    else { addToast('Duel supprime.'); router.refresh() }
    setBusy(false)
  }

  async function handleCreateManualDuel() {
    if (busy || !duelFilm1 || !duelFilm2) return
    if (duelFilm1.id === duelFilm2.id) { addToast('Choisis deux films differents.'); return }
    setBusy(true)
    const result = await adminCreateDuelFromFilms(duelFilm1.id, duelFilm2.id)
    if (result.error) addToast(result.error)
    else {
      addToast(`Duel cree : ${duelFilm1.titre} vs ${duelFilm2.titre}.`)
      setDuelFilm1(null); setDuelFilm2(null); setDuelQuery1(''); setDuelQuery2('')
      router.refresh()
    }
    setBusy(false)
  }

  async function handleCleanDuels() {
    if (busy) return
    if (cleanConfirm !== 'SUPPRIMER') { addToast('Tape SUPPRIMER pour confirmer.'); return }
    setBusy(true)
    const result = await adminCleanDuels()
    if (result.error) addToast(result.error)
    else { addToast('Tous les duels supprimes.'); setCleanConfirm(''); router.refresh() }
    setBusy(false)
  }

  async function handleSaveLive() {
    if (busy) return
    if (localLiveUrl && !localLiveUrl.startsWith('https://')) { addToast('Le lien du direct doit commencer par https://'); return }
    setBusy(true)
    const result = await adminSetSitePrive({ live_url: localLiveUrl, live_label: localLiveLabel })
    if (result.error) addToast(result.error)
    else { addToast('Lien du direct enregistre — en ligne.'); setLiveDirty(false); router.refresh() }
    setBusy(false)
  }

  function duelLabel(d: any) {
    return `${(d.film1 as any)?.titre ?? '?'} vs ${(d.film2 as any)?.titre ?? '?'}`
  }

  function duelState(d: any): string {
    if (d.pending) return 'En attente'
    if (d.closed) return d.winner_id ? 'Cloture' : 'Egalite'
    return 'En cours'
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Seances</h1>

      {/* Film de la semaine */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Film de la semaine</h2>

        {weekFilm ? (
          <div className={styles.card} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <div>
              <strong>{(weekFilm as any).films?.titre ?? 'Inconnu'}</strong>
              {weekFilm.session_time && <span style={{ color: 'var(--ink2)', marginLeft: 'var(--sp-3)' }}>{weekFilm.session_time}</span>}
            </div>
            <button className={styles.btnDanger} disabled={busy} onClick={handleClearWeekFilm}>Retirer</button>
          </div>
        ) : (
          <p className={styles.empty}>Aucun film de la semaine.</p>
        )}

        <div className={styles.card}>
          <div className={styles.label}>Choisir un film (recherche)</div>
          <input
            className={styles.input}
            placeholder="Rechercher par titre..."
            value={filmQuery}
            onChange={e => { setFilmQuery(e.target.value); searchFilms(e.target.value) }}
          />
          {searching && <p style={{ fontSize: 'var(--fs-1)', color: 'var(--ink3)', marginTop: 'var(--sp-2)' }}>Recherche...</p>}
          {filmResults.length > 0 && (
            <div style={{ marginTop: 'var(--sp-3)', maxHeight: 240, overflowY: 'auto' }}>
              {filmResults.map(f => (
                <div key={f.id} className={styles.row} style={{ cursor: 'pointer' }} onClick={() => handleSetWeekFilm(f.id, f.titre)}>
                  <span>{f.titre} ({f.annee}) — {f.realisateur}</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)', marginTop: 'var(--sp-2)' }}>
            Horaire prevu : {fdlsJour} soir a {fdlsHeure}
          </p>
        </div>

        {weekFilmArchives.length > 0 && (
          <div className={styles.card}>
            <div className={styles.label}>Archives recentes</div>
            {weekFilmArchives.map((a: any) => (
              <div key={a.id} className={styles.row}>
                <span>{a.films?.titre ?? '?'} — {new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleDeleteArchive(a.id)}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duels */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Duels</h2>

        {activeDuel && (
          <div className={styles.card}>
            <div className={styles.label}>Duel en cours</div>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-3)', marginBottom: 'var(--sp-3)' }}>
              {(activeDuel as any).film1?.titre} vs {(activeDuel as any).film2?.titre}
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', marginBottom: 'var(--sp-3)' }}>
              <span>Voix : {activeDuel.votes_film1 ?? 0} / {activeDuel.votes_film2 ?? 0}</span>
              {activeDuel.closes_at && (
                <span style={{ color: 'var(--ink2)' }}>
                  Echeance : {new Date(activeDuel.closes_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <button className={styles.btnPrimary} disabled={busy} onClick={() => handleCloseDuel(activeDuel.id)}>
              Cloturer maintenant
            </button>
          </div>
        )}

        {/* Nouveau duel manuel */}
        <div className={styles.card}>
          <div className={styles.label}>Nouveau duel manuel</div>
          <div className={styles.grid2}>
            <div>
              <input
                className={styles.input}
                placeholder="Film 1..."
                value={duelQuery1}
                onChange={e => { setDuelQuery1(e.target.value); searchDuel(1, e.target.value) }}
              />
              {duelFilm1 && <p style={{ fontSize: 'var(--fs-1)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>{duelFilm1.titre}</p>}
              {duelResults1.length > 0 && !duelFilm1 && (
                <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 'var(--sp-2)' }}>
                  {duelResults1.map(f => (
                    <div key={f.id} className={styles.row} style={{ cursor: 'pointer', fontSize: 'var(--fs-1)' }}
                      onClick={() => { setDuelFilm1(f); setDuelQuery1(f.titre); setDuelResults1([]) }}>
                      {f.titre} ({f.annee})
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <input
                className={styles.input}
                placeholder="Film 2..."
                value={duelQuery2}
                onChange={e => { setDuelQuery2(e.target.value); searchDuel(2, e.target.value) }}
              />
              {duelFilm2 && <p style={{ fontSize: 'var(--fs-1)', fontWeight: 600, marginTop: 'var(--sp-2)' }}>{duelFilm2.titre}</p>}
              {duelResults2.length > 0 && !duelFilm2 && (
                <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 'var(--sp-2)' }}>
                  {duelResults2.map(f => (
                    <div key={f.id} className={styles.row} style={{ cursor: 'pointer', fontSize: 'var(--fs-1)' }}
                      onClick={() => { setDuelFilm2(f); setDuelQuery2(f.titre); setDuelResults2([]) }}>
                      {f.titre} ({f.annee})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button className={styles.btnPrimary} style={{ marginTop: 'var(--sp-4)' }} disabled={busy || !duelFilm1 || !duelFilm2} onClick={handleCreateManualDuel}>
            Creer le duel
          </button>
        </div>

        {/* Liste des duels */}
        {duels.length > 0 && (
          <div className={styles.card}>
            <div className={styles.label}>Derniers duels</div>
            {duels.map((d: any) => (
              <div key={d.id} className={styles.row} style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                <span style={{ flex: 1, minWidth: 200 }}>{duelLabel(d)}</span>
                <span style={{ fontSize: 'var(--fs-1)', color: 'var(--ink3)' }}>{duelState(d)}</span>
                <span style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)' }}>{d.votes_film1 ?? 0}-{d.votes_film2 ?? 0}</span>
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  {d.pending && <button className={styles.btnPrimary} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleApproveDuel(d.id)}>Approuver</button>}
                  {!d.closed && !d.pending && <button className={styles.btn} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleCloseDuel(d.id)}>Cloturer</button>}
                  <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleDeleteDuel(d.id, duelLabel(d))}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Zone dangereuse */}
        <div className={styles.card} style={{ borderColor: 'var(--bad)' }}>
          <div className={styles.label} style={{ color: 'var(--bad)' }}>Zone dangereuse</div>
          <p style={{ fontSize: 'var(--fs-1)', color: 'var(--ink2)', marginBottom: 'var(--sp-3)' }}>
            Supprime tous les duels, votes et messages associes. Irreversible.
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
            <input
              className={styles.input}
              style={{ width: 200 }}
              placeholder="Tape SUPPRIMER"
              value={cleanConfirm}
              onChange={e => setCleanConfirm(e.target.value)}
            />
            <button className={styles.btnDanger} disabled={busy || cleanConfirm !== 'SUPPRIMER'} onClick={handleCleanDuels}>
              Supprimer tous les duels
            </button>
          </div>
        </div>
      </div>

      {/* Lien du direct */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lien du direct</h2>
        <div className={styles.card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div>
              <div className={styles.label}>URL (https uniquement)</div>
              <input
                className={styles.input}
                placeholder="https://..."
                value={localLiveUrl}
                onChange={e => { setLocalLiveUrl(e.target.value); setLiveDirty(true) }}
              />
            </div>
            <div>
              <div className={styles.label}>Libelle du bouton</div>
              <input
                className={styles.input}
                value={localLiveLabel}
                onChange={e => { setLocalLiveLabel(e.target.value); setLiveDirty(true) }}
              />
            </div>
            {liveDirty && (
              <button className={styles.btnPrimary} disabled={busy} onClick={handleSaveLive}>
                Enregistrer
              </button>
            )}
          </div>
          <p style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)', marginTop: 'var(--sp-3)' }}>
            Visible 30 min avant et 3 h apres chaque seance ({seanceJour} a {seanceHeure}, {fdlsJour} a {fdlsHeure}).
            Le lien n'est envoye qu'aux joueurs connectes.
          </p>
        </div>
      </div>
    </>
  )
}
