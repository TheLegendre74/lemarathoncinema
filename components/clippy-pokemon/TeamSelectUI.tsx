'use client'
import { useState, useMemo } from 'react'
import type { CardData, GenreType, Rarity, MoveDisplay, MoveEngine } from './types'
import { TYPE_COLORS_CSS, TYPE_LABELS, ALL_TYPES } from './config/types.config'
import { BALANCE } from './config/balance.config'
import { STAT_LABELS } from './types'

// ── Types locaux ──

interface TeamMember {
  card: CardData
  equippedNames: string[]  // 4 attaques choisies
}

interface Props {
  allCards: CardData[]
  onConfirm: (members: TeamMember[]) => void
}

// ── Composants UI ──

function TypeBadge({ type }: { type: GenreType }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold',
      background: TYPE_COLORS_CSS[type], color: type === 'Comédie' ? '#333' : '#fff',
      whiteSpace: 'nowrap',
    }}>
      {TYPE_LABELS[type]}
    </span>
  )
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const colors: Record<Rarity, string> = {
    'LÉGENDAIRE': '#FFD700',
    'ÉPIQUE': '#C77DFF',
    'DUPONTEL': '#FF6B35',
    'RARE': '#00BFA5',
  }
  return (
    <span style={{
      padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 'bold',
      background: colors[rarity] + '33', color: colors[rarity], border: `1px solid ${colors[rarity]}55`,
    }}>
      {rarity}
    </span>
  )
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct > 70 ? '#4CAF50' : pct > 40 ? '#FFD700' : '#ff4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <span style={{ width: 60, color: '#aaa', textAlign: 'right' }}>{label}</span>
      <span style={{ width: 30, fontWeight: 'bold', color }}>{value}</span>
      <div style={{ flex: 1, height: 6, background: '#1a1a2e', borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function MoveLine({ move, moveEngine, isEquipped, onToggle }: {
  move: MoveDisplay; moveEngine: MoveEngine; isEquipped: boolean; onToggle: () => void
}) {
  const catIcons: Record<string, string> = { phys: '⚔️', spe: '✦', status: '✨' }
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
        background: isEquipped ? '#1a3a5a' : '#111828',
        border: `1px solid ${isEquipped ? '#4488cc' : '#333'}`,
        borderRadius: 4, cursor: 'pointer', fontSize: 12,
        opacity: isEquipped ? 1 : 0.65,
      }}
    >
      <span style={{ fontSize: 14 }}>{isEquipped ? '☑' : '☐'}</span>
      <span>{catIcons[moveEngine.cat] ?? '?'}</span>
      {moveEngine.type !== '—' && <TypeBadge type={moveEngine.type as GenreType} />}
      <span style={{ fontWeight: 'bold', flex: 1 }}>{move.name}</span>
      {moveEngine.pow && <span style={{ color: '#ff8866' }}>Pui:{moveEngine.pow}</span>}
      <span style={{ color: '#88aacc' }}>Pré:{moveEngine.acc ?? 100}</span>
      <span style={{ color: '#aaa' }}>PP:{moveEngine.pp >= 99 ? '15' : moveEngine.pp}</span>
    </div>
  )
}

// ── Fiche détail ──

