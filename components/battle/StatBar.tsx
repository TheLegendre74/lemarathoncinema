'use client';

const STAT_LABELS: Record<string, string> = {
  Post: 'Postérité',
  Spec: 'Spectacle',
  Tec: 'Technique',
  Sce: 'Scénario',
  Prof: 'Profondeur',
  Ryt: 'Rythme',
};

const STAT_COLORS: Record<string, string> = {
  Post: '#e8c46a',
  Spec: '#e85a5a',
  Tec: '#5a9ae8',
  Sce: '#a05ae8',
  Prof: '#4fd98a',
  Ryt: '#f0a060',
};

export default function StatBar({ statKey, value, max = 150 }: { statKey: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = STAT_COLORS[statKey] ?? '#888';
  const label = STAT_LABELS[statKey] ?? statKey;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-right" style={{ color: 'var(--text2)' }}>{label}</span>
      <span className="w-8 text-right font-bold" style={{ color }}>{value}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg3)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
