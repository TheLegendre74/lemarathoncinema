'use client'

import { useState } from 'react'

interface PandoraBoxProps {
  onOpen: () => void
  onClose: () => void
}

export default function PandoraBox({ onOpen, onClose }: PandoraBoxProps) {
  const [phase, setPhase] = useState<'dialog' | 'opening' | 'done'>('dialog')

  function handleYes() {
    setPhase('opening')
    // Après l'animation d'ouverture (~2.2s), Clippy apparaît
    setTimeout(() => {
      setPhase('done')
      onOpen()
    }, 2400)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5,4,12,.85)',
      zIndex: 99980,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      animation: 'pandora-fadein .4s ease',
    }}>
      <style>{`
        @keyframes pandora-fadein { from{opacity:0} to{opacity:1} }
        @keyframes pandora-fadeout { from{opacity:1} to{opacity:0} }
        @keyframes chest-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes lid-open { from{transform:rotateX(0deg)} to{transform:rotateX(-130deg)} }
        @keyframes light-burst { 0%{opacity:0;transform:scaleY(0)} 30%{opacity:1} 100%{opacity:0;transform:scaleY(1) scaleX(1.4)} }
        @keyframes glow-pulse { 0%,100%{box-shadow:0 0 30px rgba(232,196,106,.3),0 0 60px rgba(200,80,200,.15)} 50%{box-shadow:0 0 60px rgba(232,196,106,.6),0 0 120px rgba(200,80,200,.35)} }
        @keyframes particle-float {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
        }
        @keyframes pandora-msg { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Coffre */}
      <div style={{
        position: 'relative',
        marginBottom: '2.5rem',
        perspective: 600,
        animation: phase === 'opening' ? 'chest-shake .4s ease' : 'glow-pulse 2.5s ease infinite',
      }}>

        {/* Lumière qui sort */}
        {phase === 'opening' && (
          <>
            <div style={{
              position: 'absolute', left: '50%', bottom: '100%',
              transform: 'translateX(-50%)',
              width: 80, height: 200,
              background: 'linear-gradient(to top, rgba(232,196,106,.9) 0%, rgba(220,160,255,.6) 40%, transparent 100%)',
              animation: 'light-burst 2s ease forwards',
              pointerEvents: 'none', zIndex: 2,
              borderRadius: '50% 50% 0 0',
            }} />
            {/* Particules */}
            {Array.from({ length: 14 }).map((_, i) => {
              const angle = (i / 14) * 360
              const dist = 80 + Math.random() * 60
              const px = Math.cos((angle * Math.PI) / 180) * dist
              const py = -Math.sin((angle * Math.PI) / 180) * dist - 40
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: '50%', top: 0,
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: i % 3 === 0 ? '#e8c46a' : i % 3 === 1 ? '#c86af0' : '#5af0c8',
                  '--px': `${px}px`,
                  '--py': `${py}px`,
                  animation: `particle-float ${0.8 + Math.random() * 0.8}s ease ${0.3 + i * 0.08}s forwards`,
                  zIndex: 3,
                } as React.CSSProperties} />
              )
            })}
          </>
        )}

        {/* Couvercle */}
        <div style={{
          width: 160, height: 55,
          background: 'linear-gradient(180deg, #5c3a1e 0%, #3d2410 100%)',
          border: '3px solid #8b5a2b',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          transformOrigin: 'top center',
          zIndex: 4,
          animation: phase === 'opening' ? 'lid-open .7s ease .35s forwards' : 'none',
          boxShadow: 'inset 0 2px 6px rgba(255,200,100,.1)',
        }}>
          {/* Déco couvercle */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 40, height: 18,
            background: 'linear-gradient(135deg, #c4903a, #e8c46a, #c4903a)',
            borderRadius: 4,
            border: '2px solid #8b6820',
            boxShadow: '0 0 8px rgba(232,196,106,.4)',
          }} />
          <div style={{ position: 'absolute', top: 6, left: 10, width: 16, height: 6, background: '#8b5a2b', borderRadius: 2, border: '1px solid #5c3a1e' }} />
          <div style={{ position: 'absolute', top: 6, right: 10, width: 16, height: 6, background: '#8b5a2b', borderRadius: 2, border: '1px solid #5c3a1e' }} />
        </div>

        {/* Corps */}
        <div style={{
          width: 160, height: 90,
          background: 'linear-gradient(180deg, #4a2e12 0%, #2d1a08 100%)',
          border: '3px solid #8b5a2b',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(0,0,0,.6), inset 0 -2px 8px rgba(0,0,0,.5)',
        }}>
          {/* Serrure */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            width: 28, height: 28,
            background: 'linear-gradient(135deg, #c4903a, #e8c46a)',
            borderRadius: '50%',
            border: '3px solid #8b6820',
            boxShadow: '0 0 10px rgba(232,196,106,.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>🔒</div>
          {/* Bandes métal */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 44, height: 5, background: 'linear-gradient(90deg, #6b4420, #a0681e, #e8c46a, #a0681e, #6b4420)', opacity: .8 }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 20, width: 5, background: 'linear-gradient(180deg, #a0681e, #6b4420)', opacity: .6, borderRadius: 2 }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 20, width: 5, background: 'linear-gradient(180deg, #a0681e, #6b4420)', opacity: .6, borderRadius: 2 }} />
          {/* Ombre intérieure si ouvert */}
          {phase === 'opening' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center top, rgba(232,196,106,.25) 0%, rgba(200,80,255,.15) 40%, transparent 70%)',
              borderRadius: '0 0 8px 8px',
              animation: 'light-burst 2s ease .3s forwards',
            }} />
          )}
        </div>
      </div>

      {/* Dialogue */}
      {phase === 'dialog' && (
        <div style={{
          maxWidth: 460, width: '90%',
          background: 'linear-gradient(135deg, #0d0b18, #110e22)',
          border: '1px solid rgba(232,196,106,.25)',
          borderRadius: 16, padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,.6)',
          animation: 'pandora-msg .5s ease .2s both',
        }}>
          <div style={{ fontSize: '.65rem', letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(232,196,106,.5)', marginBottom: '1rem' }}>
            ⚠ Avertissement
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.15rem',
            color: '#eeeef8', lineHeight: 1.7, marginBottom: '1.8rem',
          }}>
            Voici la <span style={{ color: '#e8c46a' }}>Boîte de Pandore</span>.<br/>
            À l'intérieur réside le mal le plus ancien et démoniaque que l'univers n'ait jamais connu…
            <br/><br/>
            <span style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.7)' }}>
              Es-tu sûr de vouloir l'ouvrir ?
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={handleYes}
              style={{
                padding: '.7rem 2rem', borderRadius: 8,
                background: 'linear-gradient(135deg, #8b1a1a, #c0392b)',
                border: '1px solid rgba(232,90,90,.4)',
                color: '#fff', fontSize: '.95rem', fontWeight: 700,
                cursor: 'pointer', letterSpacing: 1,
                transition: 'all .2s',
                boxShadow: '0 4px 16px rgba(200,0,0,.3)',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Oui
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '.7rem 2rem', borderRadius: 8,
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.12)',
                color: '#aaa', fontSize: '.95rem', fontWeight: 600,
                cursor: 'pointer', letterSpacing: 1,
                transition: 'all .2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Non
            </button>
          </div>
        </div>
      )}

      {/* Message pendant ouverture */}
      {phase === 'opening' && (
        <div style={{
          marginTop: '1.5rem',
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem', color: '#e8c46a',
          textAlign: 'center', letterSpacing: 2,
          textShadow: '0 0 20px rgba(232,196,106,.6)',
          animation: 'pandora-msg .4s ease',
        }}>
          La boîte s'ouvre…
        </div>
      )}
    </div>
  )
}
