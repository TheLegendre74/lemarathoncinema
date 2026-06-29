'use client';
import type { Rarity } from '@/lib/battle/types';

const RARITY_STYLES: Record<Rarity, { bg: string; text: string; label: string }> = {
  'LÉGENDAIRE': { bg: 'rgba(232,196,106,0.18)', text: '#e8c46a', label: 'Légendaire' },
  'ÉPIQUE':     { bg: 'rgba(160,90,232,0.15)', text: '#a05ae8', label: 'Épique' },
  'DUPONTEL':   { bg: 'rgba(90,154,232,0.15)', text: '#5a9ae8', label: 'Dupontel' },
  'RARE':       { bg: 'rgba(79,217,138,0.12)', text: '#4fd98a', label: 'Rare' },
};

export default function RarityBadge({ rarity }: { rarity: Rarity }) {
  const s = RARITY_STYLES[rarity];
  return (
    <span
      style={{ background: s.bg, color: s.text }}
      className="inline-block rounded text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider"
    >
      {s.label}
    </span>
  );
}
