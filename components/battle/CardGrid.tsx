'use client';
import type { CardData, ClimaxData, GenreType } from '@/lib/battle/types';
import TypeBadge from './TypeBadge';
import RarityBadge from './RarityBadge';
import { TYPE_COLORS } from '@/lib/battle/type-chart';

interface Props {
  cards: CardData[];
  climaxMap: Map<number, ClimaxData>;
  selected: number[];
  onSelect: (num: number) => void;
  onDetail: (card: CardData) => void;
  disabledNums?: Set<number>;
}

export default function CardGrid({ cards, climaxMap, selected, onSelect, onDetail, disabledNums }: Props) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
      {cards.map(card => {
        const isSelected = selected.includes(card.num);
        const hasClimax = climaxMap.has(card.num);
        const disabled = disabledNums?.has(card.num) && !isSelected;
        const mainColor = TYPE_COLORS[card.types[0] as GenreType] ?? '#666';

        return (
          <div
            key={card.num}
            className={`rounded-xl p-3 cursor-pointer transition-all ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
            style={{
              background: isSelected ? mainColor + '22' : 'var(--bg3)',
              border: isSelected ? `2px solid ${mainColor}` : '2px solid transparent',
              borderColor: isSelected ? mainColor : 'var(--border)',
            }}
            onClick={() => !disabled && onSelect(card.num)}
            onContextMenu={e => { e.preventDefault(); onDetail(card); }}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="font-bold text-sm leading-tight" style={{ color: isSelected ? '#fff' : 'var(--text)' }}>
                {card.name}
                {hasClimax && <span className="ml-1">🎬</span>}
              </div>
              {isSelected && (
                <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  style={{ background: mainColor, color: '#fff' }}>
                  {selected.indexOf(card.num) + 1}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 mb-1 flex-wrap">
              {card.types.map(t => <TypeBadge key={t} type={t as GenreType} small />)}
            </div>

            <div className="flex items-center justify-between">
              <RarityBadge rarity={card.rarity} />
              <span className="text-[10px] font-bold" style={{ color: 'var(--text3)' }}>BST {card.bst}</span>
            </div>

            <button
              className="mt-1 text-[10px] underline"
              style={{ color: 'var(--text3)' }}
              onClick={e => { e.stopPropagation(); onDetail(card); }}
            >
              Voir la fiche
            </button>
          </div>
        );
      })}
    </div>
  );
}
