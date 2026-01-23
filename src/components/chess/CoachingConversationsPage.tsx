import { Game, FilterState, OPENING_LABELS } from '@/types/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/layout/SectionCard';
import { CoachChat } from './CoachChat';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';

interface CoachingConversationsPageProps {
  games: Game[];
  username: string;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const CoachingConversationsPage = ({ 
  games, 
  username, 
  filters, 
  onFiltersChange 
}: CoachingConversationsPageProps) => {
  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  const openingStats = calculateOpeningStats(filteredGames);

  // Build player stats for CoachChat
  const sortedByGames = [...openingStats].sort((a, b) => b.games - a.games);
  const sortedByScore = [...openingStats].sort((a, b) => a.scorePercent - b.scorePercent);
  
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
    topOpenings: sortedByGames.slice(0, 3).map(o => OPENING_LABELS[o.bucket]),
    weakestOpenings: sortedByScore.slice(0, 3).map(o => OPENING_LABELS[o.bucket]),
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Coaching Conversations"
        subtitle="Chat with your AI chess coach for personalized advice"
      />

      <div className="max-w-4xl">
        <SectionCard 
          title="AI Coach" 
          description="Ask questions about your games, get training tips, and discuss improvement strategies"
        >
          <CoachChat 
            playerStats={playerStats}
            username={username}
          />
        </SectionCard>
      </div>
    </PageContainer>
  );
};
