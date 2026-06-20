'use client'
import { useState } from 'react'
import type { FilmCombatant, FilmType } from './types'
import { TYPE_COLORS_CSS, TYPE_NAMES } from './config/types.config'
import { BALANCE } from './config/balance.config'

interface Props {
  allFilms: FilmCombatant[]
  onConfirm: (team: FilmCombatant[]) => void
}

function TypeBadge({ type }: { type: FilmType }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold',
      background: TYPE_COLORS_CSS[type], color: type === 'comedie' ? '#333' : '#fff',
    }}>
      {TYPE_NAMES[type]}
    </span>
  )
}

export default function TeamSelectUI({ allFilms, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const max = BALANCE.TAILLE_EQUIPE
  const min = BALANCE.TAILLE_EQUIPE_MIN

  const toggle = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else if (next.size < max) next.add(idx)
      return next
    })
  }

  const confirm = () => {
    if (selected.size < min) return
    onConfirm(Array.from(selected).map(i => allFilms[i]))
  }

  const typeCounts: Record<string, number> = {}
  selected.forEach(i => {
    const f = allFilms[i]
    typeCounts[f.type1] = (typeCounts[f.type1] || 0) + 1
    if (f.type2) typeCounts[f.type2] = (typeCounts[f.type2] || 0) + 1
  })
  const uniqueTypes = Object.keys(typeCounts).length

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99991, background: '#0f1525', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', color: '#fff' }}>
      <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Composez votre équipe</h2>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#aaa' }}>
          {selected.size}/{max} films — {uniqueTypes} type{uniqueTypes > 1 ? 's' : ''} différent{uniqueTypes > 1 ? 's' : ''}
          {uniqueTypes < 4 && selected.size >= 3 && (
            <span style={{ color: '#ff8800' }}> — Diversifiez ! Clippy s&apos;adapte à vos types.</span>
          )}
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, maxWidth: 900, margin: '0 auto' }}>
          {allFilms.map((f, i) => {
            const isSel = selected.has(i)
            return (
              <div key={f.filmId} onClick={() => toggle(i)} style={{
                padding: '10px 14px', background: isSel ? '#1a3050' : '#111828',
                border: `2px solid ${isSel ? TYPE_COLORS_CSS[f.type1] : '#222'}`,
                borderRadius: 8, cursor: 'pointer',
                opacity: !isSel && selected.size >= max ? 0.4 : 1,
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isSel ? '✓ ' : ''}{f.titre}
                  </div>
                  <TypeBadge type={f.type1} />
                  {f.type2 && <TypeBadge type={f.type2} />}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  PV {f.stats.pvMax} | ATK {f.stats.atk} | DEF {f.stats.def}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: 16 }}>
        <button onClick={confirm} disabled={selected.size < min} style={{
          padding: '12px 40px', fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold',
          background: selected.size >= min ? '#cc3333' : '#333', color: '#fff',
          border: 'none', borderRadius: 8, cursor: selected.size >= min ? 'pointer' : 'not-allowed',
        }}>
          Commencer le combat ({selected.size}/{min}-{max})
        </button>
      </div>
    </div>
  )
}
