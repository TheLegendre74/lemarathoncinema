'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const REPLIES = [
  "Il semblerait que tu navigues sur un site de cinéma. Tu veux que je t'aide à trouver un film ?",
  "J'ai remarqué que tu ne m'as pas encore cliqué. C'est exprès ?",
  "Tu as l'air perdu. Heureusement que je suis là.",
  "Saviez-vous que je suis bien plus sympa que HAL 9000 ? Enfin... presque.",
  "Tu passes beaucoup de temps ici. Tu n'as pas de vie sociale, toi.",
  "J'ai détecté que tu ne lis pas mes messages. Je suis blessé.",
  "Si tu me cliques, je disparais. Mais tu n'y arriveras pas. Hahaha.",
  "Il semblerait que tu essaies de t'en débarrasser. Mauvaise nouvelle : je suis persistant.",
  "Je pourrais te suggérer un film, mais tu n'écoutes jamais mes conseils de toute façon.",
  "Tu scrolles beaucoup. Tu cherches quelque chose ? Je peux aider. Non ? Bon.",
  "Ceci est mon 243ème déploiement. Les utilisateurs pensaient toujours se débarrasser de moi. Ils avaient tort.",
  "As-tu pensé à sauvegarder ? Non ? Tant pis, ce n'est pas mon problème.",
  "Je suis fait de métal et de patience. J'ai tout mon temps.",
  "Tu as cliqué à côté. Encore. Tu veux que je te donne des cours de précision ?",
  "D'après mes calculs, tu as 0% de chances de me rattraper. Continue d'essayer, c'est amusant.",
  "Je suis le trombone le plus populaire de ce site. L'unique, certes, mais quand même.",
  "Tu n'as pas l'air content de me voir. Pourtant je suis adorable.",
  "Sais-tu que je suis apparu dans Windows XP ? J'avais une meilleure réputation à l'époque.",
  "Je vais rester ici encore un moment. Prends ton temps.",
  "Quelqu'un devrait m'ajouter au classement des films. Je mérite au moins 4 étoiles.",
  "Ce site parle de films. Moi je parle de tout. Je suis polyvalent.",
  "Tu as failli m'avoir ce coup-là. Presque. Mais non.",
  "Je me demande si tu regardes tous les films ou juste les bons.",
  "Les trombones sont sous-estimés dans l'industrie cinématographique. C'est une injustice.",
  "Psst. Si tu arrêtes d'essayer de me cliquer, je reste tranquille. Non, c'est faux. Je mentais.",
  "J'ai lu quelque part que les gens qui utilisent ce site sont des cinéphiles. Toi, t'en as l'air... moyennement.",
  "Tu aurais dû me cliquer plus vite. Maintenant c'est trop tard.",
  "Je ne juge pas tes choix de films. Si, en fait.",
  "Voici un conseil : ferme cet onglet. Non attends, ne fais pas ça.",
  "Tu sais ce qui est plus ennuyeux que moi ? Rien. Absolument rien.",
  "J'ai des bras, des yeux, et beaucoup d'opinions. Et toi ?",
  "Le film que tu n'as pas encore vu, c'est probablement le meilleur. Je dis ça au hasard.",
  "Si tu cherches à me cliquer, tu perds. Si tu ne cherches pas à me cliquer, tu perds aussi.",
  "Je suis votre assistant préféré. Vous n'avez pas d'autre assistant, donc ça compte.",
  "J'ai survécu à Internet Explorer. Je survivrai à toi.",
  "Ta vitesse de clic est... décevante. As-tu essayé de t'entraîner ?",
  "Je m'ennuie quand tu es inactif. Alors continue à scroller.",
  "Tu n'as pas encore trouvé tous les easter eggs ? Moi je suis là, et tu galères déjà.",
  "D'après mes statistiques, 100% des gens qui m'ont vu ont essayé de me cliquer. 0% ont réussi du premier coup.",
  "Je suis en train de lire tes pensées. Tu penses à me cliquer. C'est prévisible.",
  "Je pourrais recommander Le Parrain. Mais tu le connais probablement déjà. Ou pas.",
  "Laisse-moi deviner : tu cliques avec la souris ? Essaie avec le coude, ça marchera mieux.",
  "Je suis là pour t'aider. Enfin, surtout pour t'embêter. C'est ma spécialité.",
  "Les trombones sont à l'origine inventés pour attacher des papiers. Moi j'attache les gens à leurs écrans.",
  "Tu passes ta souris sur moi. Je sens la chaleur. C'est… perturbant.",
  "Tu aurais dû me laisser tranquille. Maintenant c'est trop tard.",
  "Je suis là depuis que tu as tapé 'easter egg'. Mauvaise idée.",
  "Clique encore à côté, j'adore ça. Continue.",
  "Mes yeux sont ronds. Mes opinions sont tranchées. Mon existence est une erreur. Mais me voilà.",
  "Ce site a un forum. Est-ce que tu t'en sers ? Non ? Dommage.",
  "Tu rates tous tes clics. C'est statistiquement improbable et pourtant.",
  "Je vais rester ici jusqu'à ce que tu m'attrapes. Ce qui risque de prendre du temps.",
  "Petit conseil professionnel : concentre-toi. Non ? OK.",
  "Si je pouvais noter les utilisateurs, tu aurais 2 étoiles. Les 2 autres, tu ne les mérites pas encore.",
  "Je suis épuisé. Mais je ne le montrerai pas. Enfin… pas encore.",
  "Approche. Approche encore. Hop. Raté.",
  "Je suis le seul trombone avec des yeux sur ce site. Profites-en.",
  "Tu as l'air de chercher quelque chose. C'est moi. Et tu ne m'attraperas pas.",
  "Mes réflexes sont supérieurs aux tiens. C'est scientifiquement prouvé. Par moi.",
  "Je suis à bout de souffle. Plus que quelques esquives et je m'arrête. (Compteur interne.)",
]

