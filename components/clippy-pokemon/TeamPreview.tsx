'use client'
import { useState } from 'react'
import type { FilmCombatant, GenreType } from './types'
import { TYPE_COLORS_CSS, TYPE_LABELS } from './config/types.config'
import { BALANCE } from './config/balance.config'

interface Props {
  playerTeam: FilmCombatant[]
  clippyTeam: FilmCombatant[]
  archetype: string
  onConfirm: (pickedIndices: number[]) => void
}

export default function TeamPreview({ playerTeam, clippyTeam, archetype, onConfirm }: Props) {
  const [picked, setPicked] = useState<Set<number>>(new Set())

  const toggle = (idx: number) => {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else if (next.size < BALANCE.PICK_SIZE) next.add(idx)
      return next
    })
  }

  const canConfirm = picked.size === BALANCE.PICK_SIZE

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99991, background: '#0f1525',
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace', color: '#fff',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>Team Preview</h2>
      <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 24px' }}>
        Choisissez {BALANCE.PICK_SIZE} films parmi vos {playerTeam.length} pour le combat
      </p>

      <div style={{ display: 'flex', gap: 48, maxWidth: 900, width: '100%', justifyContent: 'center' }}>
        {/* Player side */}
        <div style={{ flex: 1, maxWidth: 400 }}>
          <h3 style={{ fontSize: 16, margin: '0 0 12px', textAlign: 'center' }}>Votre équipe</h3>
          {playerTeam.map((mon, i) => {
            const sel = picked.has(i)
            const blocked = !sel && picked.size >= BALANCE.PICK_SIZE
            return (
              <div
                key={mon.num}
                onClick={() => !blocked && toggle(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', marginBottom: 6,
                  background: sel ? '#1a3050' : '#111828',
                  border: `2px solid ${sel ? '#4488cc' : '#222'}`,
                  borderRadius: 8,
                  cursor: blocked ? 'not-allowed' : 'pointer',
                  opacity: blocked ? 0.4 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ width: 22, textAlign: 'center', fontSize: 16 }}>{sel ? '✓' : '○'}</span>
                <span style={{ flex: 1, fontWeight: 'bold', fontSize: 14 }}>{mon.name}</span>
                <span style={{ display: 'flex', gap: 4 }}>
                  {mon.types.map(t => (
                    <span key={t} style={{
                      padding: '2px 6px', borderRadius: 3, fontSize: 10,
                      background: TYPE_COLORS_CSS[t], color: t === 'Comédie' ? '#333' : '#fff',
                    }}>
                      {TYPE_LABELS[t]}
                    </span>
                  ))}
                </span>
                {mon.mega && <span style={{ color: '#FFD700', fontSize: 11 }}>★</span>}
              </div>
            )
          })}
        </div>

        {/* Clippy side */}
        <div style={{ flex: 1, maxWidth: 400 }}>
          <h3 style={{ fontSize: 16, margin: '0 0 12px', textAlign: 'center', color: '#ff6644' }}>
            Clippy — {archetype}
          </h3>
          {clippyTeam.map(mon => (
            <div
              key={mon.num}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', marginBottom: 6,
                background: '#111828', border: '2px solid #333',
                borderRadius: 8,
              }}
            >
              <span style={{ flex: 1, fontWeight: 'bold', fontSize: 14 }}>{mon.name}</span>
              <span style={{ display: 'flex', gap: 4 }}>
                {mon.types.map(t => (
                  <span key={t} style={{
                    padding: '2px 6px', borderRadius: 3, fontSize: 10,
                    background: TYPE_COLORS_CSS[t], color: t === 'Comédie' ? '#333' : '#fff',
                  }}>
                    {TYPE_LABELS[t]}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        disabled={!canConfirm}
        onClick={() => onConfirm([...picked].sort((a, b) => a - b))}
        style={{
          marginTop: 24, padding: '14px 56px', fontSize: 16, fontWeight: 'bold',
          background: canConfirm ? '#e50914' : '#333',
          color: '#fff', border: 'none', borderRadius: 8,
          cursor: canConfirm ? 'pointer' : 'not-allowed',
        }}
      >
        {canConfirm ? `Lancer le combat (${picked.size}/${BALANCE.PICK_SIZE})` : `Choisissez ${BALANCE.PICK_SIZE - picked.size} film(s) de plus`}
      </button>
    </div>
  )
}
