'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import {
  adminSetConfig, adminAddNews, adminDeleteNews,
  adminAddRecommendation, adminDeleteRecommendation,
  deleteForumTopic,
} from '@/lib/actions'
import type { ServerConfig } from '@/lib/serverConfig'
import styles from '../admin.module.css'

interface Props {
  news: any[]
  recommendations: any[]
  forumTopics: any[]
  siteConfig: Record<string, string>
  serverConfig: ServerConfig
}

export default function ContenuPage({ news, recommendations, forumTopics, siteConfig, serverConfig }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState(false)

  const [accroche, setAccroche] = useState(siteConfig.accueil_accroche ?? '')
  const [sousTitre, setSousTitre] = useState(siteConfig.accueil_sous_titre ?? serverConfig.ACCUEIL_SOUS_TITRE)
  const [accueilDirty, setAccueilDirty] = useState(false)

  const [newsTitle, setNewsTitle] = useState('')
  const [newsContent, setNewsContent] = useState('')
  const [newsPinned, setNewsPinned] = useState(false)

  const [recoNiveau, setRecoNiveau] = useState<'debutant' | 'intermediaire' | 'confirme'>('debutant')
  const [recoTitre, setRecoTitre] = useState('')
  const [recoAnnee, setRecoAnnee] = useState('')
  const [recoReal, setRecoReal] = useState('')
  const [recoDesc, setRecoDesc] = useState('')

  async function handleSaveAccueil() {
    setBusy(true)
    const updates: Record<string, string> = {}
    if (accroche !== (siteConfig.accueil_accroche ?? '')) updates.accueil_accroche = accroche
    if (sousTitre !== (siteConfig.accueil_sous_titre ?? serverConfig.ACCUEIL_SOUS_TITRE)) updates.accueil_sous_titre = sousTitre
    if (Object.keys(updates).length === 0) { addToast('Rien a enregistrer.'); setBusy(false); return }
    const r = await adminSetConfig(updates)
    if (r.error) addToast(r.error)
    else { addToast('Accueil enregistre — en ligne.'); setAccueilDirty(false); router.refresh() }
    setBusy(false)
  }

  async function handleAddNews() {
    if (!newsTitle.trim()) { addToast('Titre requis.'); return }
    setBusy(true)
    const r = await adminAddNews(newsTitle.trim(), newsContent.trim(), newsPinned)
    if (r?.error) addToast(r.error)
    else { addToast('Annonce creee.'); setNewsTitle(''); setNewsContent(''); setNewsPinned(false); router.refresh() }
    setBusy(false)
  }

  async function handleDeleteNews(id: string) {
    if (!confirm('Supprimer cette annonce ?')) return
    setBusy(true)
    const r = await adminDeleteNews(id)
    if (r?.error) addToast(r.error)
    else { addToast('Annonce supprimee.'); router.refresh() }
    setBusy(false)
  }

  async function handleAddReco() {
    if (!recoTitre.trim()) { addToast('Titre requis.'); return }
    setBusy(true)
    const r = await adminAddRecommendation(recoNiveau, recoTitre.trim(), parseInt(recoAnnee) || 0, recoReal.trim(), recoDesc.trim(), 0)
    if (r?.error) addToast(r.error)
    else { addToast('Rattrapage ajoute.'); setRecoTitre(''); setRecoAnnee(''); setRecoReal(''); setRecoDesc(''); router.refresh() }
    setBusy(false)
  }

  async function handleDeleteReco(id: string) {
    if (!confirm('Supprimer ce rattrapage ?')) return
    setBusy(true)
    const r = await adminDeleteRecommendation(id)
    if (r?.error) addToast(r.error)
    else { addToast('Rattrapage supprime.'); router.refresh() }
    setBusy(false)
  }

  async function handleDeleteTopic(id: string, title: string) {
    if (!confirm(`Supprimer le sujet "${title}" ?`)) return
    setBusy(true)
    await deleteForumTopic(id)
    addToast('Sujet supprime.')
    router.refresh()
    setBusy(false)
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Contenu</h1>

      {/* Accueil */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Accueil</h2>
        <div className={styles.card}>
          <div>
            <div className={styles.label}>Sous-titre du site</div>
            <input className={styles.input} value={sousTitre} onChange={e => { setSousTitre(e.target.value); setAccueilDirty(true) }} />
          </div>
          {accueilDirty && (
            <button className={styles.btnPrimary} style={{ marginTop: 'var(--sp-3)' }} disabled={busy} onClick={handleSaveAccueil}>
              Enregistrer
            </button>
          )}
        </div>
      </div>

      {/* Annonces */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Annonces</h2>

        <div className={styles.card}>
          <div className={styles.label}>Nouvelle annonce</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <input className={styles.input} placeholder="Titre" value={newsTitle} onChange={e => setNewsTitle(e.target.value)} />
            <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} placeholder="Contenu" value={newsContent} onChange={e => setNewsContent(e.target.value)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--fs-1)' }}>
              <input type="checkbox" checked={newsPinned} onChange={e => setNewsPinned(e.target.checked)} /> Epingler
            </label>
            <button className={styles.btnPrimary} disabled={busy || !newsTitle.trim()} onClick={handleAddNews}>Publier</button>
          </div>
        </div>

        {news.length > 0 && (
          <div className={styles.card}>
            {news.map((n: any) => (
              <div key={n.id} className={styles.row} style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong>{n.title}</strong>
                  {n.pinned && <span style={{ color: 'var(--accent-fg)', marginLeft: 'var(--sp-2)', fontSize: 'var(--fs-0)' }}>epingle</span>}
                  <div style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)' }}>
                    {new Date(n.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleDeleteNews(n.id)}>Supprimer</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rattrapages */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Rattrapage cinema</h2>

        <div className={styles.card}>
          <div className={styles.label}>Ajouter un rattrapage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <select className={styles.input} value={recoNiveau} onChange={e => setRecoNiveau(e.target.value as any)}>
              <option value="debutant">Debutant</option>
              <option value="intermediaire">Intermediaire</option>
              <option value="confirme">Confirme</option>
            </select>
            <input className={styles.input} placeholder="Titre" value={recoTitre} onChange={e => setRecoTitre(e.target.value)} />
            <div className={styles.grid2}>
              <input className={styles.input} placeholder="Annee" type="number" value={recoAnnee} onChange={e => setRecoAnnee(e.target.value)} />
              <input className={styles.input} placeholder="Realisateur" value={recoReal} onChange={e => setRecoReal(e.target.value)} />
            </div>
            <textarea className={styles.input} style={{ minHeight: 60, resize: 'vertical' }} placeholder="Description" value={recoDesc} onChange={e => setRecoDesc(e.target.value)} />
            <button className={styles.btnPrimary} disabled={busy || !recoTitre.trim()} onClick={handleAddReco}>Ajouter</button>
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className={styles.card}>
            {recommendations.map((r: any) => (
              <div key={r.id} className={styles.row}>
                <div style={{ flex: 1 }}>
                  <strong>{r.titre}</strong> ({r.annee}) — {r.realisateur}
                  <span style={{ color: 'var(--ink3)', marginLeft: 'var(--sp-2)', fontSize: 'var(--fs-0)' }}>{r.niveau}</span>
                </div>
                <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleDeleteReco(r.id)}>Supprimer</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Forum */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Forum — sujets</h2>
        {forumTopics.length === 0 ? (
          <p className={styles.empty}>Aucun sujet.</p>
        ) : (
          <div className={styles.card}>
            {forumTopics.map((t: any) => (
              <div key={t.id} className={styles.row} style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong>{t.title}</strong>
                  <span style={{ color: 'var(--ink3)', marginLeft: 'var(--sp-2)', fontSize: 'var(--fs-0)' }}>{t.type}</span>
                  <span style={{ color: 'var(--ink3)', marginLeft: 'var(--sp-2)', fontSize: 'var(--fs-0)' }}>
                    {(t.posts as any)?.[0]?.count ?? 0} messages
                  </span>
                </div>
                {t.type !== 'social' && (
                  <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} disabled={busy} onClick={() => handleDeleteTopic(t.id, t.title)}>Supprimer</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
