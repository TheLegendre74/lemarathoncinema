'use client';
import { TYPE_COLORS } from '@/lib/battle/type-chart';
import type { GenreType, MonSnapshot, WeatherType } from '@/lib/battle/types';
import HPBar from './HPBar';

interface Props {
  activeA: MonSnapshot | null;
  activeB: MonSnapshot | null;
  weather: WeatherType;
  tr: number;
  teamAAlive: number;
  teamBAlive: number;
  teamATotal: number;
  teamBTotal: number;
}

const WEATHER_OVERLAYS: Record<string, { bg: string; label: string }> = {
  sun:  { bg: 'radial-gradient(ellipse at 70% 20%, rgba(250,204,21,0.15) 0%, transparent 60%)', label: 'Plein Soleil' },
  rain: { bg: 'linear-gradient(180deg, rgba(96,165,250,0.1) 0%, transparent 100%)', label: 'Sous la Pluie' },
  sand: { bg: 'radial-gradient(ellipse at 50% 80%, rgba(194,154,82,0.15) 0%, transparent 60%)', label: 'Vent de Sable' },
  snow: { bg: 'radial-gradient(ellipse at 50% 30%, rgba(200,220,255,0.12) 0%, transparent 60%)', label: 'Chute de Neige' },
};

export default function BattleScene({ activeA, activeB, weather, tr, teamAAlive, teamBAlive, teamATotal, teamBTotal }: Props) {
  const weatherInfo = weather ? WEATHER_OVERLAYS[weather] : null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1a0a0a 0%, #0d0d1a 40%, #1a1a2e 100%)',
        minHeight: 320,
        border: '1px solid rgba(232,196,106,0.15)',
      }}
    >
      {/* Weather overlay */}
      {weatherInfo && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: weatherInfo.bg }} />
      )}

      {/* Weather/TR banner */}
      {(weather || tr > 0) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {weather && weatherInfo && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--gold)', border: '1px solid rgba(232,196,106,0.2)' }}>
              {weatherInfo.label}
            </span>
          )}
          {tr > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)' }}>
              Distorsion ({tr})
            </span>
          )}
        </div>
      )}

      {/* Opponent (top-right) */}
      <div className="absolute top-6 right-4 z-10" style={{ maxWidth: '45%' }}>
        {activeB && (
          <HPBar hp={activeB.hp} maxhp={activeB.maxhp} name={activeB.name}
            types={activeB.types} status={activeB.status} side="B" />
        )}
      </div>
      <div className="absolute top-16 right-8" style={{ width: 130, height: 130 }}>
        {activeB && <FilmCard mon={activeB} facing="front" />}
      </div>

      {/* Ball indicators */}
      <div className="absolute top-3 right-4 flex gap-1 z-10">
        {Array.from({ length: teamBTotal }).map((_, i) => (
          <span key={i} className="w-2 h-2 rounded-full"
            style={{ background: i < teamBAlive ? '#ef4444' : 'rgba(255,255,255,0.15)' }} />
        ))}
      </div>

      {/* Player (bottom-left) */}
      <div className="absolute bottom-20 left-4 z-10" style={{ maxWidth: '50%' }}>
        {activeA && (
          <HPBar hp={activeA.hp} maxhp={activeA.maxhp} name={activeA.name}
            types={activeA.types} status={activeA.status} side="A" />
        )}
      </div>
      <div className="absolute bottom-12 left-12" style={{ width: 150, height: 150 }}>
        {activeA && <FilmCard mon={activeA} facing="back" />}
      </div>

      {/* Ball indicators player */}
      <div className="absolute bottom-4 left-4 flex gap-1 z-10">
        {Array.from({ length: teamATotal }).map((_, i) => (
          <span key={i} className="w-2 h-2 rounded-full"
            style={{ background: i < teamAAlive ? '#4ade80' : 'rgba(255,255,255,0.15)' }} />
        ))}
      </div>

      {/* Platforms */}
      <div className="absolute bottom-8 left-4 w-44 h-6 rounded-full"
        style={{ background: 'linear-gradient(90deg, rgba(139,90,43,0.4), rgba(100,60,30,0.2))', filter: 'blur(1px)' }} />
      <div className="absolute top-36 right-4 w-36 h-5 rounded-full"
        style={{ background: 'linear-gradient(90deg, rgba(100,60,30,0.2), rgba(139,90,43,0.3))', filter: 'blur(1px)' }} />

      {/* Cinema seats decoration */}
      <div className="absolute bottom-0 inset-x-0 h-6 flex items-end justify-center gap-1 opacity-20">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-t-sm" style={{ background: '#8b3a3a' }} />
        ))}
      </div>
    </div>
  );
}

function FilmCard({ mon, facing }: { mon: MonSnapshot; facing: 'front' | 'back' }) {
  const typeColor = TYPE_COLORS[mon.types[0] as GenreType] ?? '#666';
  const typeColor2 = mon.types[1] ? TYPE_COLORS[mon.types[1] as GenreType] ?? '#444' : typeColor;

  return (
    <div
      className="w-full h-full rounded-xl flex flex-col items-center justify-center p-2 transition-all"
      style={{
        background: facing === 'front'
          ? `linear-gradient(135deg, ${typeColor}30, ${typeColor2}20)`
          : `linear-gradient(135deg, ${typeColor}15, ${typeColor2}10)`,
        border: `2px solid ${typeColor}60`,
        boxShadow: `0 0 20px ${typeColor}20`,
        opacity: facing === 'back' ? 0.85 : 1,
      }}
    >
      <div className="text-3xl mb-1">🎬</div>
      <div
        className="text-[10px] font-display text-center leading-tight"
        style={{ color: '#e8e6e3', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
      >
        {mon.name}
      </div>
      <div className="flex gap-0.5 mt-1">
        {mon.types.map(t => (
          <span key={t} className="w-1.5 h-1.5 rounded-full"
            style={{ background: TYPE_COLORS[t as GenreType] ?? '#666' }} />
        ))}
      </div>
    </div>
  );
}
