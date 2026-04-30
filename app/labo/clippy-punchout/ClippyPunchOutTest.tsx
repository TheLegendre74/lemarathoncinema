'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'

const ClippyPunchOut = dynamic(() => import('@/components/ClippyPunchOutPhaser'), { ssr: false })

export default function ClippyPunchOutTest() {
  const [result, setResult] = useState<'playing' | 'win' | 'lose'>('playing')
  const [key, setKey] = useState(0)

  function reset() { setResult('playing'); setKey(k => k + 1) }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      {result === 'playing' && (
        <ClippyPunchOut
          key={key}
          onWin={() => setResult('win')}
          onLose={() => setResult('lose')}
          initialHP={70}
        />
      )}

      {result !== 'playing' && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#050508', color: '#fff', gap: 20,
          fontFamily: '"Courier New", monospace',
        }}>
          <div style={{ fontSize: 64 }}>{result === 'win' ? '🏆' : '💀'}</div>
          <div style={{ fontSize: 28, color: result === 'win' ? '#44ff88' : '#ff4444', letterSpacing: 2 }}>
            {result === 'win' ? 'VICTOIRE !' : 'DÉFAITE...'}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={reset} style={{
              padding: '12px 28px', fontSize: 14, cursor: 'pointer',
              background: '#ffd700', border: 'none', borderRadius: 6,
              color: '#000', fontWeight: 700, letterSpacing: 1,
            }}>
              REJOUER
            </button>
            <a href="/" style={{
              padding: '12px 20px', fontSize: 14,
              background: '#1a1a2e', border: '1px solid #333', borderRadius: 6,
              color: '#888', textDecoration: 'none',
            }}>
              ← Accueil
            </a>
          </div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 16 }}>
            Test local — non intégré au jeu principal
          </div>
        </div>
      )}
    </div>
  )
}
