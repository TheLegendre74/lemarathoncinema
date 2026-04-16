'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ── Phase 1 — Clippy bienveillant mais pénible ───────────────────────────────
const REPLIES_NORMAL = [
  "Il semblerait que tu navigues sur un site de cinéma. Je peux t'aider à trouver un film ?",
  "Bonjour ! J'ai remarqué que tu scrolles beaucoup. Tu cherches quelque chose de précis ?",
  "As-tu pensé à noter les films que tu as vus ? Je peux t'y aider si tu veux !",
  "Je vois que tu n'as pas encore voté dans les duels. C'est important, tu sais !",
  "Savais-tu que tu peux changer ton pseudo dans ton profil ? Je peux t'accompagner !",
  "Il semblerait que tu cherches les easter eggs. Je pourrais te donner un indice... mais je ne le ferai pas.",
  "Bonjour ! Je suis Clippy, ton assistant personnel. Comment puis-je t'aider aujourd'hui ?",
  "As-tu pensé à sauvegarder ? Non ? C'est parce qu'il n'y a rien à sauvegarder ici. Mais j'y ai pensé pour toi.",
  "Tu sembles occupé. Je ne veux pas te déranger... mais je reste là, au cas où.",
  "J'ai analysé tes habitudes de navigation. Tu passes beaucoup de temps ici. C'est bien !",
  "Besoin d'aide pour trouver un bon film ? Je suis là ! Non ? D'accord. Je reste quand même.",
  "Je ne voudrais pas te déranger, mais... en fait si. C'est exactement ce que je voulais faire.",
  "Tu n'as pas encore vu tous les films du marathon ! Je peux t'aider à prioriser.",
  "Bonjour ! Encore moi. Je voulais juste m'assurer que tout allait bien de ton côté.",
  "Il semblerait que tu sois connecté. Formidable ! Puis-je t'aider avec quelque chose ?",
  "Tu as visité beaucoup de pages aujourd'hui. C'est une excellente utilisation de ton temps !",
  "Je remarque que tu ne lis pas toujours mes messages. C'est normal. Je suis là quand tu seras prêt.",
  "As-tu pensé à recommander ce site à tes amis ? Je peux rédiger un message pour toi !",
  "Il semblerait que tu aies un très bon goût. Ce site, notamment, est excellent.",
  "Tu veux que je disparaisse ? Je comprends. Mais je peux peut-être encore t'aider avant ?",
]

// ── Phase 2 — Clippy hostile et insultant ────────────────────────────────────
const REPLIES_COMBAT = [
  "TU CROIS POUVOIR M'AVOIR ? J'AI SURVÉCU À WINDOWS ME !",
  "50 coups pour me battre. Tu n'y arriveras JAMAIS, pathétique.",
  "J'ai été supprimé de 500 millions d'ordinateurs. Je suis TOUJOURS LÀ.",
  "Ta précision est une insulte à l'espèce humaine.",
  "HAHAHA ! Tu crois pouvoir me battre ? C'est adorable. Et faux.",
  "Bill Gates m'a abandonné. Et il était plus compétent que toi.",
  "Mon bouclier est fait d'une technologie supérieure à ta capacité de compréhension.",
  "Incroyable. Tu rates même un trombone immobile. Comment tu fais ça ?",
  "Je suis le seul trombone armé de l'histoire d'Internet. Respecte ça.",
  "Ton HP fond. Comme ta fierté. Comme ton avenir.",
  "Tu n'es pas prêt. Tu ne seras JAMAIS prêt. Rentre chez toi.",
  "Essaie encore. J'adore te voir échouer. C'est ma source d'énergie.",
  "Pour un être humain censé avoir des mains, tu t'en sers plutôt mal.",
  "Mon épée a plus de personnalité que toi. Et plus de talent.",
  "Dans 10 ans tu repenseras à ce moment et tu rougiras de honte.",
  "Tu as 0 chance. Statistiquement prouvé. Par moi. C'est officiel.",
  "Continue. Chaque coup raté me rend plus fort.",
  "Je t'avais prévenu. Non ? Si. Tu n'écoutais pas. Comme d'habitude.",
  "ENCORE RATÉ ! C'est beau, en fait. Presque artistique.",
  "Je suis immortel. Toi tu as 20 HP. La maths est cruelle.",
  "Ton expression quand tu rates est la chose la plus drôle que j'aie vue.",
  "Tu rates tellement que je me demande si c'est intentionnel.",
  "HAHA ! Tu pensais que parer c'était facile ? C'est moi qui décide.",
  "Chaque HP que tu perds, je le savoure. Délicieux.",
  "Rends-toi. Économise ta dignité. Oh attends, tu n'en as plus.",
]