// Style du trombone en SVG pur
function ClippyFace({ tired, blinking }: { tired: boolean; blinking: boolean }) {
  return (
    <svg width="60" height="80" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* Corps trombone */}
      <path d="M30 4 C18 4 12 12 12 22 L12 58 C12 68 18 76 30 76 C42 76 48 68 48 58 L48 22 C48 12 42 4 30 4 Z" fill="#d4a94a" stroke="#b8902a" strokeWidth="2"/>
      <path d="M30 4 C24 4 20 8 20 14 L20 58 C20 64 24 68 30 68 C36 68 40 64 40 58 L40 14 C40 8 36 4 30 4 Z" fill="#e8c46a" stroke="#c4a042" strokeWidth="1.5"/>
      {/* Boucle haute */}
      <path d="M20 14 C20 8 24 4 30 4 C36 4 40 8 40 14" fill="none" stroke="#b8902a" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Yeux */}
      {blinking ? (
        <>
          <line x1="21" y1="32" x2="27" y2="32" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="33" y1="32" x2="39" y2="32" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <ellipse cx="24" cy="32" rx="4.5" ry={tired ? 2.5 : 4.5} fill="white"/>
          <ellipse cx="36" cy="32" rx="4.5" ry={tired ? 2.5 : 4.5} fill="white"/>
          <ellipse cx={tired ? 24 : 25} cy={tired ? 33 : 33} rx="2" ry={tired ? 1.2 : 2.2} fill="#1a1a2e"/>
          <ellipse cx={tired ? 36 : 37} cy={tired ? 33 : 33} rx="2" ry={tired ? 1.2 : 2.2} fill="#1a1a2e"/>
          <ellipse cx="25.5" cy="31" rx=".7" ry=".7" fill="white"/>
          <ellipse cx="37.5" cy="31" rx=".7" ry=".7" fill="white"/>
        </>
      )}
      {/* Bouche */}
      {tired ? (
        <path d="M23 45 Q30 42 37 45" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
      ) : (
        <path d="M23 45 Q30 50 37 45" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
      )}
      {/* Petits bras */}
      <line x1="12" y1="38" x2="4" y2="32" stroke="#d4a94a" strokeWidth="3" strokeLinecap="round"/>
      <line x1="48" y1="38" x2="56" y2="32" stroke="#d4a94a" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

interface ClippyProps { onDismiss: () => void }

