'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import { adminSetConfig } from '@/lib/actions'
import type { ServerConfig } from '@/lib/serverConfig'
import styles from '../admin.module.css'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

interface Props {
  siteConfig: Record<string, string>
  serverConfig: ServerConfig
}

export default function ReglagesPage({ siteConfig, serverConfig }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState(false)

  const [vals, setVals] = useState<Record<string, string>>({
    saison_numero: siteConfig.saison_numero ?? String(serverConfig.SAISON_NUMERO),
    saison_label: siteConfig.saison_label ?? serverConfig.SAISON_LABEL,
    marathon_start: siteConfig.marathon_start ?? serverConfig.MARATHON_START.toISOString().slice(0, 16),
    seance_jour: siteConfig.seance_jour ?? serverConfig.SEANCE_JOUR,
    seance_heure: siteConfig.seance_heure ?? serverConfig.SEANCE_HEURE,
    fdls_jour: siteConfig.fdls_jour ?? serverConfig.FDLS_JOUR,
    fdls_heure: siteConfig.fdls_heure ?? serverConfig.FDLS_HEURE,
    exp_film: siteConfig.exp_film ?? String(serverConfig.EXP_FILM),
    exp_fdls: siteConfig.exp_fdls ?? String(serverConfig.EXP_FDLS),
    exp_duel_win: siteConfig.exp_duel_win ?? String(serverConfig.EXP_DUEL_WIN),
    exp_vote: siteConfig.exp_vote ?? String(serverConfig.EXP_VOTE),
    exp_fdls_bonus: siteConfig.exp_fdls_bonus ?? String(serverConfig.EXP_FDLS_BONUS ?? 0),
    seuil_majority: siteConfig.seuil_majority ?? String(serverConfig.SEUIL_MAJORITY),
    limite_jour: siteConfig.limite_jour ?? String(serverConfig.limite_jour ?? 4),
    limite_jour_max: siteConfig.limite_jour_max ?? String(serverConfig.limite_jour_max ?? 8),
    duel_egalite: siteConfig.duel_egalite ?? 'note',
  })
  const [dirty, setDirty] = useState(false)

  function set(key: string, value: string) {
    setVals(v => ({ ...v, [key]: value }))
    setDirty(true)
  }

  async function handleSave() {
    setBusy(true)
    const r = await adminSetConfig(vals)
    if (r.error) addToast(r.error)
    else { addToast('Reglages enregistres — en ligne.'); setDirty(false); router.refresh() }
    setBusy(false)
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Reglages</h1>

      {/* Saison */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Saison</h2>
        <div className={styles.card}>
          <div className={styles.grid2}>
            <div>
              <div className={styles.label}>Numero de saison</div>
              <input className={styles.input} type="number" min="1" value={vals.saison_numero} onChange={e => set('saison_numero', e.target.value)} />
            </div>
            <div>
              <div className={styles.label}>Libelle de saison</div>
              <input className={styles.input} value={vals.saison_label} onChange={e => set('saison_label', e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <div className={styles.label}>Date et heure de lancement (heure de Paris)</div>
            <input className={styles.input} type="datetime-local" value={vals.marathon_start} onChange={e => set('marathon_start', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Séances */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Seances</h2>
        <div className={styles.card}>
          <div className={styles.grid2}>
            <div>
              <div className={styles.label}>Jour du duel</div>
              <select className={styles.input} value={vals.seance_jour} onChange={e => set('seance_jour', e.target.value)}>
                {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <div className={styles.label}>Heure du duel</div>
              <input className={styles.input} value={vals.seance_heure} onChange={e => set('seance_heure', e.target.value)} placeholder="20h30" />
            </div>
          </div>
          <div className={styles.grid2} style={{ marginTop: 'var(--sp-4)' }}>
            <div>
              <div className={styles.label}>Jour du film de la semaine</div>
              <select className={styles.input} value={vals.fdls_jour} onChange={e => set('fdls_jour', e.target.value)}>
                {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <div className={styles.label}>Heure du film de la semaine</div>
              <input className={styles.input} value={vals.fdls_heure} onChange={e => set('fdls_heure', e.target.value)} placeholder="20h30" />
            </div>
          </div>
        </div>
      </div>

      {/* EXP */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>EXP et seuils</h2>
        <div className={styles.card}>
          <div className={styles.grid3}>
            <div>
              <div className={styles.label}>EXP par film</div>
              <input className={styles.input} type="number" value={vals.exp_film} onChange={e => set('exp_film', e.target.value)} />
            </div>
            <div>
              <div className={styles.label}>EXP film de la semaine</div>
              <input className={styles.input} type="number" value={vals.exp_fdls} onChange={e => set('exp_fdls', e.target.value)} />
            </div>
            <div>
              <div className={styles.label}>EXP vainqueur du duel</div>
              <input className={styles.input} type="number" value={vals.exp_duel_win} onChange={e => set('exp_duel_win', e.target.value)} />
            </div>
          </div>
          <div className={styles.grid3} style={{ marginTop: 'var(--sp-4)' }}>
            <div>
              <div className={styles.label}>EXP par vote</div>
              <input className={styles.input} type="number" value={vals.exp_vote} onChange={e => set('exp_vote', e.target.value)} />
            </div>
            <div>
              <div className={styles.label}>EXP bonus 48 h</div>
              <input className={styles.input} type="number" value={vals.exp_fdls_bonus} onChange={e => set('exp_fdls_bonus', e.target.value)} />
            </div>
            <div>
              <div className={styles.label}>Seuil de majorite (%)</div>
              <input className={styles.input} type="number" value={vals.seuil_majority} onChange={e => set('seuil_majority', e.target.value)} />
            </div>
          </div>
          <div className={styles.grid2} style={{ marginTop: 'var(--sp-4)' }}>
            <div>
              <div className={styles.label}>Limite par jour</div>
              <input className={styles.input} type="number" value={vals.limite_jour} onChange={e => set('limite_jour', e.target.value)} />
            </div>
            <div>
              <div className={styles.label}>Limite apres accord</div>
              <input className={styles.input} type="number" value={vals.limite_jour_max} onChange={e => set('limite_jour_max', e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <div className={styles.label}>Regle d'egalite au duel</div>
            <select className={styles.input} value={vals.duel_egalite} onChange={e => set('duel_egalite', e.target.value)}>
              <option value="note">Meilleure note moyenne</option>
              <option value="random">Tirage au sort</option>
            </select>
          </div>
        </div>
      </div>

      {dirty && (
        <div className={styles.stickyBar}>
          <button className={styles.btnPrimary} disabled={busy} onClick={handleSave}>
            Enregistrer les reglages
          </button>
        </div>
      )}
    </>
  )
}
