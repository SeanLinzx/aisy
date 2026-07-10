'use client';

import { GameShell } from '@/components/course/game-shell';
import { MemoryMatchStudio } from '@/components/course/games/memory-match-studio';

export default function MemoryMatchStudioPage() {
  return (
    <GameShell slug="memory-match">
      <MemoryMatchStudio />
    </GameShell>
  );
}
