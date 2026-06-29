'use client';
import { TYPE_COLORS } from '@/lib/battle/type-chart';
import type { GenreType } from '@/lib/battle/types';

interface MoveInfo {
  index: number;
  displayName: string;
  displayType: string;
  displayCat: string;
  displayPow: number | string | null;
  pp: number;
  maxPP: number;
}

interface Props {
  moves: MoveInfo[];
  onSelect: (index: number) => void;
  onBack: () => void;
  climaxActive?: boolean;
}

const CAT_LABELS: Record<string, string> = {
  phys: 'Physique', spe: 'Spécial', status: 'Statut',
};

export default function MoveSelector({ moves, onSelect, onBack, climaxActive }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-display" style={{ color: climaxActive ? '#c084fc' : 'var(--gold)' }}>
          {climaxActive ? '⭐ Climax + Attaque' : 'Choisis une attaque'}
        </span>
        <button
          onClick={onBack}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
        >
          ← Retour
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {moves.map(mv => {
          const typeColor = TYPE_COLORS[mv.displayType as GenreType] ?? '#666';
          const noPP = mv.pp <= 0;
          return (
            <button
              key={mv.index}
              onClick={() => !noPP && onSelect(mv.index)}
              disabled={noPP}
              className="text-left p-3 rounded-xl transition-all"
              style={{
                background: noPP ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${noPP ? 'rgba(255,255,255,0.05)' : typeColor}50`,
                opacity: noPP ? 0.35 : 1,
                cursor: noPP ? 'not-allowed' : 'pointer',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: typeColor }}
                />
                <span className="text-xs font-bold truncate" style={{ color: '#e8e6e3' }}>
                  {mv.displayName}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text3)' }}>
                <span>{CAT_LABELS[mv.displayCat] ?? mv.displayCat}</span>
                <span>
                  {mv.displayPow != null && mv.displayPow !== '' && `${mv.displayPow} · `}
                  {mv.pp}/{mv.maxPP} PP
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
