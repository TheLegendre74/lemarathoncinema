'use client';

import dynamic from 'next/dynamic';

const TromboneInfini = dynamic(
  () => import('@/src/games/trombone-infini/index'),
  {
    ssr: false,
    loading: () => (
      <div style={{ color: '#ffd700', textAlign: 'center', marginTop: '40vh', fontFamily: 'monospace' }}>
        Chargement du Trombone de l&apos;Infini...
      </div>
    ),
  }
);

export default function TromboneClient() {
  return <TromboneInfini />;
}
