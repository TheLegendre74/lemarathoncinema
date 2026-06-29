'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadCards, loadSaison, getCardList, getClimaxMap, filterCards, countByRarity } from '@/lib/battle/data';
import type { FilterOptions } from '@/lib/battle/data';
import type { CardData, ClimaxData, GenreType } from '@/lib/battle/types';
import { BATTLE_CONFIG } from '@/lib/battle/config';
import CardGrid from '@/components/battle/CardGrid';
import CardFilters from '@/components/battle/CardFilters';
import CardDetail from '@/components/battle/CardDetail';
import TeamSlots from '@/components/battle/TeamSlots';

export default function TeamBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty = searchParams.get('difficulty') ?? 'moyen';
  const seed = searchParams.get('seed') ?? '0';
  const archetype = searchParams.get('archetype') ?? '';

  const [cards, setCards] = useState<Record<number, CardData> | null>(null);
  const [saison, setSaison] = useState<ClimaxData[] | null>(null);
  const [team, setTeam] = useState<number[]>([]);
  const [climaxCarrier, setClimaxCarrier] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [detailCard, setDetailCard] = useState<CardData | null>(null);

  useEffect(() => {
    loadCards().then(setCards);
    loadSaison().then(setSaison);
  }, []);

  const climaxMap = useMemo(() => saison ? getClimaxMap(saison) : new Map<number, ClimaxData>(), [saison]);

  const allCards = useMemo(() => cards ? getCardList(cards) : [], [cards]);
  const filtered = useMemo(() => filterCards(allCards, filters, climaxMap), [allCards, filters, climaxMap]);

  if (!cards || !saison) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div style={{ color: 'var(--text2)' }}>Chargement des 490 films…</div>
      </div>
    );
  }

  const rarityCounts = countByRarity(team, cards);
  const legendFull = rarityCounts['LÉGENDAIRE'] >= BATTLE_CONFIG.CAP_LEGENDAIRE;
  const teamFull = team.length >= BATTLE_CONFIG.TEAM_SIZE;

  const disabledNums = new Set<number>();
  if (teamFull) {
    allCards.forEach(c => { if (!team.includes(c.num)) disabledNums.add(c.num); });
  } else if (legendFull) {
    allCards.forEach(c => { if (c.rarity === 'LÉGENDAIRE' && !team.includes(c.num)) disabledNums.add(c.num); });
  }

  const toggleCard = (num: number) => {
    if (team.includes(num)) {
      setTeam(team.filter(n => n !== num));
      if (climaxCarrier === num) setClimaxCarrier(null);
    } else if (!teamFull) {
      const card = cards[num];
      if (card?.rarity === 'LÉGENDAIRE' && legendFull) return;
      setTeam([...team, num]);
    }
  };

  const handleConfirm = () => {
    if (team.length !== BATTLE_CONFIG.TEAM_SIZE) return;
    const params = new URLSearchParams({
      difficulty,
      seed,
      archetype,
      team: team.join(','),
      climax: climaxCarrier ? String(climaxCarrier) : '',
    });
    router.push(`/labo/battle/preview?${params}`);
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl" style={{ color: 'var(--gold)' }}>Équipe de combat</h1>
            <p className="text-xs" style={{ color: 'var(--text2)' }}>
              Choisis 6 films. Clic droit pour voir la fiche. Max 3 Légendaires.
            </p>
          </div>
          <button
            onClick={() => router.push('/labo/battle')}
            className="text-sm px-3 py-1 rounded-lg"
            style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
          >
            ← Retour
          </button>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 280px' }}>
          {/* Left: grille */}
          <div className="space-y-4">
            <CardFilters filters={filters} onChange={setFilters} />
            <div className="text-xs" style={{ color: 'var(--text3)' }}>
              {filtered.length} film{filtered.length > 1 ? 's' : ''}
            </div>
            <CardGrid
              cards={filtered}
              climaxMap={climaxMap}
              selected={team}
              onSelect={toggleCard}
              onDetail={setDetailCard}
              disabledNums={disabledNums}
            />
          </div>

          {/* Right: team slots */}
          <div className="sticky top-4 self-start space-y-4">
            <TeamSlots
              team={team}
              cards={cards}
              climaxMap={climaxMap}
              climaxCarrier={climaxCarrier}
              onRemove={num => {
                setTeam(team.filter(n => n !== num));
                if (climaxCarrier === num) setClimaxCarrier(null);
              }}
              onSetClimax={num => setClimaxCarrier(climaxCarrier === num ? null : num)}
            />

            <button
              disabled={team.length !== BATTLE_CONFIG.TEAM_SIZE}
              onClick={handleConfirm}
              className="w-full py-3 rounded-xl font-display text-lg transition-all"
              style={{
                background: team.length === BATTLE_CONFIG.TEAM_SIZE ? 'var(--gold)' : 'var(--bg4)',
                color: team.length === BATTLE_CONFIG.TEAM_SIZE ? '#000' : 'var(--text3)',
                cursor: team.length === BATTLE_CONFIG.TEAM_SIZE ? 'pointer' : 'not-allowed',
              }}
            >
              {team.length === BATTLE_CONFIG.TEAM_SIZE ? 'Team Preview →' : `${team.length}/${BATTLE_CONFIG.TEAM_SIZE} films`}
            </button>
          </div>
        </div>
      </div>

      {/* Modal détail */}
      {detailCard && (
        <CardDetail
          card={detailCard}
          climax={climaxMap.get(detailCard.num) ?? null}
          onClose={() => setDetailCard(null)}
        />
      )}
    </div>
  );
}
