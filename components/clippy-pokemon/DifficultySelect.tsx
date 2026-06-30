'use client'
import type { Difficulty } from './clippyBoss'

interface Props {
  archetype: string
  meta: string
  teamNames: string[]
  onSelect: (difficulty: Difficulty) => void
  onBack: () => void
}

const DIFFICULTIES: { key: Difficulty; label: string; desc: string; color: string }[] = [
  { key: 'facile', label: 'Facile', desc: 'Équipe Clippy sans Légendaires ni Climax. Pool de films simplifié.', color: '#4CAF50' },
  { key: 'moyen', label: 'Moyen', desc: 'Équipes archétypes complètes. Climax activé.', color: '#FF9800' },
  { key: 'difficile', label: 'Difficile', desc: 'Équipes optimisées + avantage stats. Climax activé.', color: '#F44336' },
]

export default function DifficultySelect({ archetype, meta, teamNames, onSelect, onBack }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99991, background: '#0f1525',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', color: '#fff',
    }}>
      <h2 style={{ margin: 0, fontSize: 24 }}>Défi Clippy</h2>
      <p style={{ color: '#aaa', margin: '8px 0 4px', fontSize: 14 }}>
        Archétype actif : <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{archetype}</span>
      </p>
      <p style={{ color: '#888', margin: '0 0 16px', fontSize: 12 }}>{meta}</p>

      {/* Scouting — Clippy's team */}
      <div style={{
        background: '#111828', borderRadius: 8, padding: '12px 20px', marginBottom: 24,
        border: '1px solid #333', maxWidth: 400, width: '90%',
      }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Équipe de Clippy (scouting) :</div>
        {teamNames.map((name, i) => (
          <div key={i} style={{ fontSize: 13, padding: '2px 0', color: '#ccc' }}>
            {i + 1}. {name}
          </div>
        ))}
      </div>

      {/* Difficulty buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {DIFFICULTIES.map(d => (
          <button
            key={d.key}
            onClick={() => onSelect(d.key)}
            style={{
              padding: '16px 24px', background: '#1a2535', border: `2px solid ${d.color}`,
              borderRadius: 10, cursor: 'pointer', width: 200,
              textAlign: 'center', transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = d.color + '33')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a2535')}
          >
            <div style={{ fontSize: 18, fontWeight: 'bold', color: d.color }}>{d.label}</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>{d.desc}</div>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        style={{
          marginTop: 24, padding: '8px 24px', background: '#333',
          color: '#aaa', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}
      >
        Retour
      </button>
    </div>
  )
}
