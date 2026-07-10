'use client';

import { GameShell } from '@/components/course/game-shell';
import { PortfolioStudio } from '@/components/course/games/portfolio-studio';

export default function PortfolioStudioPage() {
  return (
    <GameShell slug="portfolio">
      <PortfolioStudio />
    </GameShell>
  );
}
