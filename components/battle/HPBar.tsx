'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  hp: number;
  maxhp: number;
  name: string;
  types?: string[];
  status?: string | null;
  side: 'A' | 'B';
}

const STATUS_LABELS: Record<string, string> = {
  burn: 'BRÛ', poison: 'PSN', poison_bad: 'TOX', para: 'PAR', sleep: 'SOM',
};

export default function HPBar({ hp, maxhp, name, types, status, side }: Props) {
  const [displayHp, setDisplayHp] = useState(hp);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start = displayHp;
    const diff = hp - start;
    if (diff === 0) return;
    const duration = 400;
    const t0 = performance.now();
    function tick(now: number) {
      const elapsed = now - t0;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayHp(Math.round(start + diff * eased));
      if (progress < 1) animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [hp]);

  const pct = maxhp > 0 ? Math.max(0, Math.min(100, (displayHp / maxhp) * 100)) : 0;
  const barColor = pct > 50 ? '#4ade80' : pct > 20 ? '#facc15' : '#ef4444';

  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(232,196,106,0.25)',
        minWidth: 180,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-sm truncate" style={{ color: 'var(--gold)', maxWidth: 140 }}>
          {side === 'B' && '📎 '}{name}
        </span>
        {status && STATUS_LABELS[status] && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-1"
            style={{ background: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
            {STATUS_LABELS[status]}
          </span>
        )}
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: barColor,
            transition: 'background 0.3s',
          }}
        />
      </div>
      <div className="flex justify-end mt-0.5">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>
          {Math.max(0, displayHp)}/{maxhp}
        </span>
      </div>
    </div>
  );
}
