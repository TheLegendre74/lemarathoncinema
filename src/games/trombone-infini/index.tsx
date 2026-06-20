'use client';

import { useEffect, useRef } from 'react';

export default function TromboneInfini() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let destroyed = false;

    import('./phaser/main').then(({ createGame }) => {
      if (destroyed || !containerRef.current) return;
      gameRef.current = createGame(containerRef.current);
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#000',
    }}>
      <div ref={containerRef} style={{ maxWidth: 480, maxHeight: 720 }} />
    </div>
  );
}
