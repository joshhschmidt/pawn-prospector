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
import { ArrowLeft } from 'lucide-react';

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

  const handleBackToConversation = () => {
    setPracticeLine(null);
  };

  // Full-screen practice mode (like Opening Training)
  if (practiceLine) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBackToConversation} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Conversation
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chessboard - Takes 2/3 of the screen */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{practiceLine.name}</h3>
                  <p className="text-sm text-muted-foreground">Practice this line from your coach</p>
                </div>
              </div>

              {/* Color Selection */}
              <Tabs value={practiceColor} onValueChange={(v) => setPracticeColor(v as 'white' | 'black')} className="w-full">
                <TabsList className="w-full grid grid-cols-2 max-w-xs">
                  <TabsTrigger value="white">As White</TabsTrigger>
                  <TabsTrigger value="black">As Black</TabsTrigger>
                </TabsList>
              </Tabs>

              <PracticeBoard 
                line={practiceLine}
                color={practiceColor}
                onBack={handleBackToConversation}
                showBackButton={false}
              />
            </div>

            {/* Opening Details Sidebar */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground mb-2">Key Idea</p>
                <p className="text-sm text-muted-foreground">{practiceLine.keyIdea}</p>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Full Line</p>
                  <p className="text-sm font-mono text-foreground">
                    {practiceLine.moves.map((move, i) => (
                      <span key={i}>
                        {i % 2 === 0 && <span className="text-muted-foreground">{Math.floor(i/2) + 1}. </span>}
                        {move}{' '}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Chat mode
  return (
    <PageContainer>
      <PageHeader 
        title="Coaching Conversations"
        subtitle="Chat with your AI chess coach for personalized advice"
      />

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
    </PageContainer>
  );
};