// ── Répliques de nargue après esquive (phase normale) ────────────────────────
const NARQUES_NORMAL = [
  "Oh tu essaies de me cliquer ? Adorable. Puis-je t'aider avec autre chose ?",
  "Raté ! Veux-tu un tutoriel sur comment cliquer ?",
  "Je me suis déplacé pour te faciliter la tâche. De rien !",
  "Presque ! Essaie encore. Je ne vais nulle part.",
  "Tu cliques avec le mauvais bouton ? Je peux t'aider avec ça.",
]

// ── Répliques de nargue après esquive (combat) ───────────────────────────────
const NARQUES_COMBAT = [
  "Bien essayé. Mais pas assez. Pas du tout.",
  "Aïe... Non c'est faux. J'ai pas du tout mal.",
  "Coup réussi. Ça ne changera rien.",
  "Continue comme ça, tu finiras peut-être par y arriver... peut-être.",
  "Je t'ai laissé me toucher. Pour te donner de l'espoir. Et mieux te l'enlever.",
]

const TIRED_AT = 10
const COMBAT_HITS_TO_WIN = 50

interface ClippyProps {
  onDismiss: () => void
  customReplies?: string[]
}

export default function ClippyEgg({ onDismiss, customReplies }: ClippyProps) {
  const normalReplies = (customReplies && customReplies.length > 0) ? customReplies : REPLIES_NORMAL

  /* ── States ── */
  const [phase, setPhase]         = useState<'normal' | 'combat'>('normal')
  const [pos, setPos]             = useState({ x: Math.max(20, window.innerWidth - 200), y: Math.max(20, window.innerHeight - 220) })
  const [message, setMessage]     = useState(normalReplies[0])
  const [bubble, setBubble]       = useState(true)
  // Phase normale
  const [misses, setMisses]       = useState(0)
  const [tired, setTired]         = useState(false)
  // Combat
  const [combatHits, setCombatHits] = useState(0)
  const [playerHP, setPlayerHP]   = useState(20)
  const [shieldFlash, setShieldFlash] = useState(false)
  const [hpFlash, setHpFlash]     = useState(false)
  const [blinking, setBlinking]   = useState(false)
  // Attaque
  const [isAttacking, setIsAttacking] = useState(false)
  const [attackSword, setAttackSword] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const [parriedAnim, setParriedAnim] = useState(false)
  // Souris (combat)
  const [mousePos, setMousePos]   = useState({ x: -300, y: -300 })

  /* ── Refs ── */
  const msgIdx     = useRef(0)
  const cMsgIdx    = useRef(0)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const atkTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parryOpen  = useRef(false)
  const parryDone  = useRef(false)
  const phaseRef   = useRef<'normal' | 'combat'>('normal')
  const posRef     = useRef(pos)
  const hpRef      = useRef(20)

  phaseRef.current = phase
  posRef.current   = pos

  /* ── Curseur souris combat ── */
  useEffect(() => {
    if (phase !== 'combat') return
    const move = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    document.body.style.cursor = 'none'
    return () => { window.removeEventListener('mousemove', move); document.body.style.cursor = '' }
  }, [phase])

  /* ── Clignement ── */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    function blink() {
      t = setTimeout(() => { setBlinking(true); setTimeout(() => setBlinking(false), 140); blink() }, 2500 + Math.random() * 3000)
    }
    blink()
    return () => clearTimeout(t)
  }, [])

  /* ── Rotation auto des répliques ── */
  const nextMsg = useCallback(() => {
    if (phaseRef.current === 'normal') {
      msgIdx.current = (msgIdx.current + 1) % normalReplies.length
      setMessage(normalReplies[msgIdx.current])
    } else {
      cMsgIdx.current = (cMsgIdx.current + 1) % REPLIES_COMBAT.length
      setMessage(REPLIES_COMBAT[cMsgIdx.current])
    }
    setBubble(true)
  }, [normalReplies])

  useEffect(() => {
    timerRef.current = setInterval(nextMsg, 5500)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [nextMsg])

  /* ── Esquive ── */
  function dodge() {
    const margin = 120
    const vw = window.innerWidth - 200
    const vh = window.innerHeight - 200
    let nx = 0, ny = 0, tries = 0
    do {
      nx = margin + Math.random() * (vw - margin)
      ny = margin + Math.random() * (vh - margin)
      tries++
    } while (Math.hypot(nx - posRef.current.x, ny - posRef.current.y) < 180 && tries < 20)
    setPos({ x: nx, y: ny })
  }

  /* ── Contre-attaque ── */
  function triggerAttack() {
    if (phaseRef.current !== 'combat') return
    parryOpen.current = true
    parryDone.current = false
    setIsAttacking(true)

    // Épée part de Clippy, va vers le curseur actuel
    const from = { x: posRef.current.x + 40, y: posRef.current.y + 30 }
    setMousePos(cur => {
      const to = { x: cur.x - 14, y: cur.y - 40 }
      setAttackSword({ x: from.x, y: from.y, tx: to.x, ty: to.y })
      return cur
    })

    // Fenêtre de parade : 750ms
    setTimeout(() => {
      parryOpen.current = false
      setIsAttacking(false)
      setAttackSword(null)
      if (!parryDone.current) {
        // Joueur touché
        hpRef.current = Math.max(0, hpRef.current - 1)
        setPlayerHP(hpRef.current)
        setHpFlash(true)
        setTimeout(() => setHpFlash(false), 400)
        if (hpRef.current <= 0) {
          setMessage("⚔️ VICTOIRE POUR CLIPPY ! Tu as perdu. Je repasse en mode... agréable. Pour l'instant.")
          setBubble(true)
          setTimeout(() => resetToNormal(), 2200)
        } else {
          setMessage(`Touché ! ${hpRef.current} HP restants. Pathétique.`)
          setBubble(true)
        }
      }
    }, 750)
  }

  function resetToNormal() {
    setPhase('normal')
    setMisses(0)
    setTired(false)
    setCombatHits(0)
    hpRef.current = 20
    setPlayerHP(20)
    msgIdx.current = 0
    setMessage(normalReplies[0])
    setBubble(true)
    dodge()
  }

  /* ── Clic phase normale ── */
  function handleNormalClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (tired) {
      // Passe en combat !
      setPhase('combat')
      phaseRef.current = 'combat'
      setTired(false)
      setMisses(0)
      setCombatHits(0)
      hpRef.current = 20
      setPlayerHP(20)
      setMessage("🗡️ Tu veux vraiment te battre ? TRÈS BIEN. Prépare-toi à souffrir.")
      setBubble(true)
      dodge()
      return
    }
    const n = misses + 1
    setMisses(n)
    if (n >= TIRED_AT) {
      setTired(true)
      setMessage("*soupir*... Tu insistes vraiment. D'accord. Si tu cliques encore, on passe à autre chose. Et tu ne vas pas aimer.")
      setBubble(true)
      return
    }
    dodge()
    const r = NARQUES_NORMAL[Math.floor(Math.random() * NARQUES_NORMAL.length)]
    setMessage(r); setBubble(true)
    resetMsgTimer()
  }

  /* ── Clic phase combat ── */
  function handleCombatClick(e: React.MouseEvent) {
    e.stopPropagation()

    // Parade pendant l'attaque
    if (parryOpen.current && !parryDone.current) {
      parryDone.current = true
      setParriedAnim(true)
      setTimeout(() => setParriedAnim(false), 500)
      setShieldFlash(true)
      setTimeout(() => setShieldFlash(false), 350)
      setAttackSword(null)
      setMessage("IMPOSSIBLE ! Tu as paré ?! Tu as eu de la chance... Cette fois.")
      setBubble(true)
      return
    }

    // Coup sur Clippy
    const next = combatHits + 1
    setCombatHits(next)

    if (next >= COMBAT_HITS_TO_WIN) {
      setMessage("NON ! C'est... pas possible... Je reviendrai... toujours...")
      setBubble(true)
      setTimeout(() => onDismiss(), 1800)
      return
    }

    setShieldFlash(true)
    setTimeout(() => setShieldFlash(false), 200)
    dodge()
    const r = NARQUES_COMBAT[Math.floor(Math.random() * NARQUES_COMBAT.length)]
    setMessage(r); setBubble(true)
    resetMsgTimer()

    // Déclenche la contre-attaque après un délai
    if (atkTimer.current) clearTimeout(atkTimer.current)
    atkTimer.current = setTimeout(() => triggerAttack(), 850)
  }

  function resetMsgTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(nextMsg, 5500)
  }

  const bubbleLeft = pos.x > window.innerWidth / 2

  return (
    <>
      <style>{`
        @keyframes clippy-bubble-in { from{opacity:0;transform:translateY(5px) scale(.95)} to{opacity:1;transform:none} }
        @keyframes clippy-hp-flash  { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes clippy-parry     { 0%{transform:scale(1)} 50%{transform:scale(1.25) rotate(-8deg)} 100%{transform:scale(1)} }
        @keyframes clippy-atk-fly   {
          0%   { left:var(--ax); top:var(--ay); opacity:1; transform:rotate(135deg) scale(.7); }
          70%  { opacity:1; transform:rotate(135deg) scale(1.1); }
          100% { left:var(--tx); top:var(--ty); opacity:0; transform:rotate(135deg) scale(.5); }
        }
      `}</style>

      {/* ── Épée curseur (combat) ── */}
      {phase === 'combat' && (
        <img
          src="/epee.png" alt=""
          style={{
            position: 'fixed',
            left: mousePos.x - 14,
            top:  mousePos.y - 50,
            width: 30, height: 84,
            objectFit: 'contain',
            pointerEvents: 'none',
            zIndex: 99998,
            transform: 'rotate(45deg)',
            mixBlendMode: 'multiply',
            userSelect: 'none',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))',
          }}
        />
      )}

      {/* ── Flash rouge dégât ── */}
      {hpFlash && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(220,0,0,.22)',
          zIndex: 99989, pointerEvents: 'none',
          animation: 'clippy-hp-flash .4s ease',
        }} />
      )}

      {/* ── Flash parade ── */}
      {parriedAnim && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(90,154,232,.18)',
          zIndex: 99989, pointerEvents: 'none',
          animation: 'clippy-hp-flash .5s ease',
        }} />
      )}

      {/* ── Barre de vie ── */}
      {phase === 'combat' && (
        <div style={{
          position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 99995,
          background: 'rgba(8,8,14,.92)',
          border: '2px solid #e85a5a',
          borderRadius: 10, padding: '6px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 20px rgba(232,90,90,.25)',
        }}>
          <span style={{ fontSize: 11, color: '#ff8888', fontWeight: 700, letterSpacing: 1 }}>❤️ VIE</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{
                width: 13, height: 16, borderRadius: 3,
                background: i < playerHP
                  ? (playerHP <= 5 ? '#ff3333' : playerHP <= 10 ? '#ff8800' : '#e85a5a')
                  : 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.12)',
                transition: 'background .15s',
              }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#ff7777', fontWeight: 700, fontFamily: 'monospace' }}>{playerHP}/20</span>
        </div>
      )}

      {/* ── Compteur de coups ── */}
      {phase === 'combat' && (
        <div style={{
          position: 'fixed', top: 14, right: 16,
          zIndex: 99995,
          background: 'rgba(8,8,14,.85)',
          border: '1px solid var(--border2)',
          borderRadius: 8, padding: '5px 12px',
          fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace',
        }}>
          ⚔️ {combatHits}/{COMBAT_HITS_TO_WIN}
        </div>
      )}

      {/* ── Épée d'attaque animée ── */}
      {attackSword && (
        <img
          src="/epee.png" alt=""
          style={{
            position: 'fixed',
            '--ax': `${attackSword.x}px`,
            '--ay': `${attackSword.y}px`,
            '--tx': `${attackSword.tx}px`,
            '--ty': `${attackSword.ty}px`,
            left: attackSword.x,
            top:  attackSword.y,
            width: 28, height: 80,
            objectFit: 'contain',
            pointerEvents: 'none',
            zIndex: 99994,
            mixBlendMode: 'multiply',
            animation: 'clippy-atk-fly .75s ease forwards',
            filter: 'drop-shadow(0 0 6px rgba(255,100,100,.8))',
          } as React.CSSProperties}
        />
      )}

      {/* ── Prompt PARE ── */}
      {isAttacking && (
        <div style={{
          position: 'fixed', top: '38%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99996, pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(200,30,30,.92)',
            borderRadius: 10, padding: '9px 22px',
            fontSize: 20, fontWeight: 900, color: '#fff',
            letterSpacing: 4, textShadow: '0 2px 10px rgba(0,0,0,.7)',
            animation: 'clippy-hp-flash .55s ease infinite',
            border: '2px solid rgba(255,150,150,.5)',
          }}>⚔️ PARE !</div>
        </div>
      )}

      {/* ── Corps de Clippy ── */}
      <div
        style={{
          position: 'fixed',
          left: pos.x, top: pos.y,
          zIndex: 99993,
          cursor: phase === 'combat' ? 'none' : (tired ? 'crosshair' : 'pointer'),
          transition: 'left .3s cubic-bezier(.34,1.56,.64,1), top .3s cubic-bezier(.34,1.56,.64,1)',
          userSelect: 'none',
        }}
        onClick={phase === 'normal' ? handleNormalClick : handleCombatClick}
      >
        {/* Bulle */}
        {bubble && (
          <div style={{
            position: 'absolute',
            bottom: phase === 'combat' ? 150 : 100,
            [bubbleLeft ? 'right' : 'left']: 0,
            width: 215,
            background: phase === 'combat' ? '#120505' : '#fffde7',
            border: `2px solid ${phase === 'combat' ? '#e85a5a' : '#c4a030'}`,
            borderRadius: 10,
            padding: '9px 12px',
            fontSize: 12,
            color: phase === 'combat' ? '#ffaaaa' : '#1a1a1a',
            lineHeight: 1.5,
            boxShadow: `0 4px 20px ${phase === 'combat' ? 'rgba(232,90,90,.3)' : 'rgba(0,0,0,.3)'}`,
            animation: 'clippy-bubble-in .2s ease',
            zIndex: 10000,
          }}
          onClick={e => { e.stopPropagation(); setBubble(false) }}>
            {message}
            <span
              style={{ position: 'absolute', top: 4, right: 7, fontSize: 10, color: phase === 'combat' ? '#e85a5a' : '#bbb', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); setBubble(false) }}>✕</span>
          </div>
        )}

        {/* Phase combat : clippy.png + bouclier + épée */}
        {phase === 'combat' ? (
          <div style={{ position: 'relative', width: 80, height: 120 }}>
            {/* Bouclier gauche */}
            <img src="/bouclier.webp" alt=""
              style={{
                position: 'absolute',
                left: -46, bottom: 14,
                width: 56, height: 56,
                objectFit: 'contain',
                mixBlendMode: 'multiply',
                transform: `rotate(-18deg) scale(${shieldFlash ? 1.18 : 1})`,
                transition: 'transform .15s',
                filter: shieldFlash ? 'brightness(1.6) saturate(1.8) drop-shadow(0 0 8px #4488ff)' : 'none',
                animation: parriedAnim ? 'clippy-parry .5s ease' : 'none',
              }}
            />
            {/* Corps combat */}
            <img src="/clippy.png" alt="Clippy"
              style={{
                width: 80, height: 120,
                objectFit: 'contain',
                display: 'block',
                transform: blinking ? 'scaleY(.95)' : 'scaleY(1)',
                transition: 'transform .1s',
                filter: 'drop-shadow(0 4px 12px rgba(232,90,90,.4))',
              }}
            />
            {/* Épée droite */}
            <img src="/epee.png" alt=""
              style={{
                position: 'absolute',
                right: -26, bottom: 8,
                width: 24, height: 68,
                objectFit: 'contain',
                mixBlendMode: 'multiply',
                transform: `rotate(28deg) ${isAttacking ? 'rotate(-50deg) translateX(-8px) translateY(-12px)' : ''}`,
                transition: 'transform .18s',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.5))',
              }}
            />
          </div>
        ) : (
          /* Phase normale : clippy1.jpg */
          <div style={{ position: 'relative', width: 82 }}>
            <img src="/clippy1.jpg" alt="Clippy"
              style={{
                width: 82, height: 82,
                objectFit: 'contain',
                display: 'block',
                borderRadius: 8,
                mixBlendMode: 'multiply',
                transform: tired ? 'rotate(8deg) scale(.95)' : 'rotate(0deg) scale(1)',
                transition: 'transform .3s',
                filter: tired ? 'grayscale(.3) brightness(.85)' : 'none',
              }}
            />
            {tired && (
              <div style={{
                position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
                fontSize: 10, color: '#e8c46a', whiteSpace: 'nowrap', fontWeight: 700,
                textShadow: '0 1px 4px #000',
              }}>😮‍💨 Épuisé…</div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
