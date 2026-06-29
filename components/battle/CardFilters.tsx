'use client';
import { useState } from 'react';
import { ALL_TYPES, TYPE_COLORS } from '@/lib/battle/type-chart';
import type { GenreType, Rarity } from '@/lib/battle/types';
import type { WeatherType } from '@/lib/battle/types';
import type { FilterOptions } from '@/lib/battle/data';
import { WEATHER_LABELS } from '@/lib/battle/weather';

interface Props {
  filters: FilterOptions;
  onChange: (f: FilterOptions) => void;
}

const RARITIES: { key: Rarity; label: string; color: string }[] = [
  { key: 'LÉGENDAIRE', label: 'Légendaire', color: '#e8c46a' },
  { key: 'ÉPIQUE', label: 'Épique', color: '#a05ae8' },
  { key: 'DUPONTEL', label: 'Dupontel', color: '#5a9ae8' },
  { key: 'RARE', label: 'Rare', color: '#4fd98a' },
];

const WEATHERS: { key: WeatherType; label: string }[] = [
  { key: 'sun', label: '☀️ Soleil' },
  { key: 'rain', label: '🌧️ Pluie' },
  { key: 'sand', label: '🏜️ Sable' },
  { key: 'snow', label: '❄️ Neige' },
];

export default function CardFilters({ filters, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const toggleType = (t: GenreType) => {
    const cur = filters.types ?? [];
    onChange({ ...filters, types: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] });
  };
  const toggleRarity = (r: Rarity) => {
    const cur = filters.rarities ?? [];
    onChange({ ...filters, rarities: cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r] });
  };
  const setWeather = (w: WeatherType) => {
    onChange({ ...filters, weather: filters.weather === w ? undefined : w ?? undefined });
  };

  return (
    <div className="space-y-3">
      {/* Recherche */}
      <input
        type="text"
        placeholder="Rechercher un film…"
        value={filters.search ?? ''}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        className="w-full px-4 py-2 rounded-xl text-sm outline-none"
        style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border2)' }}
      />

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: 'var(--gold)' }}
      >
        {expanded ? '▾ Masquer les filtres' : '▸ Filtres avancés'}
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Types */}
          <div>
            <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text3)' }}>Genres</div>
            <div className="flex flex-wrap gap-1">
              {ALL_TYPES.map(t => {
                const active = (filters.types ?? []).includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className="text-[10px] px-2 py-1 rounded-full font-bold transition-all"
                    style={{
                      background: active ? TYPE_COLORS[t] : 'var(--bg4)',
                      color: active ? '#fff' : 'var(--text2)',
                      opacity: active ? 1 : 0.7,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Raretés */}
          <div>
            <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text3)' }}>Rareté</div>
            <div className="flex flex-wrap gap-1">
              {RARITIES.map(r => {
                const active = (filters.rarities ?? []).includes(r.key);
                return (
                  <button
                    key={r.key}
                    onClick={() => toggleRarity(r.key)}
                    className="text-[10px] px-2 py-1 rounded font-bold transition-all uppercase tracking-wider"
                    style={{
                      background: active ? r.color + '33' : 'var(--bg4)',
                      color: active ? r.color : 'var(--text2)',
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Météo */}
          <div>
            <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text3)' }}>Météo</div>
            <div className="flex flex-wrap gap-1">
              {WEATHERS.map(w => {
                const active = filters.weather === w.key;
                return (
                  <button
                    key={w.key!}
                    onClick={() => setWeather(w.key)}
                    className="text-[10px] px-2 py-1 rounded font-bold transition-all"
                    style={{
                      background: active ? 'var(--gold3)' : 'var(--bg4)',
                      color: active ? 'var(--gold)' : 'var(--text2)',
                    }}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Climax only */}
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text2)' }}>
            <input
              type="checkbox"
              checked={filters.climaxOnly ?? false}
              onChange={e => onChange({ ...filters, climaxOnly: e.target.checked })}
              className="accent-amber-500"
            />
            🎬 Climax uniquement (saison 1)
          </label>
        </div>
      )}
    </div>
  );
}
