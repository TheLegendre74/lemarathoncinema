'use client';
import type { CardData, ClimaxData } from '@/lib/battle/types';
import TypeBadge from './TypeBadge';
import RarityBadge from './RarityBadge';
import StatBar from './StatBar';
import type { GenreType } from '@/lib/battle/types';
import { WEATHER_LABELS } from '@/lib/battle/weather';

interface Props {
  card: CardData;
  climax: ClimaxData | null;
  onClose: () => void;
}

export default function CardDetail({ card, climax, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-xl" style={{ color: 'var(--gold)' }}>
              {card.name}
              {climax && <span className="ml-2">🎬</span>}
            </h2>
            <span className="text-sm" style={{ color: 'var(--text3)' }}>{card.year} — BST {card.bst}</span>
          </div>
          <button onClick={onClose} className="text-2xl" style={{ color: 'var(--text3)' }}>&times;</button>
        </div>

        {/* Types + Rareté */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {card.types.map(t => <TypeBadge key={t} type={t as GenreType} />)}
          <RarityBadge rarity={card.rarity} />
        </div>

        {/* Stats */}
        <div className="mb-4 space-y-1">
          {Object.entries(card.stats).map(([k, v]) => (
            <StatBar key={k} statKey={k} value={v} />
          ))}
        </div>

        {/* Passif */}
        <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text3)' }}>Passif</div>
          <div className="font-bold text-sm" style={{ color: 'var(--gold)' }}>{card.passive.name}</div>
          <div className="text-sm" style={{ color: 'var(--text2)' }}>{card.passive.effet}</div>
        </div>

        {/* Climax */}
        {climax && (
          <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(232,196,106,0.08)', border: '1px solid rgba(232,196,106,0.2)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--gold)' }}>🎬 Climax</div>
            <div className="text-sm" style={{ color: 'var(--text2)' }}>
              Météo : <strong>{WEATHER_LABELS[climax.affinite] ?? climax.affinite}</strong> — Stats : <strong>{climax.climax}</strong> — Rôle : {climax.role}
            </div>
          </div>
        )}

        {/* 6 Attaques */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Attaques</div>
          <div className="space-y-2">
            {card.moves.map((mv, i) => (
              <div key={i} className="p-2 rounded-lg" style={{ background: 'var(--bg3)' }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <TypeBadge type={mv.type as GenreType} small />
                  <span className="font-bold text-sm">{mv.name}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--text3)' }}>
                    {mv.cat === 'status' ? 'Statut' : mv.cat === 'phys' ? 'Physique' : 'Spécial'}
                    {mv.pow != null && ` — ${mv.pow}`}
                    {mv.acc != null && mv.acc < 100 && ` — ${mv.acc}%`}
                  </span>
                </div>
                {mv.full && <div className="text-xs italic" style={{ color: 'var(--text2)' }}>{mv.full}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
