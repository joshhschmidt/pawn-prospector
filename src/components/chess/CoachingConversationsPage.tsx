import { useState } from 'react';
import { Game, FilterState, OPENING_LABELS } from '@/types/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/layout/SectionCard';
import { CoachChat } from './CoachChat';
import { PracticeBoard, PracticeLine } from './PracticeBoard';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CoachingConversationsPageProps {
  games: Game[];
  username: string;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  initialContext?: string | null;
  onContextConsumed?: () => void;
}

export const CoachingConversationsPage = ({ 
  games, 
  username, 
  filters, 
  onFiltersChange,
  initialContext,
  onContextConsumed
}: CoachingConversationsPageProps) => {
  const [practiceLine, setPracticeLine] = useState<PracticeLine | null>(null);
  const [practiceColor, setPracticeColor] = useState<'white' | 'black'>('white');
  
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

  const handlePracticeLineSelected = (line: PracticeLine, color: 'white' | 'black') => {
    setPracticeLine(line);
    setPracticeColor(color);
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Coaching Conversations"
        subtitle="Chat with your AI chess coach and practice opening lines"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Chat */}
        <SectionCard 
          title="AI Coach" 
          description="Ask questions about your games, get training tips, and discuss opening lines"
        >
          <CoachChat 
            playerStats={playerStats}
            username={username}
            initialContext={initialContext}
            onContextConsumed={onContextConsumed}
            onPracticeLineSelected={handlePracticeLineSelected}
          />
        </SectionCard>

        {/* Right Column - Practice Board */}
        <div className="space-y-4">
          <SectionCard 
            title="Practice Board" 
            description="Practice opening lines suggested by your coach"
          >
            {/* Color Selection */}
            <div className="mb-4">
              <Tabs value={practiceColor} onValueChange={(v) => setPracticeColor(v as 'white' | 'black')} className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="white">As White</TabsTrigger>
                  <TabsTrigger value="black">As Black</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <PracticeBoard 
              line={practiceLine}
              color={practiceColor}
              onBack={() => setPracticeLine(null)}
              showBackButton={!!practiceLine}
            />
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
};
