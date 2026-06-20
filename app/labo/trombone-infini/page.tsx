import type { Metadata } from 'next';
import TromboneClient from './TromboneClient';

export const metadata: Metadata = {
  title: 'Le Trombone de l\'Infini',
  description: 'Shoot\'em up vertical — Phase 4 Clippy',
};

export default function TromboneInfiniPage() {
  return <TromboneClient />;
}
