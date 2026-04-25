export type DanceNote = {
  time: number        // ms depuis début de la musique
  direction: 'up' | 'down' | 'left' | 'right'
}

// ── Sly Cooper 2 — Nightclub Theme — 110 BPM ──────────────────────────────
// 1 beat = 545ms | 1 mesure (4 beats) = 2180ms
// Durée totale : ~90 secondes
const B = 545
const b = (n: number) => Math.round(n * B)

type Dir = DanceNote['direction']
const row = (start: number, dirs: Dir[], gap = 1): DanceNote[] =>
  dirs.map((direction, i): DanceNote => ({ time: b(start + i * gap), direction }))
const n = (beat: number, direction: Dir, offset = 0): DanceNote =>
  ({ time: b(beat) + offset, direction })

export const DANCE_BEATMAP: DanceNote[] = [
  // ── INTRO (0–14s, beats 0–26) — très espacé, prise en main ──────────────
  ...row(4,  ['right'],      2),
  ...row(6,  ['left'],       2),
  ...row(8,  ['up'],         2),
  ...row(10, ['down'],       2),
  ...row(12, ['right'],      2),
  ...row(14, ['left'],       2),
  ...row(16, ['up'],         2),
  ...row(18, ['down'],       2),
  ...row(20, ['right', 'left'], 2),
  ...row(24, ['up',   'down'], 2),

  // ── GROOVE A (14–30s, beats 28–55) — 1 note par beat ─────────────────────
  ...row(28, ['left',  'right', 'up',   'down', 'right', 'left', 'down',  'up'  ]),
  ...row(36, ['right', 'left',  'up',   'down', 'left',  'right', 'up',   'down']),
  ...row(44, ['down',  'up',    'right', 'left', 'up',   'down',  'right', 'left']),

  // ── GROOVE B (30–48s, beats 56–88) — rythme plus dense ────────────────────
  ...row(52, ['right', 'left',  'up',   'down' ]),
  ...row(56, ['left',  'right', 'down', 'up',   'right', 'left', 'down',  'up'  ]),
  ...row(64, ['up',    'right', 'left', 'down', 'right', 'up',   'left',  'right']),
  ...row(72, ['down',  'left',  'right', 'up',  'left',  'down', 'right', 'up'  ]),

  // ── PEAK A (48–65s, beats 88–120) — séquences rapides ─────────────────────
  ...row(80, ['right', 'left', 'up', 'down', 'right', 'left', 'up', 'down', 'right', 'left']),
  ...row(90, ['up', 'down', 'right', 'left', 'down', 'up', 'right', 'left', 'up', 'down' ]),
  ...row(100, ['right', 'left', 'down', 'up', 'right', 'left', 'up', 'down']),

  // ── PEAK B (65–80s) — half-beats, alternances serrées ────────────────────
  ...row(108, ['right', 'left', 'up', 'down', 'right', 'left']),
  n(114, 'down',  Math.round(B * 0.5)),
  n(115, 'right'),
  n(115, 'left',  Math.round(B * 0.5)),
  n(116, 'up'),
  n(117, 'down'),
  n(118, 'right'),
  n(118, 'left',  Math.round(B * 0.5)),
  n(119, 'up'),
  n(120, 'down'),
  n(121, 'right'),
  n(121, 'left',  Math.round(B * 0.5)),
  n(122, 'up'),
  n(123, 'down'),
  n(124, 'right'),
  n(125, 'left'),

  // ── FINALE (80–90s, beats 126–165) — densité max, jouable ──────────────
  ...row(126, [
    'up',    'down',  'right', 'left', 'down',  'up',
    'right', 'left',  'up',   'down', 'right', 'left',
    'down',  'up',   'right', 'left'
  ]),
  n(142, 'down',  Math.round(B * 0.5)),
  n(143, 'right'),
  n(143, 'left',  Math.round(B * 0.5)),
  n(144, 'up'),
  n(145, 'down'),
  n(146, 'right'),
  n(146, 'left',  Math.round(B * 0.5)),
  n(147, 'up'),
  n(148, 'down'),
  n(149, 'right'),
  n(150, 'left'),
  n(151, 'up'),
  n(152, 'down'),
  n(153, 'right'),
  n(154, 'left'),
  n(155, 'up'),
  n(160, 'right'), // note finale ~87s
].sort((a, b) => a.time - b.time)
