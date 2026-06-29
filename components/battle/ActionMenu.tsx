'use client';

interface Props {
  onAttack: () => void;
  onTeam: () => void;
  onClimax: () => void;
  onForfeit: () => void;
  canClimax: boolean;
  climaxUsed: boolean;
  filmName: string;
}

export default function ActionMenu({ onAttack, onTeam, onClimax, onForfeit, canClimax, climaxUsed, filmName }: Props) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-display" style={{ color: 'var(--gold)' }}>
        Que doit faire {filmName} ?
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MenuButton label="Attaque" icon="⚔️" onClick={onAttack} color="var(--gold)" />
        <MenuButton label="Équipe" icon="🔄" onClick={onTeam} color="#60a5fa" />
        <MenuButton
          label={climaxUsed ? 'Climax (fait)' : 'Climax'}
          icon="⭐"
          onClick={onClimax}
          color="#c084fc"
          disabled={!canClimax}
        />
        <MenuButton label="Abandonner" icon="🏳️" onClick={onForfeit} color="#94a3b8" />
      </div>
    </div>
  );
}

function MenuButton({ label, icon, onClick, color, disabled }: {
  label: string; icon: string; onClick: () => void; color: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-3 rounded-xl font-display text-sm transition-all"
      style={{
        background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : color}40`,
        color: disabled ? 'var(--text3)' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}
