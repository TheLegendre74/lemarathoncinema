'use client';
import { TYPE_COLORS } from '@/lib/battle/type-chart';
import type { GenreType } from '@/lib/battle/types';

interface SwitchOption {
  index: number;
  name: string;
  num: number;
  hp: number;
  maxhp: number;
  alive: boolean;
  types: string[];
  status: string | null;
}

interface Props {
  options: SwitchOption[];
  onSelect: (index: number) => void;
  onBack?: () => void;
  forced?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  burn: 'BRÛ', poison: 'PSN', poison_bad: 'TOX', para: 'PAR', sleep: 'SOM',
};

export default function SwitchSelector({ options, onSelect, onBack, forced }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-display" style={{ color: forced ? '#ef4444' : '#60a5fa' }}>
          {forced ? 'Choisis un remplaçant !' : 'Envoyer quel film ?'}
        </span>
        {!forced && onBack && (
          <button
            onClick={onBack}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
          >
            ← Retour
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {options.map(opt => {
          const pct = opt.maxhp > 0 ? Math.max(0, (opt.hp / opt.maxhp) * 100) : 0;
          const barColor = pct > 50 ? '#4ade80' : pct > 20 ? '#facc15' : '#ef4444';
          return (
            <button
              key={opt.index}
              onClick={() => opt.alive && onSelect(opt.index)}
              disabled={!opt.alive}
              className="w-full text-left p-3 rounded-xl transition-all flex items-center gap-3"
              style={{
                background: opt.alive ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                opacity: opt.alive ? 1 : 0.3,
                cursor: opt.alive ? 'pointer' : 'not-allowed',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold truncate" style={{ color: '#e8e6e3' }}>
                    {opt.name}
                  </span>
                  <div className="flex gap-0.5">
                    {opt.types.map(t => (
                      <span key={t} className="w-2 h-2 rounded-full"
                        style={{ background: TYPE_COLORS[t as GenreType] ?? '#666' }} />
                    ))}
                  </div>
                  {opt.status && STATUS_LABELS[opt.status] && (
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                      {STATUS_LABELS[opt.status]}
                    </span>
                  )}
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              </div>
              <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--text3)' }}>
                {opt.hp}/{opt.maxhp}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
