import { Game, FilterState, OpeningBucket, OPENING_LABELS } from '@/types/chess';
import { filterGames, calculateStats, calculateOpeningStats, generateTrainingPlan } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { TrainingPlanCard } from './TrainingPlanCard';
import { CoachChat } from './CoachChat';

interface TrainingPageProps {
  games: Game[];
  username: string;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const TrainingPage = ({ games, username, filters, onFiltersChange }: TrainingPageProps) => {
  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  const openingStats = calculateOpeningStats(filteredGames);
  const trainingPlan = generateTrainingPlan(openingStats);
  
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  // Prepare stats for AI coach
  const topOpenings = openingStats
    .filter(o => o.games >= 3)
    .sort((a, b) => b.scorePercent - a.scorePercent)
    .slice(0, 3)
    .map(o => `${OPENING_LABELS[o.bucket]} (${o.scorePercent.toFixed(0)}%)`);

  const weakestOpenings = openingStats
    .filter(o => o.games >= 3)
    .sort((a, b) => a.scorePercent - b.scorePercent)
    .slice(0, 3)
    .map(o => `${OPENING_LABELS[o.bucket]} (${o.scorePercent.toFixed(0)}%)`);

  const playerStats = {
    totalGames: stats.totalGames,
    wins: stats.wins,
    losses: stats.losses,
    draws: stats.draws,
    scorePercent: stats.scorePercent,
    avgGameLength: stats.avgGameLength,
    avgQueenMovesFirst10: stats.avgQueenMovesFirst10,
    avgCastlingPly: stats.avgCastlingPly,
    quickLosses: stats.quickLosses,
    quickWins: stats.quickWins,
    topOpenings,
    weakestOpenings,
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Training Plan"
        subtitle="Personalized improvement roadmap based on your games"
      />

      <StickyFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableOpenings={availableOpenings}
        totalGames={games.length}
        filteredCount={filteredGames.length}
      />

      {/* 50-Game Training Plan Card */}
      <TrainingPlanCard plan={trainingPlan} openingStats={openingStats} />

      {/* AI Coach Chat */}
      <div className="mt-6">
        <CoachChat playerStats={playerStats} username={username} />
      </div>
    </PageContainer>
  );
};
