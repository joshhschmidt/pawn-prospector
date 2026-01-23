import { useState } from 'react';
import { Game, FilterState, OPENING_LABELS } from '@/types/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/layout/SectionCard';
import { CoachChat } from './CoachChat';
import { PracticeBoard, PracticeLine } from './PracticeBoard';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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

  const handleClosePractice = () => {
    setPracticeLine(null);
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Coaching Conversations"
        subtitle="Chat with your AI chess coach for personalized advice"
      />

      {practiceLine ? (
        /* Practice Mode - Show board when a line is selected */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Chat */}
          <SectionCard 
            title="AI Coach" 
            description="Continue discussing with your coach"
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
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Practice: {practiceLine.name}</h3>
              <Button variant="ghost" size="sm" onClick={handleClosePractice}>
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
            
            {/* Color Selection */}
            <Tabs value={practiceColor} onValueChange={(v) => setPracticeColor(v as 'white' | 'black')} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="white">As White</TabsTrigger>
                <TabsTrigger value="black">As Black</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <PracticeBoard 
              line={practiceLine}
              color={practiceColor}
              onBack={handleClosePractice}
              showBackButton={false}
            />
          </div>
        </div>
      ) : (
        /* Chat Only Mode */
        <SectionCard 
          title="AI Coach" 
          description="Ask questions about your games, get training tips, and request opening lines to practice"
        >
          <CoachChat 
            playerStats={playerStats}
            username={username}
            initialContext={initialContext}
            onContextConsumed={onContextConsumed}
            onPracticeLineSelected={handlePracticeLineSelected}
          />
        </SectionCard>
      )}
    </PageContainer>
  );
};
