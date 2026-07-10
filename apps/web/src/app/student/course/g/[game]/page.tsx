'use client';
import { notFound, useParams } from 'next/navigation';
import { findGame } from '@/lib/course-config';
import { GameShell } from '@/components/course/game-shell';
import { GAME_REGISTRY } from '@/components/course/games/registry';

export default function GameHostPage() {
  const params = useParams<{ game: string }>();
  const found = findGame(params.game);
  const Comp = GAME_REGISTRY[params.game];
  if (!found || !Comp) return notFound();

  return (
    <GameShell slug={params.game}>
      <Comp />
    </GameShell>
  );
}
