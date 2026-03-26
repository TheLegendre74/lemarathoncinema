'use client'

import { useEffect, useState } from 'react'
import { CONFIG, isMarathonLive } from '@/lib/config'

export default function Countdown() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  const live = now >= CONFIG.MARATHON_START

  if (live) return (
    <div className="hero-countdown" style={{ marginBottom: '1.5rem' }}>
      <div style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="dot-live" />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--green)' }}>
            🎬 Marathon en cours — {CONFIG.SAISON_LABEL}
          </div>
          <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginTop: '.2rem' }}>
            Démarré le {CONFIG.MARATHON_START.toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </div>
        </div>
      </div>
    </div>
  )

  const diff = CONFIG.MARATHON_START.getTime() - now.getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="hero-countdown" style={{ marginBottom: '1.5rem' }}>
      <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{
          fontSize: '.65rem', letterSpacing: '4px', textTransform: 'uppercase',
          color: 'var(--text3)', marginBottom: '.8rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.7rem',
        }}>
          <span style={{ flex: 1, height: 1, background: 'var(--border)', maxWidth: 80, display: 'inline-block' }} />
          Début du marathon
          <span style={{ flex: 1, height: 1, background: 'var(--border)', maxWidth: 80, display: 'inline-block' }} />
        </div>

        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '1.3rem',
          color: 'var(--text2)', marginBottom: '1.5rem', fontStyle: 'italic',
        }}>
          Le temps presse avant l&apos;ouverture des séances…
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
          {[
            { val: d, label: 'Jours' },
            { sep: ':' },
            { val: h, label: 'Heures' },
            { sep: ':' },
            { val: m, label: 'Minutes' },
            { sep: ':' },
            { val: s, label: 'Secondes' },
          ].map((item, i) =>
            'sep' in item ? (
              <div key={i} style={{
                fontFamily: 'var(--font-display)', fontSize: '3rem',
                color: 'var(--text3)', marginTop: 4, opacity: .4,
              }}>{item.sep}</div>
            ) : (
              <div key={i} style={{ textAlign: 'center', minWidth: 90 }}>
                <span className="hc-num">{pad(item.val!)}</span>
                <span style={{ fontSize: '.6rem', textTransform: 'uppercase', letterSpacing: '2.5px', color: 'var(--text3)', marginTop: '.25rem', display: 'block' }}>
                  {item.label}
                </span>
              </div>
            )
          )}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '.6rem', background: 'var(--gold3)', border: '1px solid rgba(232,196,106,.25)', color: 'var(--gold)', fontSize: '.82rem', padding: '.45rem 1.1rem', borderRadius: 99, fontWeight: 500 }}>
          📅 {CONFIG.MARATHON_START.toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })} à 00h00
        </div>
        <div style={{ marginTop: '.7rem', fontSize: '.75rem', color: 'var(--text3)' }}>
          Inscris-toi et ajoute des films avant le coup d&apos;envoi
        </div>
      </div>
    </div>
  )
}
