'use client';
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/battle/type-chart';
import type { GenreType } from '@/lib/battle/types';

export default function TypeBadge({ type, small }: { type: GenreType; small?: boolean }) {
  const bg = TYPE_COLORS[type] ?? '#666';
  const label = TYPE_LABELS[type] ?? type;
  return (
    <span
      style={{ background: bg }}
      className={`inline-block rounded-full text-white font-bold ${
        small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      {label}
    </span>
  );
}
