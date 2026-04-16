'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { discoverEgg, unlockAgentOfChaos } from '@/lib/actions'

// ═══════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════

type Phase =
  | 'freeze'     // 0–280ms  : site gelé, rire
  | 'falling'    // 280ms    : carte tombe du haut
  | 'flipping'   // 1600ms   : carte se retourne
  | 'smile'      // 2200ms   : sourire rouge se dessine
  | 'chaos'      // 3400ms   : 5–8s de chaos violet/vert
  | 'shell'      // au clic  : jeu de bonneteau
  | 'won'        // victoire
  | 'done'       // fin / démontage

// ═══════════════════════════════════════════════════════════════
//  RIRE SYNTHÉTIQUE (Web Audio API)
// ═══════════════════════════════════════════════════════════════

function playLaugh() {
  try {
    const ctx = new AudioContext()
    const notes: [number, number, number][] = [
      [175, 0,    0.13],
      [190, 0.19, 0.13],
      [175, 0.38, 0.13],
      [210, 0.62, 0.18],
      [225, 0.88, 0.20],
      [248, 1.18, 0.30],
    ]
    notes.forEach(([freq, t, dur]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      const flt  = ctx.createBiquadFilter()
      flt.type = 'lowpass'; flt.frequency.value = 950
      osc.connect(flt); flt.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sawtooth'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + t)
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + t + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + dur + 0.08)
    })
    setTimeout(() => ctx.close().catch(() => {}), 2600)
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
//  CARTE JOKER
// ═══════════════════════════════════════════════════════════════

interface CardProps {
  flipped?: boolean
  style?:   React.CSSProperties
  onClick?: () => void
  mini?:    boolean
}

function JokerCard({ flipped = true, style, onClick, mini = false }: CardProps) {
  const W = mini ? 80  : 200
  const H = mini ? 120 : 300

  return (
    <div
      onClick={onClick}
      style={{
        width: W, height: H,
        borderRadius: mini ? 6 : 12,
        border: '2.5px solid #111',
        boxShadow: flipped
          ? '0 8px 40px rgba(180,0,40,0.35), inset 0 0 0 1px rgba(255,255,255,0.6)'
          : '0 8px 30px rgba(0,0,0,0.5)',
        background: flipped ? '#faf8f2' : '#14141a',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
    >
      {flipped ? (
        <>
          {/* Texture sale */}
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 25% 20%, rgba(0,0,0,0.05), transparent 55%)', pointerEvents:'none' }} />

          {/* Coin supérieur gauche */}
          <div style={{ position:'absolute', top: mini?4:10, left: mini?5:12, color:'#cc1111', fontSize: mini?9:17, fontWeight:800, fontFamily:'Georgia,serif', lineHeight:1.1 }}>
            J<br/><span style={{ fontSize: mini?7:11 }}>♦</span>
          </div>

          {/* Coin inférieur droit (retourné) */}
          <div style={{ position:'absolute', bottom: mini?4:10, right: mini?5:12, color:'#cc1111', fontSize: mini?9:17, fontWeight:800, fontFamily:'Georgia,serif', lineHeight:1.1, transform:'rotate(180deg)' }}>
            J<br/><span style={{ fontSize: mini?7:11 }}>♦</span>
          </div>

          {/* Centre */}
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: mini?3:8 }}>
            {/* Chapeau de bouffon CSS */}
            <div style={{ position:'relative', width: mini?28:70, height: mini?20:50 }}>
              {/* Pointe gauche rouge */}
              <div style={{ position:'absolute', left:0, bottom:0, width:0, height:0, borderLeft: `${mini?13:33}px solid transparent`, borderRight:`${mini?4:10}px solid transparent`, borderBottom:`${mini?20:50}px solid #cc1111` }} />
              {/* Pointe droite bleue */}
              <div style={{ position:'absolute', right:0, bottom:0, width:0, height:0, borderLeft:`${mini?4:10}px solid transparent`, borderRight:`${mini?13:33}px solid transparent`, borderBottom:`${mini?20:50}px solid #4433aa` }} />
              {/* Grelots */}
              <div style={{ position:'absolute', left:-2, top:-4, width: mini?7:16, height: mini?7:16, borderRadius:'50%', background:'#ffcc00', border:`1.5px solid #aa8800`, boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
              <div style={{ position:'absolute', right:-2, top:-4, width: mini?7:16, height: mini?7:16, borderRadius:'50%', background:'#ffcc00', border:`1.5px solid #aa8800`, boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
            </div>

            {/* Texte JOKER */}
            <div style={{
              fontSize: mini?6:12,
              letterSpacing: mini?3:6,
              fontWeight: 800,
              color: '#111',
              fontFamily: 'Georgia, serif',
              textTransform: 'uppercase',
              transform: 'skew(-4deg)',
              borderTop:    '1.5px solid #cc1111',
              borderBottom: '1.5px solid #cc1111',
              padding: mini?'1px 4px':'3px 12px',
            }}>
              JOKER
            </div>
          </div>

          {/* Petites taches */}
          {!mini && <>
            <div style={{ position:'absolute', top:58, right:22, width:7, height:11, background:'rgba(0,0,0,0.06)', borderRadius:'50%', transform:'rotate(-18deg)' }} />
            <div style={{ position:'absolute', bottom:76, left:19, width:5, height:8,  background:'rgba(0,0,0,0.05)', borderRadius:'50%' }} />
          </>}
        </>
      ) : (
        /* Dos de carte */
        <>
          <div style={{ position:'absolute', inset: mini?4:8, border:`${mini?1:2}px solid #2a2a3a`, borderRadius: mini?3:7, background:'repeating-linear-gradient(45deg,#18181e,#18181e 3px,#1f1f28 3px,#1f1f28 6px)' }} />
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#cc1111', fontSize: mini?18:36, opacity:0.35, pointerEvents:'none' }}>♦</div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SOURIRE ROUGE SVG
// ═══════════════════════════════════════════════════════════════

function SmileOverlay({ active }: { active: boolean }) {
  // Chemin du sourire — légèrement ondulé, comme tracé à la main
  const PATH = "M -30,215 C 80,255 190,295 320,238 C 440,185 560,270 700,225 C 820,185 920,240 1030,215"
  const LEN  = 1100

  return (
    <svg
      viewBox="0 0 1000 430"
      preserveAspectRatio="xMidYMid slice"
      style={{ position:'fixed', inset:0, width:'100%', height:'100%', zIndex:9994, pointerEvents:'none' }}
    >
      <path
        d={PATH}
        stroke="#cc0000"
        strokeWidth="15"
        strokeLinecap="round"
        fill="none"
        style={{
          filter: 'drop-shadow(0 0 8px rgba(200,0,0,0.7))',
          strokeDasharray: LEN,
          strokeDashoffset: active ? 0 : LEN,
          transition: active ? 'stroke-dashoffset 1.1s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
        }}
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
//  CANVAS GLITCH
// ═══════════════════════════════════════════════════════════════

function GlitchCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = ref.current!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!
    let raf: number

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const count = Math.floor(Math.random() * 7)
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const w = 60 + Math.random() * 280
        const h = 2  + Math.random() * 7
        const isViolet = Math.random() > 0.45
        ctx.fillStyle = isViolet
          ? `rgba(${80+Math.floor(Math.random()*60)},0,${160+Math.floor(Math.random()*80)},${0.12+Math.random()*0.22})`
          : `rgba(0,${130+Math.floor(Math.random()*80)},${40+Math.floor(Math.random()*40)},${0.10+Math.random()*0.18})`
        ctx.fillRect(x, y, w, h)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [active])

  return (
    <canvas
      ref={ref}
      style={{ position:'fixed', inset:0, zIndex:9993, pointerEvents:'none', display: active ? 'block' : 'none' }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════
//  JEU DE BONNETEAU
// ═══════════════════════════════════════════════════════════════

interface ShellGameProps {
  onWin:   () => void
  onClose: () => void
}

function ShellGame({ onWin, onClose }: ShellGameProps) {
  const CARDS = 5
  const jokerIdx = useRef(Math.floor(Math.random() * CARDS))

  // slots[cardIdx] = position visuelle (0–4)
  const [slots,     setSlots]     = useState<number[]>([0,1,2,3,4])
  const [shuffling, setShuffling] = useState(true)
  const [revealed,  setRevealed]  = useState<number | null>(null) // card index cliqué
  const [lost,      setLost]      = useState(false)
  const [tries,     setTries]     = useState(0)

  // Shuffle
  useEffect(() => {
    if (!shuffling) return
    let active = true
    const id = setInterval(() => {
      if (!active) return
      setSlots(prev => {
        const next = [...prev]
        const i = Math.floor(Math.random() * CARDS)
        const j = (i + 1 + Math.floor(Math.random() * (CARDS - 1))) % CARDS
        ;[next[i], next[j]] = [next[j], next[i]]
        return next
      })
    }, 110)
    const stop = setTimeout(() => { active = false; clearInterval(id); setShuffling(false) }, 3200)
    return () => { active = false; clearInterval(id); clearTimeout(stop) }
  }, [shuffling, tries])

  function handlePick(cardIdx: number) {
    if (shuffling || revealed !== null) return
    setRevealed(cardIdx)
    if (cardIdx === jokerIdx.current) {
      setTimeout(onWin, 1200)
    } else {
      setLost(true)
    }
  }

  function handleRetry() {
    jokerIdx.current = Math.floor(Math.random() * CARDS)
    setSlots([0,1,2,3,4])
    setRevealed(null)
    setLost(false)
    setShuffling(true)
    setTries(t => t + 1)
  }

  const CARD_W   = 90
  const CARD_GAP = 14
  const TOTAL_W  = CARDS * CARD_W + (CARDS - 1) * CARD_GAP

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9998,
      background:'rgba(0,0,0,0.88)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:32,
    }}>
      {/* Titre */}
      <div style={{ fontFamily:'Georgia,serif', color:'#faf8f2', textAlign:'center' }}>
        <div style={{ fontSize:'2rem', fontWeight:800, letterSpacing:4, textTransform:'uppercase', color:'#cc1111', textShadow:'0 0 30px rgba(200,0,0,0.6)' }}>
          Trouvez le Joker
        </div>
        <div style={{ fontSize:'.85rem', color:'rgba(255,255,255,0.4)', marginTop:8, letterSpacing:2 }}>
          {shuffling ? 'Mélange en cours…' : revealed === null ? 'Choisissez une carte' : lost ? 'Raté !' : ''}
        </div>
      </div>

      {/* Cartes */}
      <div style={{ position:'relative', width:TOTAL_W, height:135 }}>
        {Array.from({ length: CARDS }, (_, cardIdx) => {
          const slot = slots[cardIdx]
          const x    = slot * (CARD_W + CARD_GAP)
          const isRevealed = revealed === cardIdx
          const isJoker    = cardIdx === jokerIdx.current
          // Révèle toutes les cartes si perdu
          const showFace   = isRevealed || (lost && revealed !== null)

          return (
            <div
              key={cardIdx}
              onClick={() => handlePick(cardIdx)}
              style={{
                position:'absolute',
                left: x,
                top: 0,
                transition: shuffling ? 'left 0.09s ease' : 'left 0.25s ease',
                cursor: (!shuffling && revealed === null) ? 'pointer' : 'default',
                // légère montée au hover (CSS inline ne peut pas faire :hover, on ignore)
              }}
            >
              <JokerCard
                mini
                flipped={showFace && isJoker}
                style={{
                  boxShadow: isRevealed && isJoker
                    ? '0 0 30px rgba(200,0,0,0.8)'
                    : isRevealed && !isJoker
                    ? '0 0 20px rgba(255,255,255,0.1)'
                    : undefined,
                  outline: isRevealed ? `2.5px solid ${isJoker ? '#cc1111' : '#555'}` : 'none',
                  outlineOffset: 2,
                  transform: isRevealed && isJoker ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                }}
              />
              {/* Croix si mauvaise carte révélée */}
              {showFace && !isJoker && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.25)', fontSize:36, pointerEvents:'none' }}>✕</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Boutons */}
      {lost && (
        <div style={{ display:'flex', gap:12 }}>
          <button
            onClick={handleRetry}
            style={{ padding:'10px 28px', background:'#cc1111', border:'none', borderRadius:6, color:'#fff', fontWeight:700, fontSize:'.9rem', cursor:'pointer', letterSpacing:2 }}
          >
            Réessayer
          </button>
          <button
            onClick={onClose}
            style={{ padding:'10px 28px', background:'transparent', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, color:'rgba(255,255,255,0.5)', fontSize:'.9rem', cursor:'pointer' }}
          >
            Abandonner
          </button>
        </div>
      )}
      {!shuffling && revealed === null && (
        <button
          onClick={onClose}
          style={{ padding:'8px 20px', background:'transparent', border:'none', color:'rgba(255,255,255,0.2)', fontSize:'.78rem', cursor:'pointer', letterSpacing:1 }}
        >
          Passer
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  BADGE "AGENT OF CHAOS"
// ═══════════════════════════════════════════════════════════════

function ChaosBadge({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    localStorage.setItem('joker-agent-of-chaos', '1')
    // Débloque le badge en base + auto-équipe si pas de badge spécial déjà actif
    unlockAgentOfChaos().catch(() => {})
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'rgba(0,0,0,0.92)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer',
        animation:'joker-badge-in 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <style>{`
        @keyframes joker-badge-in { from { opacity:0; transform:scale(0.6) rotate(-8deg); } to { opacity:1; transform:scale(1) rotate(0deg); } }
        @keyframes joker-badge-glow { 0%,100%{box-shadow:0 0 40px rgba(160,0,200,0.6),0 0 80px rgba(0,180,60,0.3)} 50%{box-shadow:0 0 60px rgba(200,0,240,0.8),0 0 120px rgba(0,200,80,0.5)} }
      `}</style>
      <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:24 }}>
        {/* Badge */}
        <div style={{
          width:220, height:220,
          borderRadius:'50%',
          background:'radial-gradient(circle at 40% 35%, #1a0028, #0a0015)',
          border:'3px solid #6600cc',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8,
          animation:'joker-badge-glow 1.8s ease-in-out infinite',
          position:'relative',
        }}>
          {/* Carte mini au centre */}
          <JokerCard mini flipped style={{ transform:'rotate(-8deg)', boxShadow:'0 4px 20px rgba(0,0,0,0.6)' }} />
        </div>

        {/* Titre */}
        <div>
          <div style={{ fontSize:'1.8rem', fontWeight:800, color:'#cc00ff', letterSpacing:4, textTransform:'uppercase', fontFamily:'Georgia,serif', textShadow:'0 0 30px rgba(200,0,255,0.7)' }}>
            Agent of Chaos
          </div>
          <div style={{ fontSize:'.8rem', color:'rgba(255,255,255,0.3)', letterSpacing:3, marginTop:6, textTransform:'uppercase' }}>
            Easter egg débloqué
          </div>
        </div>

        <div style={{ color:'rgba(255,255,255,0.15)', fontSize:'.72rem', letterSpacing:2 }}>cliquer pour fermer</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export function JokerCardEgg({ onDone }: { onDone: () => void }) {
  const [phase,       setPhase]       = useState<Phase>('freeze')
  const [cardFlipped, setCardFlipped] = useState(false)
  const [smileActive, setSmileActive] = useState(false)
  const [chaosHue,    setChaosHue]    = useState(0)

  // Labels chaos flottants (faux noms de boutons)
  const CHAOS_LABELS = ['HA HA HA', 'POURQUOI ?', 'CHAOS', 'WHY SO SERIOUS', '🃏', 'BURN IT', 'AGENT']
  const chaosLabelPositions = useRef(
    CHAOS_LABELS.map(() => ({
      x: 5 + Math.random() * 80,
      y: 10 + Math.random() * 75,
    }))
  )

  // Séquence principale
  useEffect(() => {
    discoverEgg('joker')

    // 0ms : freeze visuel (CSS body)
    document.body.style.pointerEvents = 'none'

    // 120ms : rire
    const t1 = setTimeout(() => { playLaugh() }, 120)

    // 280ms : la carte commence à tomber
    const t2 = setTimeout(() => {
      document.body.style.pointerEvents = ''
      setPhase('falling')
    }, 280)

    // 1600ms : carte retournée
    const t3 = setTimeout(() => {
      setPhase('flipping')
      setCardFlipped(true)
    }, 1600)

    // 2200ms : sourire se dessine
    const t4 = setTimeout(() => {
      setPhase('smile')
      setSmileActive(true)
    }, 2200)

    // 3400ms : chaos commence
    const t5 = setTimeout(() => { setPhase('chaos') }, 3400)

    return () => {
      document.body.style.pointerEvents = ''
      ;[t1,t2,t3,t4,t5].forEach(clearTimeout)
    }
  }, [])

  // Palette chaos : hue-rotate animé
  useEffect(() => {
    if (phase !== 'chaos') return
    let frame = 0
    const id = setInterval(() => {
      frame++
      setChaosHue(Math.sin(frame * 0.08) * 50 + 30) // oscille entre -20 et +80
    }, 40)
    return () => clearInterval(id)
  }, [phase])

  // CSS tremblements injectés dans <head>
  useEffect(() => {
    if (phase !== 'chaos') return
    const style = document.createElement('style')
    style.id = 'joker-chaos'
    style.textContent = `
      @keyframes joker-jitter {
        0%,100% { transform:translateX(0) translateY(0); }
        20%      { transform:translateX(-1.5px) translateY(0.8px); }
        40%      { transform:translateX(1.5px) translateY(-0.6px); }
        60%      { transform:translateX(-1px) translateY(1px); }
        80%      { transform:translateX(1px) translateY(-0.5px); }
      }
      h1, h2, h3, nav a { animation: joker-jitter 0.18s linear infinite !important; }
      button { animation: joker-jitter 0.14s linear infinite !important; }
    `
    document.head.appendChild(style)
    return () => { document.getElementById('joker-chaos')?.remove() }
  }, [phase])

  // Fin automatique du chaos après 6s
  useEffect(() => {
    if (phase !== 'chaos') return
    const t = setTimeout(() => setPhase('done'), 6000)
    return () => clearTimeout(t)
  }, [phase])

  // Fin complète
  useEffect(() => {
    if (phase !== 'done') return
    const t = setTimeout(onDone, 600)
    return () => clearTimeout(t)
  }, [phase, onDone])

  const handleCardClick = useCallback(() => {
    if (phase === 'chaos' || phase === 'flipping' || phase === 'smile') {
      setPhase('shell')
    }
  }, [phase])

  if (phase === 'shell') {
    return (
      <ShellGame
        onWin={() => setPhase('won')}
        onClose={() => setPhase('done')}
      />
    )
  }
  if (phase === 'won') {
    return <ChaosBadge onClose={() => setPhase('done')} />
  }

  return (
    <>
      {/* ── Overlay hue-rotate chaos ── */}
      {phase === 'chaos' && (
        <div
          style={{
            position:'fixed', inset:0, zIndex:9990,
            background:`rgba(${60+Math.floor(chaosHue*0.5)},0,${100+Math.floor(chaosHue)},0.07)`,
            mixBlendMode:'multiply',
            pointerEvents:'none',
            transition:'background 0.08s',
          }}
        />
      )}

      {/* ── Glitch canvas ── */}
      <GlitchCanvas active={phase === 'chaos'} />

      {/* ── Sourire SVG ── */}
      {(phase === 'smile' || phase === 'chaos') && (
        <SmileOverlay active={smileActive} />
      )}

      {/* ── Labels chaos flottants ── */}
      {phase === 'chaos' && CHAOS_LABELS.map((label, i) => (
        <div
          key={i}
          style={{
            position:'fixed',
            left: `${chaosLabelPositions.current[i].x}%`,
            top:  `${chaosLabelPositions.current[i].y}%`,
            color: i % 2 === 0 ? '#9900ff' : '#00cc44',
            fontFamily:'Georgia,serif',
            fontSize: '.65rem',
            fontWeight:700,
            letterSpacing:2,
            opacity: 0.55,
            pointerEvents:'none',
            zIndex: 9992,
            textShadow: i%2===0 ? '0 0 8px rgba(150,0,255,0.5)' : '0 0 8px rgba(0,200,60,0.5)',
          }}
        >
          {label}
        </div>
      ))}

      {/* ── Carte Joker ── */}
      {(phase === 'falling' || phase === 'flipping' || phase === 'smile' || phase === 'chaos') && (
        <div
          style={{
            position:'fixed', zIndex:9995,
            left:'50%', top:'50%',
            transform:'translateX(-50%) translateY(-50%)',
            perspective: 800,
          }}
        >
          <div
            onClick={handleCardClick}
            style={{
              transformOrigin:'center center',
              animation: phase === 'falling'
                ? 'joker-card-fall 1.3s cubic-bezier(0.22,1,0.36,1) forwards'
                : undefined,
              cursor: (phase === 'chaos' || phase === 'smile') ? 'pointer' : 'default',
            }}
          >
            <JokerCard flipped={cardFlipped} />
          </div>
        </div>
      )}

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes joker-card-fall {
          0%   { transform: translateY(-110vh) rotate(-25deg) scale(0.6); opacity:0; }
          60%  { transform: translateY(8px)   rotate(4deg)   scale(1.04); opacity:1; }
          80%  { transform: translateY(-6px)  rotate(-2deg)  scale(0.98); }
          100% { transform: translateY(0)     rotate(0deg)   scale(1);    opacity:1; }
        }
      `}</style>
    </>
  )
}
