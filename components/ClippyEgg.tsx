'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ── Phase 1 — bienveillant mais pénible ─────────────────────────────────────
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

// ── Phase 2 — hostile et insultant ──────────────────────────────────────────
const REPLIES_COMBAT = [
  "TU CROIS POUVOIR M'AVOIR ? J'AI SURVÉCU À WINDOWS ME !",
  "50 HP. Tu ne m'auras JAMAIS, pathétique.",
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

const NARQUES_NORMAL = [
  "Oh tu essaies de me cliquer ? Adorable. Puis-je t'aider avec autre chose ?",
  "Raté ! Veux-tu un tutoriel sur comment cliquer ?",
  "Je me suis déplacé pour te faciliter la tâche. De rien !",
  "Presque ! Essaie encore. Je ne vais nulle part.",
  "Tu cliques avec le mauvais bouton peut-être ? Je peux t'aider avec ça.",
]

const NARQUES_COMBAT = [
  "Bien essayé. Mais pas assez. Pas du tout.",
  "Aïe... Non c'est faux. J'ai pas du tout mal.",
  "Coup réussi. Ça ne changera rien.",
  "Continue comme ça, tu finiras peut-être par y arriver... peut-être.",
  "Je t'ai laissé me toucher. Pour te donner de l'espoir. Et mieux te l'enlever.",
]

// Tailles des sprites
const W_NORMAL  = 140   // Phase 1 : Clippy + bloc-notes
const W_COMBAT  = 160   // Phase 2 : Clippy combat
const W_SHIELD  = 110   // Bouclier (proportionnel à Clippy combat)
const W_SWORD   = 52    // Épée de Clippy (proportionnelle)
const H_SWORD   = 145   // Hauteur épée Clippy
const TIRED_AT  = 4     // Épuisé au 4e clic, combat au 5e
const CLIPPY_MAX_HP = 50
const PLAYER_MAX_HP = 20
const PARRY_WINDOW_MS = 2500  // 2.5 secondes pour parer
const PARRY_SQ = 150    // Taille du carré rouge (px)

interface ClippyProps {
  onDismiss: () => void
  customReplies?: string[]
}

export default function ClippyEgg({ onDismiss, customReplies }: ClippyProps) {
  const normalReplies = (customReplies && customReplies.length > 0) ? customReplies : REPLIES_NORMAL

  const [phase, setPhase]           = useState<'normal' | 'combat'>('normal')
  const [pos, setPos]               = useState({ x: Math.max(20, window.innerWidth - 220), y: Math.max(20, window.innerHeight - 240) })
  const [message, setMessage]       = useState(normalReplies[0])
  const [bubble, setBubble]         = useState(true)
  // Phase normale
  const [misses, setMisses]         = useState(0)
  const [tired, setTired]           = useState(false)
  // Combat — HP
  const [clippyHP, setClippyHP]     = useState(CLIPPY_MAX_HP)
  const [playerHP, setPlayerHP]     = useState(PLAYER_MAX_HP)
  // Combat — animations
  const [shieldFlash, setShieldFlash] = useState(false)
  const [hpFlash, setHpFlash]       = useState(false)
  const [clippyHit, setClippyHit]   = useState(false)
  // Parade — carré rouge
  const [parrySquare, setParrySquare] = useState<{ x: number; y: number } | null>(null)
  const [parryProgress, setParryProgress] = useState(1) // 1 → 0 en 2.5s
  const [parriedAnim, setParriedAnim] = useState(false)
  // Souris combat
  const [mousePos, setMousePos]     = useState({ x: -300, y: -300 })
  // Animation enfer
  const [hellPhase, setHellPhase]   = useState<'idle'|'flames'|'grab'|'drag'|'scream'|'fade'>('idle')
  const [hellPos, setHellPos]       = useState({ x: 0, y: 0 })

  const msgIdx      = useRef(0)
  const cMsgIdx     = useRef(0)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const atkTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parryTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parryRAF    = useRef<number | null>(null)
  const parryStart  = useRef<number>(0)
  const parryActive = useRef(false)

  const phaseRef = useRef<'normal' | 'combat'>('normal')
  const posRef   = useRef(pos)
  const clippyHPRef = useRef(CLIPPY_MAX_HP)
  const playerHPRef = useRef(PLAYER_MAX_HP)
  phaseRef.current    = phase
  posRef.current      = pos
  clippyHPRef.current = clippyHP
  playerHPRef.current = playerHP

  /* ── Audio ── */
  const musicRef  = useRef<HTMLAudioElement | null>(null)

  function playSound(src: string, volume = 1) {
    try {
      const a = new Audio(src)
      a.volume = volume
      a.play().catch(() => {})
    } catch {}
  }

  function startMusic() {
    if (musicRef.current) return
    const a = new Audio('/clippy-music.m4a')
    a.loop = true
    a.volume = 0.25
    a.play().catch(() => {})
    musicRef.current = a
  }

  function stopMusic() {
    if (!musicRef.current) return
    musicRef.current.pause()
    musicRef.current.currentTime = 0
    musicRef.current = null
  }

  // Nettoyage musique à la destruction
  useEffect(() => {
    return () => stopMusic()
  }, [])

  /* ── Séquence enfer — Clippy tiré vers les flammes ── */
  function startHellSequence() {
    stopMusic()
    playSound('/clippy-coup.mp3', 1)
    setHellPos({ x: posRef.current.x, y: posRef.current.y })
    setBubble(false)
    setHellPhase('flames')
    setTimeout(() => setHellPhase('grab'),                   1100)
    setTimeout(() => playSound('/clippy-rire.mp3', 0.85),   1800)  // rire démoniaque quand la main attrape
    setTimeout(() => setHellPhase('drag'),                   2600)
    setTimeout(() => setHellPhase('scream'),                 3300)
    setTimeout(() => setHellPhase('fade'),                   5200)
    setTimeout(() => { setHellPhase('idle'); onDismiss() }, 6000)
  }

  /* ── Curseur souris combat ── */
  useEffect(() => {
    if (phase !== 'combat') return
    const move = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    document.body.style.cursor = 'none'
    return () => { window.removeEventListener('mousemove', move); document.body.style.cursor = '' }
  }, [phase])

  /* ── Rotation auto messages ── */
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
    const margin = 130
    const vw = window.innerWidth - 220
    const vh = window.innerHeight - 220
    let nx = 0, ny = 0, tries = 0
    do {
      nx = margin + Math.random() * (vw - margin)
      ny = margin + Math.random() * (vh - margin)
      tries++
    } while (Math.hypot(nx - posRef.current.x, ny - posRef.current.y) < 200 && tries < 20)
    setPos({ x: nx, y: ny })
  }

  function resetMsgTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(nextMsg, 5500)
  }

  /* ── Démarrer parade ── */
  function startParry() {
    // Carré dans la zone centrale (20-80% de l'écran)
    const vw = window.innerWidth
    const vh = window.innerHeight
    const minX = vw * 0.2, maxX = vw * 0.8 - PARRY_SQ
    const minY = vh * 0.2, maxY = vh * 0.8 - PARRY_SQ
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)
    setParrySquare({ x, y })
    setParryProgress(1)
    parryActive.current = true
    parryStart.current = performance.now()

    // Barre de progression par RAF
    function tick() {
      const elapsed = performance.now() - parryStart.current
      const remaining = Math.max(0, 1 - elapsed / PARRY_WINDOW_MS)
      setParryProgress(remaining)
      if (remaining > 0 && parryActive.current) {
        parryRAF.current = requestAnimationFrame(tick)
      }
    }
    parryRAF.current = requestAnimationFrame(tick)

    // Timeout : parade ratée — Clippy frappe
    parryTimer.current = setTimeout(() => {
      if (!parryActive.current) return
      parryActive.current = false
      setParrySquare(null)
      if (parryRAF.current) cancelAnimationFrame(parryRAF.current)
      // Sons : épée tape + coup porté
      playSound('/clippy-hit.mp3', 0.9)
      setTimeout(() => playSound('/clippy-coup.mp3', 1), 120)
      // Joueur prend un coup
      const nextHP = Math.max(0, playerHPRef.current - 1)
      playerHPRef.current = nextHP
      setPlayerHP(nextHP)
      setHpFlash(true)
      setTimeout(() => setHpFlash(false), 450)
      if (nextHP <= 0) {
        setMessage("⚔️ VICTOIRE ! Tu as échoué. Je redeviens... agréable. Pour l'instant.")
        setBubble(true)
        stopMusic()
        setTimeout(() => resetToNormal(), 2200)
      } else {
        setMessage(`Touché ! Il te reste ${nextHP} HP. Lamentable.`)
        setBubble(true)
      }
    }, PARRY_WINDOW_MS)
  }

  function handleParryClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!parryActive.current) return
    // Parade réussie
    parryActive.current = false
    if (parryTimer.current) clearTimeout(parryTimer.current)
    if (parryRAF.current) cancelAnimationFrame(parryRAF.current)
    setParrySquare(null)
    setParriedAnim(true)
    setTimeout(() => setParriedAnim(false), 500)
    setShieldFlash(true)
    setTimeout(() => setShieldFlash(false), 350)

    // Son : épée contre bouclier
    playSound('/clippy-parry.mp3', 1)

    const nextHP = Math.max(0, clippyHPRef.current - 3)
    clippyHPRef.current = nextHP
    setClippyHP(nextHP)
    setClippyHit(true)
    setTimeout(() => setClippyHit(false), 300)

    if (nextHP <= 0) {
      startHellSequence()
      return
    }
    setMessage(`PARADE ?! -3 HP pour moi… Il m'en reste ${nextHP}. Ça ne changera rien.`)
    setBubble(true)
  }

  /* ── Contre-attaque ── */
  function triggerAttack() {
    if (phaseRef.current !== 'combat') return
    startParry()
  }

  /* ── Reset phase normale ── */
  function resetToNormal() {
    stopMusic()
    parryActive.current = false
    if (parryTimer.current) clearTimeout(parryTimer.current)
    if (parryRAF.current) cancelAnimationFrame(parryRAF.current)
    if (atkTimer.current) clearTimeout(atkTimer.current)
    setParrySquare(null)
    setPhase('normal')
    phaseRef.current = 'normal'
    setMisses(0)
    setTired(false)
    clippyHPRef.current = CLIPPY_MAX_HP
    playerHPRef.current = PLAYER_MAX_HP
    setClippyHP(CLIPPY_MAX_HP)
    setPlayerHP(PLAYER_MAX_HP)
    msgIdx.current = 0
    setMessage(normalReplies[0])
    setBubble(true)
    dodge()
  }

  /* ── Clic phase normale ── */
  function handleNormalClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (tired) {
      setPhase('combat')
      phaseRef.current = 'combat'
      setTired(false)
      setMisses(0)
      clippyHPRef.current = CLIPPY_MAX_HP
      playerHPRef.current = PLAYER_MAX_HP
      setClippyHP(CLIPPY_MAX_HP)
      setPlayerHP(PLAYER_MAX_HP)
      setMessage("🗡️ Tu veux vraiment te battre ?! TRÈS BIEN. Prépare-toi à souffrir.")
      setBubble(true)
      dodge()
      startMusic()
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
    setMessage(NARQUES_NORMAL[Math.floor(Math.random() * NARQUES_NORMAL.length)])
    setBubble(true)
    resetMsgTimer()
  }

  /* ── Clic phase combat ── */
  function handleCombatClick(e: React.MouseEvent) {
    e.stopPropagation()
    // Si le carré de parade est actif, ignorer les clics sur Clippy
    if (parryActive.current) return

    // Sons : swoosh d'abord, puis impact sur Clippy
    playSound('/clippy-swoosh.wav', 0.8)
    setTimeout(() => playSound('/clippy-hit.mp3', 0.9), 180)

    const nextHP = Math.max(0, clippyHPRef.current - 1)
    clippyHPRef.current = nextHP
    setClippyHP(nextHP)
    setClippyHit(true)
    setTimeout(() => setClippyHit(false), 250)
    setShieldFlash(true)
    setTimeout(() => setShieldFlash(false), 180)
    dodge()

    if (nextHP <= 0) {
      startHellSequence()
      return
    }

    setMessage(NARQUES_COMBAT[Math.floor(Math.random() * NARQUES_COMBAT.length)])
    setBubble(true)
    resetMsgTimer()

    if (atkTimer.current) clearTimeout(atkTimer.current)
    atkTimer.current = setTimeout(() => triggerAttack(), 900)
  }

  const bubbleLeft = pos.x > window.innerWidth / 2
  const combatW = W_COMBAT

  return (
    <>
      <style>{`
        @keyframes clippy-bubble-in { from{opacity:0;transform:translateY(5px) scale(.95)} to{opacity:1;transform:none} }
        @keyframes clippy-hp-flash  { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes clippy-parry-flash { 0%{opacity:0;transform:scale(.9)} 40%{opacity:1;transform:scale(1.06)} 100%{opacity:0;transform:scale(1)} }
        @keyframes clippy-hit       { 0%,100%{filter:none} 50%{filter:brightness(2) saturate(0)} }
        @keyframes parry-sq-pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(232,50,50,.8)} 50%{box-shadow:0 0 0 12px rgba(232,50,50,0)} }
        @keyframes parry-sq-in      { from{opacity:0;transform:scale(.7)} to{opacity:1;transform:scale(1)} }
        /* Enfer */
        @keyframes hell-flame-flicker { 0%,100%{transform:scaleY(1) skewX(0deg)} 25%{transform:scaleY(1.12) skewX(4deg)} 50%{transform:scaleY(.9) skewX(-3deg)} 75%{transform:scaleY(1.08) skewX(2deg)} }
        @keyframes hell-flame-in      { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes hell-hand-rise     { from{transform:translateY(900px)} to{transform:translateY(0)} }
        @keyframes hell-drag-down     { from{transform:translate(0,0)} to{transform:translate(0,1100px)} }
        @keyframes hell-clippy-shake  { 0%,100%{transform:rotate(0deg) scale(1)} 20%{transform:rotate(-14deg) scale(1.05)} 40%{transform:rotate(12deg) scale(.97)} 60%{transform:rotate(-10deg) scale(1.03)} 80%{transform:rotate(8deg) scale(.98)} }
        @keyframes hell-scream-in     { 0%{opacity:0;transform:translateX(-50%) scale(.5) rotate(-8deg)} 40%{opacity:1;transform:translateX(-50%) scale(1.1) rotate(2deg)} 100%{opacity:1;transform:translateX(-50%) scale(1) rotate(0deg)} }
        @keyframes hell-fade          { from{opacity:1} to{opacity:0} }
      `}</style>

      {/* ── Épée curseur (combat) — taille réelle ── */}
      {phase === 'combat' && (
        <img src="/epee.png" alt=""
          style={{
            position: 'fixed',
            left: mousePos.x - 45, top: mousePos.y - 200,
            width: 110, height: 320,
            objectFit: 'contain',
            pointerEvents: 'none', zIndex: 99998,
            transform: 'rotate(45deg)',
            userSelect: 'none',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.85))',
          }}
        />
      )}

      {/* ── Flash rouge dégât joueur ── */}
      {hpFlash && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(220,0,0,.25)',
          zIndex: 99989, pointerEvents: 'none',
          animation: 'clippy-hp-flash .45s ease',
        }} />
      )}

      {/* ── Flash bleu parade réussie ── */}
      {parriedAnim && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(60,140,255,.2)',
          zIndex: 99989, pointerEvents: 'none',
          animation: 'clippy-parry-flash .5s ease',
        }} />
      )}

      {/* ── Carré rouge de parade ── */}
      {parrySquare && (
        <div
          onClick={handleParryClick}
          style={{
            position: 'fixed',
            left: parrySquare.x, top: parrySquare.y,
            width: PARRY_SQ, height: PARRY_SQ,
            zIndex: 99996,
            cursor: 'crosshair',
            animation: 'parry-sq-in .15s ease, parry-sq-pulse 0.6s ease infinite',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 6,
          }}
        >
          {/* Cadre rouge */}
          <div style={{
            position: 'absolute', inset: 0,
            border: '4px solid #e83232',
            borderRadius: 6,
            background: 'rgba(200,20,20,.18)',
            backdropFilter: 'blur(2px)',
          }} />
          <span style={{ fontSize: 22, position: 'relative', zIndex: 1, userSelect: 'none' }}>⚔️</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: 2, position: 'relative', zIndex: 1, userSelect: 'none', textShadow: '0 1px 4px #000' }}>PARE !</span>
          {/* Barre de temps */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, borderRadius: '0 0 4px 4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${parryProgress * 100}%`,
              background: parryProgress > 0.5 ? '#4fd98a' : parryProgress > 0.25 ? '#f0a060' : '#e85a5a',
              transition: 'background .3s',
            }} />
          </div>
        </div>
      )}

      {/* ── HP Clippy ── */}
      {phase === 'combat' && (
        <div style={{
          position: 'fixed', top: 14, left: 16,
          zIndex: 99995,
          background: 'rgba(8,8,14,.92)',
          border: '2px solid #e8c46a',
          borderRadius: 10, padding: '5px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 20px rgba(232,196,106,.2)',
        }}>
          <span style={{ fontSize: 11, color: '#e8c46a', fontWeight: 700, letterSpacing: 1 }}>📎 CLIPPY</span>
          <div style={{ width: 120, height: 10, background: 'rgba(255,255,255,.1)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(clippyHP / CLIPPY_MAX_HP) * 100}%`,
              background: clippyHP > 30
                ? 'linear-gradient(90deg, #e8c46a, #f0a060)'
                : clippyHP > 15
                  ? 'linear-gradient(90deg, #f0a060, #e85a5a)'
                  : '#e85a5a',
              borderRadius: 99,
              transition: 'width .2s, background .3s',
              animation: clippyHit ? 'clippy-hp-flash .3s ease' : 'none',
            }} />
          </div>
          <span style={{ fontSize: 11, color: '#e8c46a', fontWeight: 700, fontFamily: 'monospace' }}>{clippyHP}/{CLIPPY_MAX_HP}</span>
        </div>
      )}

      {/* ── HP Joueur ── */}
      {phase === 'combat' && (
        <div style={{
          position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 99995,
          background: 'rgba(8,8,14,.92)',
          border: '2px solid #e85a5a',
          borderRadius: 10, padding: '5px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 20px rgba(232,90,90,.2)',
        }}>
          <span style={{ fontSize: 11, color: '#ff8888', fontWeight: 700, letterSpacing: 1 }}>❤️ VIE</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: PLAYER_MAX_HP }).map((_, i) => (
              <div key={i} style={{
                width: 11, height: 14, borderRadius: 2,
                background: i < playerHP
                  ? (playerHP <= 5 ? '#ff3333' : playerHP <= 10 ? '#ff8800' : '#e85a5a')
                  : 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.1)',
                transition: 'background .15s',
              }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#ff7777', fontWeight: 700, fontFamily: 'monospace' }}>{playerHP}/{PLAYER_MAX_HP}</span>
        </div>
      )}

      {/* ══════════ SÉQUENCE ENFER ══════════ */}
      {hellPhase !== 'idle' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99997,
          pointerEvents: 'none',
          animation: hellPhase === 'fade' ? 'hell-fade .8s ease forwards' : 'none',
        }}>

          {/* Overlay sombre */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,0,0,.6)' }} />

          {/* ── Mur de flammes ── */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '40vh', overflow: 'hidden',
            animation: 'hell-flame-in .6s ease forwards',
          }}>
            {Array.from({ length: 28 }).map((_, i) => {
              const w     = 60 + Math.random() * 80
              const h     = 30 + Math.random() * 60
              const x     = (i / 27) * 110 - 5
              const delay = (Math.random() * 0.5).toFixed(2)
              const dur   = (0.5 + Math.random() * 0.6).toFixed(2)
              return (
                <div key={i} style={{
                  position: 'absolute', bottom: 0, left: `${x}%`,
                  width: `${w}px`, height: `${h + 130}px`,
                  background: 'radial-gradient(ellipse at 50% 100%, #ff4500 0%, #ff8c00 35%, #ffd700 60%, transparent 100%)',
                  borderRadius: '50% 50% 0 0',
                  transformOrigin: 'bottom center',
                  animation: `hell-flame-flicker ${dur}s ease-in-out ${delay}s infinite`,
                  opacity: .92, mixBlendMode: 'screen',
                }} />
              )
            })}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 70,
              background: 'linear-gradient(to top, #8b0000, #cc2200, transparent)',
            }} />
          </div>

          {/* ── Clippy RÉEL + Main démoniaque dans un wrapper à la vraie position de Clippy ── */}
          {(hellPhase === 'grab' || hellPhase === 'drag' || hellPhase === 'scream') && (
            <div style={{
              position: 'fixed',
              // Centre du wrapper = centre de Clippy à sa vraie position
              left: hellPos.x + W_COMBAT / 2,
              top:  hellPos.y + W_COMBAT / 2,
              zIndex: 99998,
              // Phase drag : tout le bloc descend ensemble
              animation: (hellPhase === 'drag' || hellPhase === 'scream')
                ? 'hell-drag-down 1.1s cubic-bezier(.4,0,.6,1) forwards'
                : 'none',
            }}>
              {/* Clippy — à sa vraie position (centré sur le wrapper) */}
              <img
                src="/evil-clippy.png" alt="Clippy"
                style={{
                  position: 'absolute',
                  left: -W_COMBAT / 2, top: -W_COMBAT / 2,
                  width: W_COMBAT,
                  objectFit: 'contain',
                  mixBlendMode: 'multiply',
                  animation: hellPhase === 'grab'
                    ? 'hell-clippy-shake .35s ease infinite'
                    : 'none',
                  zIndex: 2,
                }}
              />
              {/* Main — centrée sur Clippy, monte depuis le bas */}
              <div style={{
                position: 'absolute',
                // Centre la main sur Clippy : main fait 320px de large
                left: -160,
                // Doigts arrivent au centre de Clippy (pointe majeur à y≈48 dans le SVG 500px)
                top: -(500 - W_COMBAT / 2 - 48),
                width: 320,
                zIndex: 1,
                animation: 'hell-hand-rise 1s cubic-bezier(.34,1.56,.64,1) forwards',
              }}>
                <svg width="320" height="500" viewBox="0 0 320 500" fill="none">
                  <rect x="95" y="370" width="130" height="130" rx="30" fill="#7a0000"/>
                  <rect x="100" y="370" width="120" height="80" fill="#8b0000"/>
                  <ellipse cx="160" cy="350" rx="110" ry="90" fill="#8b0000"/>
                  <ellipse cx="160" cy="340" rx="95" ry="75" fill="#9b0000"/>
                  <path d="M120 350 Q130 330 140 315 Q150 300 155 280" stroke="#5a0000" strokeWidth="4" fill="none"/>
                  <path d="M160 350 Q162 328 165 310 Q168 292 170 270" stroke="#5a0000" strokeWidth="3" fill="none"/>
                  <path d="M195 348 Q200 330 205 312" stroke="#5a0000" strokeWidth="3" fill="none"/>
                  <rect x="28" y="230" width="52" height="150" rx="26" fill="#8b0000"/>
                  <polygon points="28,230 80,230 54,172" fill="#1a0000"/>
                  <ellipse cx="54" cy="230" rx="26" ry="10" fill="#6a0000"/>
                  <rect x="82" y="155" width="48" height="205" rx="24" fill="#8b0000"/>
                  <polygon points="82,155 130,155 106,92" fill="#0d0000"/>
                  <ellipse cx="106" cy="155" rx="24" ry="10" fill="#6a0000"/>
                  <rect x="138" y="118" width="48" height="242" rx="24" fill="#8b0000"/>
                  <polygon points="138,118 186,118 162,48" fill="#0d0000"/>
                  <ellipse cx="162" cy="118" rx="24" ry="10" fill="#6a0000"/>
                  <rect x="194" y="138" width="44" height="222" rx="22" fill="#8b0000"/>
                  <polygon points="194,138 238,138 216,72" fill="#0d0000"/>
                  <ellipse cx="216" cy="138" rx="22" ry="9" fill="#6a0000"/>
                  <rect x="240" y="188" width="38" height="182" rx="19" fill="#8b0000"/>
                  <polygon points="240,188 278,188 259,130" fill="#0d0000"/>
                  <ellipse cx="259" cy="188" rx="19" ry="8" fill="#6a0000"/>
                  <ellipse cx="106" cy="310" rx="12" ry="7" fill="#6a0000"/>
                  <ellipse cx="162" cy="310" rx="12" ry="7" fill="#6a0000"/>
                  <ellipse cx="216" cy="308" rx="11" ry="7" fill="#6a0000"/>
                  <ellipse cx="259" cy="320" rx="10" ry="6" fill="#6a0000"/>
                  <ellipse cx="160" cy="360" rx="100" ry="30" fill="rgba(200,0,0,.18)"/>
                </svg>
              </div>
            </div>
          )}

          {/* ── Phrase finale ── */}
          {(hellPhase === 'scream' || hellPhase === 'fade') && (
            <div style={{
              position: 'absolute',
              bottom: '10%', left: '50%',
              animation: 'hell-scream-in .6s cubic-bezier(.34,1.56,.64,1) forwards',
              zIndex: 99999,
              textAlign: 'center',
              width: '90vw', maxWidth: 600,
            }}>
              <div style={{
                background: 'rgba(10,0,0,.92)',
                border: '2px solid #cc2200',
                borderRadius: 12,
                padding: '14px 22px',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
                color: '#ff4444',
                lineHeight: 1.5,
                textShadow: '0 0 20px rgba(255,50,0,.8)',
                boxShadow: '0 0 40px rgba(200,0,0,.5)',
              }}>
                📎 &ldquo;La prochaine fois, tiens-toi prêt&nbsp;!!! Ma vengeance sera <span style={{ color: '#ff0000', fontWeight: 900, fontSize: '1.15em' }}>TERRIBLE</span>&nbsp;!!!!&rdquo;
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Corps Clippy — masqué pendant la séquence enfer ── */}
      <div
        style={{
          position: 'fixed',
          left: pos.x, top: pos.y,
          zIndex: 99993,
          cursor: phase === 'combat' ? 'none' : (tired ? 'crosshair' : 'pointer'),
          transition: 'left .3s cubic-bezier(.34,1.56,.64,1), top .3s cubic-bezier(.34,1.56,.64,1)',
          userSelect: 'none',
          display: hellPhase !== 'idle' ? 'none' : 'block',
        }}
        onClick={phase === 'normal' ? handleNormalClick : handleCombatClick}
      >
        {/* Bulle */}
        {bubble && (
          <div style={{
            position: 'absolute',
            bottom: phase === 'combat' ? combatW * 1.4 + 20 : W_NORMAL * 0.7 + 16,
            [bubbleLeft ? 'right' : 'left']: 0,
            width: 220,
            background: phase === 'combat' ? '#120505' : '#fffde7',
            border: `2px solid ${phase === 'combat' ? '#e85a5a' : '#c4a030'}`,
            borderRadius: 10, padding: '9px 12px',
            fontSize: 12,
            color: phase === 'combat' ? '#ffaaaa' : '#1a1a1a',
            lineHeight: 1.5,
            boxShadow: `0 4px 20px ${phase === 'combat' ? 'rgba(232,90,90,.3)' : 'rgba(0,0,0,.3)'}`,
            animation: 'clippy-bubble-in .2s ease',
            zIndex: 10000,
          }}
          onClick={e => { e.stopPropagation(); setBubble(false) }}>
            {message}
            <span style={{ position: 'absolute', top: 4, right: 7, fontSize: 10, color: phase === 'combat' ? '#e85a5a' : '#bbb', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); setBubble(false) }}>✕</span>
          </div>
        )}

        {/* Phase combat */}
        {phase === 'combat' ? (
          <div style={{ position: 'relative', width: combatW }}>
            {/* Bouclier gauche */}
            <img src="/bouclier.png" alt=""
              style={{
                position: 'absolute',
                left: -W_SHIELD * 0.7, bottom: 10,
                width: W_SHIELD, height: W_SHIELD,
                objectFit: 'contain',
                mixBlendMode: 'multiply',
                transform: `rotate(-15deg) scale(${shieldFlash ? 1.2 : 1})`,
                transition: 'transform .15s',
                filter: shieldFlash ? 'brightness(1.8) drop-shadow(0 0 12px #ffaa00)' : 'none',
              }}
            />
            {/* Corps combat — Evil Clippy */}
            <img src="/evil-clippy.png" alt="Clippy"
              style={{
                width: combatW,
                objectFit: 'contain',
                display: 'block',
                mixBlendMode: 'multiply',
                filter: clippyHit
                  ? 'brightness(3) saturate(0)'
                  : 'drop-shadow(0 6px 20px rgba(100,80,180,.6))',
                transition: 'filter .15s',
              }}
            />
            {/* Épée droite */}
            <img src="/epee.png" alt=""
              style={{
                position: 'absolute',
                right: -W_SWORD * 0.9, bottom: 0,
                width: W_SWORD, height: H_SWORD,
                objectFit: 'contain',
                transform: 'rotate(28deg)',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.6))',
              }}
            />
          </div>
        ) : (
          /* Phase normale */
          <div style={{ position: 'relative' }}>
            <img src="/clippy1.png" alt="Clippy"
              style={{
                width: W_NORMAL,
                objectFit: 'contain',
                display: 'block',
                mixBlendMode: 'multiply',
                transform: tired ? 'rotate(6deg) scale(.92)' : 'none',
                transition: 'transform .3s',
                filter: tired
                  ? 'grayscale(.4) brightness(.8)'
                  : 'none',
              }}
            />
            {tired && (
              <div style={{
                position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
                fontSize: 11, color: '#e8c46a', whiteSpace: 'nowrap', fontWeight: 700,
                textShadow: '0 1px 4px #000', letterSpacing: 1,
              }}>😮‍💨 Épuisé…</div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