function FilmDetail({ card, equipped, onEquippedChange, onClose }: {
  card: CardData; equipped: string[]; onEquippedChange: (names: string[]) => void; onClose: () => void
}) {
  const toggleMove = (name: string) => {
    if (equipped.includes(name)) {
      onEquippedChange(equipped.filter(n => n !== name))
    } else if (equipped.length < 4) {
      onEquippedChange([...equipped, name])
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#0f1525', border: '1px solid #333', borderRadius: 12,
        padding: 24, maxWidth: 520, width: '95%', maxHeight: '85vh', overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, color: '#fff' }}>{card.name}</h3>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {card.types.map(t => <TypeBadge key={t} type={t} />)}
              <RarityBadge rarity={card.rarity} />
            </div>
          </div>
          <div style={{ textAlign: 'right', color: '#aaa', fontSize: 12 }}>
            <div>BST: {card.bst}</div>
            <div>{card.year}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: 16 }}>
          <StatBar label="Postérité" value={card.stats.Post} max={160} />
          {(['Spec', 'Tec', 'Sce', 'Prof', 'Ryt'] as const).map(s => (
            <StatBar key={s} label={STAT_LABELS[s]} value={card.stats[s]} max={160} />
          ))}
        </div>

        {/* Passif */}
        <div style={{
          padding: '8px 12px', background: '#1a1a2e', borderRadius: 6,
          marginBottom: 16, fontSize: 12,
        }}>
          <span style={{ color: '#C77DFF', fontWeight: 'bold' }}>Passif: {card.passive.name}</span>
          <span style={{ color: '#aaa' }}> — {card.passive.effet}</span>
        </div>

        {/* Attaques */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
              Attaques ({equipped.length}/4 équipées)
            </span>
            {equipped.length !== 4 && (
              <span style={{ color: '#ff6644', fontSize: 12 }}>Sélectionnez exactement 4 attaques</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {card.moves_engine.map((me, i) => (
              <MoveLine
                key={me.name}
                move={card.moves[i]}
                moveEngine={me}
                isEquipped={equipped.includes(me.name)}
                onToggle={() => toggleMove(me.name)}
              />
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '10px', background: equipped.length === 4 ? '#2a6a4a' : '#444',
            color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          {equipped.length === 4 ? 'Confirmer les attaques' : 'Fermer'}
        </button>
      </div>
    </div>
  )
}

// ── Composant principal ──

export default function TeamSelectUI({ allCards, onConfirm }: Props) {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<GenreType | ''>('')
  const [filterRarity, setFilterRarity] = useState<Rarity | ''>('')
  const [detailCard, setDetailCard] = useState<CardData | null>(null)
  const [equippedMap, setEquippedMap] = useState<Record<number, string[]>>({})

  const legendCount = team.filter(m => m.card.rarity === 'LÉGENDAIRE').length
  const rareCount = team.filter(m => m.card.rarity === 'RARE').length
  const selectedNums = new Set(team.map(m => m.card.num))

  const filtered = useMemo(() => {
    return allCards.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterType && !c.types.includes(filterType)) return false
      if (filterRarity && c.rarity !== filterRarity) return false
      return true
    }).sort((a, b) => b.bst - a.bst)
  }, [allCards, search, filterType, filterRarity])

  const toggleCard = (card: CardData) => {
    if (selectedNums.has(card.num)) {
      setTeam(prev => prev.filter(m => m.card.num !== card.num))
    } else {
      if (team.length >= BALANCE.TEAM_SIZE) return
      if (card.rarity === 'LÉGENDAIRE' && legendCount >= BALANCE.CAP_LEGENDAIRE) return
      const eq = equippedMap[card.num] ?? [...card.equipped]
      setTeam(prev => [...prev, { card, equippedNames: eq }])
    }
  }

  const openDetail = (card: CardData) => {
    if (!equippedMap[card.num]) {
      setEquippedMap(prev => ({ ...prev, [card.num]: [...card.equipped] }))
    }
    setDetailCard(card)
  }

  const updateEquipped = (num: number, names: string[]) => {
    setEquippedMap(prev => ({ ...prev, [num]: names }))
    setTeam(prev => prev.map(m => m.card.num === num ? { ...m, equippedNames: names } : m))
  }

  const canConfirm = team.length >= BALANCE.PICK_SIZE && team.every(m => m.equippedNames.length === 4)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99991, background: '#0f1525',
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace', color: '#fff',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Composez votre équipe</h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#aaa' }}>
          {team.length}/{BALANCE.TEAM_SIZE} films
          {legendCount > 0 && <span style={{ color: '#FFD700' }}> — {legendCount}/{BALANCE.CAP_LEGENDAIRE} Légendaires</span>}
          {rareCount >= 2 && <span style={{ color: '#00BFA5' }}> — Synergie Outsider active ({rareCount} Rares)</span>}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <input
          type="text"
          placeholder="Rechercher un film..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '6px 12px', background: '#111828', border: '1px solid #333',
            borderRadius: 6, color: '#fff', fontSize: 13, width: 200,
          }}
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as GenreType | '')}
          style={{ padding: '6px', background: '#111828', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 12 }}
        >
          <option value="">Tous les types</option>
          {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select
          value={filterRarity}
          onChange={e => setFilterRarity(e.target.value as Rarity | '')}
          style={{ padding: '6px', background: '#111828', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 12 }}
        >
          <option value="">Toutes raretés</option>
          <option value="LÉGENDAIRE">Légendaire</option>
          <option value="ÉPIQUE">Épique</option>
          <option value="DUPONTEL">Dupontel</option>
          <option value="RARE">Rare</option>
        </select>
      </div>

      {/* Team summary bar */}
      {team.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, padding: '6px 16px', overflowX: 'auto',
          background: '#111828', borderTop: '1px solid #222', borderBottom: '1px solid #222',
        }}>
          {team.map(m => (
            <div key={m.card.num} style={{
              padding: '4px 10px', background: '#1a3050', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap',
              cursor: 'pointer',
            }} onClick={() => openDetail(m.card)}>
              <span>{m.card.name}</span>
              <span style={{ color: '#ff4444', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); toggleCard(m.card) }}>✕</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}>
        <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>{filtered.length} films</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 6, maxWidth: 1100, margin: '0 auto',
        }}>
          {filtered.map(card => {
            const isSel = selectedNums.has(card.num)
            const isLegBlocked = !isSel && card.rarity === 'LÉGENDAIRE' && legendCount >= BALANCE.CAP_LEGENDAIRE
            const isFull = !isSel && team.length >= BALANCE.TEAM_SIZE
            const blocked = isLegBlocked || isFull

            return (
              <div key={card.num} style={{
                padding: '8px 12px', background: isSel ? '#1a3050' : '#111828',
                border: `2px solid ${isSel ? TYPE_COLORS_CSS[card.types[0]] : '#222'}`,
                borderRadius: 8, cursor: blocked ? 'not-allowed' : 'pointer',
                opacity: blocked ? 0.35 : 1,
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => !blocked && toggleCard(card)}>
                  <div style={{ fontSize: 14, fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isSel ? '✓ ' : ''}{card.name}
                  </div>
                  {card.types.map(t => <TypeBadge key={t} type={t} />)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11 }}>
                  <RarityBadge rarity={card.rarity} />
                  <span style={{ color: '#888' }}>BST {card.bst}</span>
                  <span style={{ color: '#666' }}>{card.year}</span>
                  {isLegBlocked && <span style={{ color: '#ff4444', fontSize: 10 }}>Max 3 Légendaires</span>}
                  <span
                    style={{ marginLeft: 'auto', color: '#4488cc', cursor: 'pointer', fontSize: 11 }}
                    onClick={e => { e.stopPropagation(); openDetail(card) }}
                  >
                    Fiche ▸
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm button */}
      <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid #222' }}>
        <button
          disabled={!canConfirm}
          onClick={() => onConfirm(team)}
          style={{
            padding: '12px 48px', fontSize: 16, fontWeight: 'bold',
            background: canConfirm ? '#e50914' : '#333',
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: canConfirm ? 'pointer' : 'not-allowed',
          }}
        >
          {team.length < BALANCE.PICK_SIZE
            ? `Sélectionnez au moins ${BALANCE.PICK_SIZE} films`
            : !team.every(m => m.equippedNames.length === 4)
              ? 'Équipez 4 attaques par film (cliquez "Fiche")'
              : `Combattre avec ${team.length} films !`}
        </button>
      </div>

      {/* Detail modal */}
      {detailCard && (
        <FilmDetail
          card={detailCard}
          equipped={equippedMap[detailCard.num] ?? [...detailCard.equipped]}
          onEquippedChange={names => updateEquipped(detailCard.num, names)}
          onClose={() => setDetailCard(null)}
        />
      )}
    </div>
  )
}

export type { TeamMember }
