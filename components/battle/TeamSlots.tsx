'use client';
import type { CardData, ClimaxData, GenreType } from '@/lib/battle/types';
import TypeBadge from './TypeBadge';
import RarityBadge from './RarityBadge';
import { BATTLE_CONFIG } from '@/lib/battle/config';
import { TYPE_COLORS } from '@/lib/battle/type-chart';

interface Props {
  team: number[];
  cards: Record<number, CardData>;
  climaxMap: Map<number, ClimaxData>;
  climaxCarrier: number | null;
  onRemove: (num: number) => void;
  onSetClimax: (num: number) => void;
}

export default function TeamSlots({ team, cards, climaxMap, climaxCarrier, onRemove, onSetClimax }: Props) {
  const legendCount = team.filter(n => cards[n]?.rarity === 'LÉGENDAIRE').length;
  const rareCount = team.filter(n => cards[n]?.rarity === 'RARE').length;
  const outsiderActive = rareCount >= BATTLE_CONFIG.OUTSIDER_GATE;

  const slots = Array.from({ length: BATTLE_CONFIG.TEAM_SIZE }, (_, i) => team[i] ?? null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs">
        {/* Compteur Légendaires */}
        <span style={{ color: legendCount >= BATTLE_CONFIG.CAP_LEGENDAIRE ? 'var(--red)' : 'var(--gold)' }}>
          ★ {legendCount}/{BATTLE_CONFIG.CAP_LEGENDAIRE} Légendaires
        </span>

        {/* Indicateur Outsider */}
        <span style={{ color: outsiderActive ? 'var(--green)' : 'var(--text3)' }}>
          ⚔ {rareCount} Rares {outsiderActive ? '— Outsider actif !' : rareCount > 0 ? `(encore ${BATTLE_CONFIG.OUTSIDER_GATE - rareCount})` : ''}
        </span>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {slots.map((num, i) => {
          if (num == null) {
            return (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg3)', border: '2px dashed var(--border2)' }}
              >
                <span className="text-lg" style={{ color: 'var(--text3)' }}>+</span>
              </div>
            );
          }

          const card = cards[num];
          if (!card) return null;
          const mainColor = TYPE_COLORS[card.types[0] as GenreType] ?? '#666';
          const hasClimax = climaxMap.has(num);
          const isCarrier = climaxCarrier === num;

          return (
            <div
              key={num}
              className="rounded-xl p-2 relative"
              style={{
                background: mainColor + '22',
                border: isCarrier ? `2px solid var(--gold)` : `1px solid ${mainColor}55`,
              }}
            >
              <button
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center"
                style={{ background: 'var(--red)', color: '#fff' }}
                onClick={() => onRemove(num)}
              >
                ×
              </button>

              <div className="text-[10px] font-bold leading-tight truncate" style={{ color: 'var(--text)' }}>
                {card.name}
              </div>
              <div className="flex gap-0.5 mt-0.5 flex-wrap">
                {card.types.map(t => <TypeBadge key={t} type={t as GenreType} small />)}
              </div>
              <RarityBadge rarity={card.rarity} />

              {hasClimax && (
                <button
                  className="mt-1 text-[10px] w-full rounded py-0.5 font-bold"
                  style={{
                    background: isCarrier ? 'var(--gold)' : 'var(--bg4)',
                    color: isCarrier ? '#000' : 'var(--gold)',
                  }}
                  onClick={() => onSetClimax(num)}
                >
                  {isCarrier ? '🎬 Porteur' : '🎬 Climax'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