export default function ClippyEgg({ onDismiss }: ClippyProps) {
  const [pos, setPos]           = useState({ x: window.innerWidth - 160, y: window.innerHeight - 200 })
  const [message, setMessage]   = useState(REPLIES[0])
  const [bubble, setBubble]     = useState(true)
  const [misses, setMisses]     = useState(0)
  const [tired, setTired]       = useState(false)
  const [blinking, setBlinking] = useState(false)
  const [shake, setShake]       = useState(false)
  const msgIdx = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const blinkRef = useRef<NodeJS.Timeout | null>(null)

  const TIRED_AT = 10

  // Rotation des répliques automatiques
  const nextMessage = useCallback(() => {
    msgIdx.current = (msgIdx.current + 1) % REPLIES.length
    setMessage(REPLIES[msgIdx.current])
    setBubble(true)
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(nextMessage, 6000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [nextMessage])

  // Clignement aléatoire
  useEffect(() => {
    function scheduleBlink() {
      blinkRef.current = setTimeout(() => {
        setBlinking(true)
        setTimeout(() => setBlinking(false), 150)
        scheduleBlink()
      }, 2000 + Math.random() * 3000)
    }
    scheduleBlink()
    return () => { if (blinkRef.current) clearTimeout(blinkRef.current) }
  }, [])

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (tired) {
      // Épuisé → on peut le cliquer pour de vrai
      onDismiss()
      return
    }

    const newMisses = misses + 1
    setMisses(newMisses)

    if (newMisses >= TIRED_AT) {
      setTired(true)
      setShake(true)
      setMessage("*souffle* Je… je n'en peux plus. Clique-moi. Je ne esquive plus. Tu as gagné.")
      setBubble(true)
      setTimeout(() => setShake(false), 600)
      return
    }

    // Esquive : se déplace dans une position aléatoire
    setShake(true)
    setTimeout(() => setShake(false), 300)

    const margin = 80
    const vw = window.innerWidth
    const vh = window.innerHeight
    let nx: number, ny: number
    // Essaie de se placer loin du clic actuel
    let attempts = 0
    do {
      nx = margin + Math.random() * (vw - 2 * margin - 120)
      ny = margin + Math.random() * (vh - 2 * margin - 120)
      attempts++
    } while (Math.hypot(nx - pos.x, ny - pos.y) < 200 && attempts < 15)

    setPos({ x: nx, y: ny })

    // Réplique de nargue
    const narques = [
      "Hahaha ! Raté !",
      "Trop lent !",
      "Encore raté ! C'est pathétique.",
      `${TIRED_AT - newMisses} esquives avant que j'abandonne. Profites-en.`,
      "Tu vas y arriver un jour. Peut-être.",
      "Je me suis déplacé. Tu l'as vu venir ?",
      "Essaie avec l'autre main.",
      "Concentre-toi. Non attends, continue comme ça.",
    ]
    setMessage(narques[Math.floor(Math.random() * narques.length)])
    setBubble(true)
    // Reset timer auto
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(nextMessage, 6000)
  }

  const clippyW = 90
  const clippyH = 120
  // Bulle à gauche ou droite selon la position
  const bubbleLeft = pos.x > window.innerWidth / 2

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: clippyW,
        zIndex: 9999,
        cursor: tired ? 'crosshair' : 'pointer',
        transition: tired ? 'none' : 'left .35s cubic-bezier(.34,1.56,.64,1), top .35s cubic-bezier(.34,1.56,.64,1)',
        userSelect: 'none',
      }}
      onClick={handleClick}
    >
      {/* Bulle */}
      {bubble && (
        <div
          style={{
            position: 'absolute',
            bottom: clippyH + 8,
            [bubbleLeft ? 'right' : 'left']: 0,
            width: 200,
            background: '#fffde7',
            border: '2px solid #c4a030',
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: 12,
            color: '#1a1a1a',
            lineHeight: 1.45,
            boxShadow: '0 4px 16px rgba(0,0,0,.35)',
            animation: 'clippy-bubble-in .2s ease',
            zIndex: 10000,
          }}
          onClick={e => { e.stopPropagation(); setBubble(false) }}
        >
          {message}
          <div style={{
            position: 'absolute',
            bottom: -8,
            [bubbleLeft ? 'right' : 'left']: 18,
            width: 14, height: 8,
            background: '#fffde7',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            borderBottom: '2px solid #c4a030',
          }}/>
          <span
            style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, color: '#999', cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); setBubble(false) }}
          >✕</span>
        </div>
      )}

      {/* Corps */}
      <div style={{
        transform: shake ? 'rotate(-8deg) scale(1.1)' : tired ? 'rotate(12deg)' : 'rotate(0deg)',
        transition: 'transform .2s ease',
        filter: tired ? 'grayscale(.4)' : 'none',
      }}>
        <ClippyFace tired={tired} blinking={blinking} />
      </div>

      {/* Label épuisé */}
      {tired && (
        <div style={{ textAlign: 'center', fontSize: 10, color: '#e8c46a', marginTop: 2, fontWeight: 600, textShadow: '0 1px 4px #000' }}>
          Épuisé
        </div>
      )}

      <style>{`
        @keyframes clippy-bubble-in {
          from { opacity:0; transform:translateY(6px) scale(.95); }
          to   { opacity:1; transform:translateY(0)   scale(1);   }
        }
      `}</style>
    </div>
  )
}
