'use client';
import { useState, useEffect, useRef } from 'react';
import type { CardData, GenreType, BattleResult, BattleLogEntry } from '@/lib/battle/types';
import TypeBadge from './TypeBadge';
import { WEATHER_LABELS } from '@/lib/battle/weather';

interface Props {
  result: BattleResult;
  teamA: number[];
  teamB: number[];
  cards: Record<number, CardData>;
  onFinish: () => void;
}

export default function BattleUI({ result, teamA, teamB, cards, onFinish }: Props) {
  const [logIndex, setLogIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const visibleLog = result.log.slice(0, logIndex + 1);
  const current = result.log[logIndex];
  const done = logIndex >= result.log.length - 1;

  useEffect(() => {
    if (!autoPlay || done) return;
    const t = setTimeout(() => setLogIndex(i => Math.min(i + 1, result.log.length - 1)), 600);
    return () => clearTimeout(t);
  }, [logIndex, autoPlay, done, result.log.length]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [logIndex]);

  const lastHP = visibleLog.findLast(e => e.hpA != null);

  const nameA = teamA[0] ? cards[teamA[0]]?.name ?? '?' : '?';
  const nameB = teamB[0] ? cards[teamB[0]]?.name ?? '?' : '?';

  return (
    <div className="space-y-4">
      {/* Météo active */}
      {current?.weatherNow && (
        <div className="text-center text-sm py-1 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--gold)' }}>
          🌤️ {WEATHER_LABELS[current.weatherNow] ?? current.weatherNow}
        </div>
      )}

      {/* Barres de PV */}
      <div className="grid grid-cols-2 gap-4">
        {/* Side A (joueur) */}
        <div className="rounded-xl p-3" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--green)' }}>Ton film</div>
          <HPBar
            hp={lastHP?.hpA ?? 0}
            max={lastHP?.hpAmax ?? 1}
            color="var(--green)"
          />
        </div>
        {/* Side B (Clippy) */}
        <div className="rounded-xl p-3" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--red)' }}>📎 Clippy</div>
          <HPBar
            hp={lastHP?.hpB ?? 0}
            max={lastHP?.hpBmax ?? 1}
            color="var(--red)"
          />
        </div>
      </div>

      {/* Log de combat */}
      <div
        ref={logRef}
        className="rounded-xl p-4 space-y-1 overflow-y-auto"
        style={{ background: 'var(--bg3)', maxHeight: '300px', border: '1px solid var(--border)' }}
      >
        {visibleLog.map((entry, i) => (
          <LogLine key={i} entry={entry} />
        ))}
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className="px-4 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'var(--bg4)', color: 'var(--text2)' }}
        >
          {autoPlay ? '⏸ Pause' : '▶ Auto'}
        </button>
        {!autoPlay && !done && (
          <button
            onClick={() => setLogIndex(i => Math.min(i + 1, result.log.length - 1))}
            className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'var(--bg4)', color: 'var(--text)' }}
          >
            Suivant →
          </button>
        )}
        {!autoPlay && (
          <button
            onClick={() => setLogIndex(result.log.length - 1)}
            className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'var(--bg4)', color: 'var(--text3)' }}
          >
            Fin ⏩
          </button>
        )}
      </div>

      {/* Résultat final */}
      {done && (
        <div className="text-center space-y-3 py-4">
          <h2 className="font-display text-2xl" style={{ color: result.winner === 'A' ? 'var(--gold)' : 'var(--red)' }}>
            {result.winner === 'A' ? '🏆 Victoire !' : result.winner === 'B' ? '💀 Défaite…' : '🤝 Égalité'}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            {result.turns} tours — {result.aliveA} survivants vs {result.aliveB}
          </p>
          <button
            onClick={onFinish}
            className="px-6 py-2 rounded-xl font-display"
            style={{ background: 'var(--gold)', color: '#000' }}
          >
            Retour au menu
          </button>
        </div>
      )}
    </div>
  );
}

function HPBar({ hp, max, color }: { hp: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--text2)' }}>PV</span>
        <span style={{ color }}>{Math.max(0, hp)}/{max}</span>
      </div>
      <div className="h-3 rounded-full" style={{ background: 'var(--bg4)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct > 50 ? color : pct > 20 ? 'var(--orange)' : 'var(--red)' }}
        />
      </div>
    </div>
  );
}

function LogLine({ entry }: { entry: BattleLogEntry }) {
  let style: React.CSSProperties = { color: 'var(--text2)' };
  if (entry.action === 'faint') style = { color: 'var(--red)', fontWeight: 'bold' };
  else if (entry.action === 'switch') style = { color: 'var(--blue)' };
  else if (entry.detail.includes('Super efficace')) style = { color: 'var(--gold)' };
  else if (entry.detail.includes('Climax')) style = { color: 'var(--gold)', fontWeight: 'bold' };

  if (entry.action === 'info' && entry.detail.startsWith('Tour ')) {
    return <div className="text-[10px] mt-1 mb-0.5" style={{ color: 'var(--text3)' }}>— Tour {entry.turn} —</div>;
  }

  return (
    <div className="text-xs" style={style}>
      {entry.side === 'B' && <span>📎 </span>}
      {entry.detail}
    </div>
  );
}
