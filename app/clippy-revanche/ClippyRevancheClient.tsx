'use client'

import { useState } from 'react'

interface Props {
  clippyDefeats: number
}

const PHASES = [
  { phase: 1, name: 'Gladiator', icon: '⚔️', desc: 'Le premier affrontement. Combat classique contre Clippy.' },
  { phase: 2, name: 'La fièvre du samedi soir', icon: '🕺', desc: 'Dance battle DDR — Fever Night en mode survie.' },
  { phase: 3, name: 'Phase 3', icon: '🔒', desc: '???', locked: true },
  { phase: 4, name: 'Phase 4', icon: '🔒', desc: '???', locked: true },
  { phase: 5, name: 'Phase 5', icon: '🔒', desc: '???', locked: true },
]

const LOCKED_MSG = 'Désolé, Clippy travaille actuellement son plan de revanche en enfer. Il reviendra plus tard, mais il est trop occupé à réfléchir à comment te détruire. Reviens plus tard.'

export default function ClippyRevancheClient({ clippyDefeats }: Props) {
  const [lockedToast, setLockedToast] = useState<string | null>(null)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', marginBottom: '.4rem', color: '#e85a5a' }}>
          📎 La Revanche de Clippy
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Tu as vaincu Clippy. Mais il n'oublie jamais. Rejoue les phases que tu as conquises.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {PHASES.map(cp => {
          const unlocked = clippyDefeats >= cp.phase

          return (
            <button
              key={cp.phase}
              onClick={() => {
                if (!unlocked) return
                if (cp.locked) {
                  setLockedToast(LOCKED_MSG)
                  setTimeout(() => setLockedToast(null), 5000)
                  return
                }
                localStorage.setItem('clippy_replay_phase', String(cp.phase))
                localStorage.setItem('clippy_active', '1')
                window.dispatchEvent(new CustomEvent('clippy:invoke'))
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: '2rem 1fr auto',
                alignItems: 'center',
                gap: '1rem',
                padding: '.9rem 1.2rem',
                borderRadius: 'var(--rl)',
                background: !unlocked
                  ? 'rgba(255,255,255,0.02)'
                  : cp.locked
                  ? 'rgba(255,255,255,.04)'
                  : 'rgba(232, 90, 90, 0.1)',
                border: `1px solid ${!unlocked ? 'rgba(255,255,255,.03)' : cp.locked ? 'rgba(255,255,255,.06)' : 'rgba(232, 90, 90, 0.25)'}`,
                cursor: !unlocked ? 'default' : 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all .2s',
                opacity: !unlocked ? 0.35 : cp.locked ? 0.55 : 1,
              }}
            >
              <div style={{ fontSize: '1.2rem', textAlign: 'center', filter: unlocked ? 'none' : 'grayscale(1)' }}>
                {unlocked ? cp.icon : '❓'}
              </div>
              <div>
                {unlocked ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.15rem', color: cp.locked ? 'var(--text3)' : '#e85a5a' }}>
                      Phase {cp.phase} — {cp.name}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text3)', lineHeight: 1.4 }}>
                      {cp.desc}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text3)', marginBottom: '.15rem' }}>
                      Phase {cp.phase} — ???
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text3)', opacity: .5 }}>
                      Bats Clippy pour débloquer cette phase
                    </div>
                  </>
                )}
              </div>
              <div style={{
                display: 'inline-block',
                fontSize: '.65rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                color: !unlocked ? '#555' : cp.locked ? '#888' : '#e85a5a',
                background: !unlocked ? 'rgba(255,255,255,.02)' : cp.locked ? 'rgba(255,255,255,.04)' : 'rgba(232, 90, 90, 0.12)',
                border: `1px solid ${!unlocked ? 'rgba(255,255,255,.05)' : cp.locked ? 'rgba(255,255,255,.08)' : 'rgba(232, 90, 90, 0.3)'}`,
                borderRadius: 99, padding: '3px 10px',
              }}>
                {!unlocked ? 'Verrouillé' : cp.locked ? 'Bientôt' : 'Rejouer'}
              </div>
            </button>
          )
        })}
      </div>

      {lockedToast && (
        <div style={{
          marginTop: '.8rem', padding: '.8rem 1rem', borderRadius: 'var(--rl)',
          background: 'rgba(232, 90, 90, 0.08)', border: '1px solid rgba(232, 90, 90, 0.25)',
          fontSize: '.8rem', color: '#e85a5a', lineHeight: 1.5,
          animation: 'ee-fadein .3s ease',
        }}>
          🔥 {lockedToast}
        </div>
      )}
    </div>
  )
}
