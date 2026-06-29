'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { BattleEvent, BattleSnapshot, PlayerAction } from '@/lib/battle/types';
import { BattleState } from '@/lib/battle/battle-state';
import BattleScene from './BattleScene';
import TextBox from './TextBox';
import ActionMenu from './ActionMenu';
import MoveSelector from './MoveSelector';
import SwitchSelector from './SwitchSelector';

type UIMode = 'init' | 'action_menu' | 'move_select' | 'move_select_climax' | 'switch_select' | 'animating' | 'ko_replace' | 'ended';

interface Props {
  state: BattleState;
  onFinish: () => void;
}

export default function BattleUI({ state, onFinish }: Props) {
  const [uiMode, setUiMode] = useState<UIMode>('init');
  const [eventQueue, setEventQueue] = useState<BattleEvent[]>(state.initEvents);
  const [eventIndex, setEventIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<BattleSnapshot>(state.snapshot());
  const [, forceUpdate] = useState(0);

  const currentEvent = eventQueue[eventIndex] ?? null;

  const advanceEvent = useCallback(() => {
    if (eventIndex < eventQueue.length - 1) {
      const next = eventIndex + 1;
      setEventIndex(next);
      setSnapshot(eventQueue[next].snapshot);
    } else {
      setEventQueue([]);
      setEventIndex(0);

      if (state.phase === 'ended') {
        setUiMode('ended');
        setSnapshot(state.snapshot());
      } else if (state.phase === 'ko_replace') {
        setUiMode('ko_replace');
        setSnapshot(state.snapshot());
      } else {
        setUiMode('action_menu');
        setSnapshot(state.snapshot());
      }
    }
  }, [eventIndex, eventQueue, state]);

  useEffect(() => {
    if (uiMode === 'init' && eventQueue.length > 0) {
      setUiMode('animating');
      setSnapshot(eventQueue[0].snapshot);
    }
  }, [uiMode, eventQueue]);

  const submitAction = useCallback((action: PlayerAction) => {
    const events = state.submitAction(action);
    if (events.length > 0) {
      setEventQueue(events);
      setEventIndex(0);
      setSnapshot(events[0].snapshot);
      setUiMode('animating');
    } else {
      setSnapshot(state.snapshot());
      if (state.phase === 'ended') setUiMode('ended');
      else if (state.phase === 'ko_replace') setUiMode('ko_replace');
      else setUiMode('action_menu');
    }
    forceUpdate(n => n + 1);
  }, [state]);

  const submitReplacement = useCallback((idx: number) => {
    const events = state.submitReplacement(idx);
    if (events.length > 0) {
      setEventQueue(events);
      setEventIndex(0);
      setSnapshot(events[0].snapshot);
      setUiMode('animating');
    } else {
      setSnapshot(state.snapshot());
      if (state.phase === 'ended') setUiMode('ended');
      else setUiMode('action_menu');
    }
    forceUpdate(n => n + 1);
  }, [state]);

  const moves = state.getPlayerMoves();
  const switches = state.getAvailableSwitches();

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Scene */}
      <BattleScene
        activeA={snapshot.activeA}
        activeB={snapshot.activeB}
        weather={snapshot.weather}
        tr={snapshot.tr}
        teamAAlive={snapshot.teamA.filter(m => m.alive).length}
        teamBAlive={snapshot.teamB.filter(m => m.alive).length}
        teamATotal={snapshot.teamA.length}
        teamBTotal={snapshot.teamB.length}
      />

      {/* TextBox (during animation) */}
      {uiMode === 'animating' && currentEvent && (
        <TextBox
          key={`${eventIndex}-${currentEvent.message}`}
          message={currentEvent.message}
          onDone={advanceEvent}
        />
      )}

      {/* Action Menu */}
      {uiMode === 'action_menu' && snapshot.activeA && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(232,196,106,0.1)' }}>
          <ActionMenu
            filmName={snapshot.activeA.name}
            onAttack={() => setUiMode('move_select')}
            onTeam={() => setUiMode('switch_select')}
            onClimax={() => setUiMode('move_select_climax')}
            onForfeit={() => submitAction({ type: 'forfeit' })}
            canClimax={state.canClimax()}
            climaxUsed={state.megaUsedA}
          />
        </div>
      )}

      {/* Move Selector */}
      {(uiMode === 'move_select' || uiMode === 'move_select_climax') && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(232,196,106,0.1)' }}>
          <MoveSelector
            moves={moves}
            climaxActive={uiMode === 'move_select_climax'}
            onSelect={idx => submitAction({
              type: 'move',
              moveIndex: idx,
              climax: uiMode === 'move_select_climax',
            })}
            onBack={() => setUiMode('action_menu')}
          />
        </div>
      )}

      {/* Switch Selector */}
      {uiMode === 'switch_select' && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(232,196,106,0.1)' }}>
          <SwitchSelector
            options={switches}
            onSelect={idx => submitAction({ type: 'switch', targetIndex: idx })}
            onBack={() => setUiMode('action_menu')}
          />
        </div>
      )}

      {/* KO Replacement */}
      {uiMode === 'ko_replace' && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <SwitchSelector
            options={state.getAvailableSwitches()}
            onSelect={idx => submitReplacement(idx)}
            forced
          />
        </div>
      )}

      {/* End Screen */}
      {uiMode === 'ended' && (
        <div className="text-center space-y-4 py-6 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(232,196,106,0.2)' }}>
          <h2 className="font-display text-3xl"
            style={{ color: state.winner === 'A' ? 'var(--gold)' : '#ef4444' }}>
            {state.winner === 'A' ? 'Victoire !' : state.winner === 'B' ? 'Défaite…' : 'Égalité'}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            {state.turn} tours — {state.teamA.filter(m => m.alive()).length} survivants
            vs {state.teamB.filter(m => m.alive()).length}
          </p>
          <button
            onClick={onFinish}
            className="px-8 py-3 rounded-xl font-display text-lg transition-all"
            style={{ background: 'var(--gold)', color: '#000' }}
          >
            Retour au menu
          </button>
        </div>
      )}
    </div>
  );
}
