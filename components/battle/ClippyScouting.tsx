'use client';
import type { ClippyTeamFilm, GenreType } from '@/lib/battle/types';
import TypeBadge from './TypeBadge';
import RarityBadge from './RarityBadge';
import { WEATHER_LABELS } from '@/lib/battle/weather';

interface Props {
  archetype: string;
  meta: string;
  films: ClippyTeamFilm[];
}

export default function ClippyScouting({ archetype, meta, films }: Props) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg2)', border: '1px solid var(--border2)' }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">📎</span>
        <div>
          <h3 className="font-display text-lg" style={{ color: 'var(--gold)' }}>
            Équipe Clippy — {archetype}
          </h3>
          <p className="text-xs" style={{ color: 'var(--text2)' }}>{meta}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {films.map(f => (
          <div key={f.num} className="rounded-xl p-2" style={{ background: 'var(--bg3)' }}>
            <div className="font-bold text-xs leading-tight truncate">{f.name}</div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {f.types.map(t => <TypeBadge key={t} type={t as GenreType} small />)}
            </div>
            <div className="mt-1">
              <RarityBadge rarity={f.rarity} />
            </div>
            {f.climax && (
              <div className="mt-1 text-[10px]" style={{ color: 'var(--gold)' }}>
                🎬 {WEATHER_LABELS[f.climax.affinite] ?? f.climax.affinite}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
