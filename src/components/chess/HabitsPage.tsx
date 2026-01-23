import { useState, useEffect } from 'react';
import { Game, FilterState, OpeningBucket } from '@/types/chess';
import { filterGames } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Loader2, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HabitsPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

interface HabitInsight {
  title: string;
  description: string;
  frequency: string;
}

interface HabitsAnalysis {
  winningHabits: HabitInsight[];
  losingHabits: HabitInsight[];
}

export const HabitsPage = ({ games, filters, onFiltersChange }: HabitsPageProps) => {
  const [analysis, setAnalysis] = useState<HabitsAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const filteredGames = filterGames(games, filters);
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  // Calculate game patterns for AI analysis
  const calculatePatterns = () => {
    const wins = filteredGames.filter(g => g.result === 'win');
    const losses = filteredGames.filter(g => g.result === 'loss');

    return {
      totalGames: filteredGames.length,
      wins: wins.length,
      losses: losses.length,
      winPatterns: {
        quickWins: wins.filter(g => g.is_quick_win).length,
        earlyCastling: wins.filter(g => g.castled_at_ply && g.castled_at_ply <= 10).length,
        lowQueenMoves: wins.filter(g => (g.queen_moves_first_10 || 0) <= 1).length,
        avgQueenMoves: wins.length > 0 ? wins.reduce((sum, g) => sum + (g.queen_moves_first_10 || 0), 0) / wins.length : 0,
        avgCastlingPly: wins.filter(g => g.castled_at_ply).length > 0 
          ? wins.filter(g => g.castled_at_ply).reduce((sum, g) => sum + (g.castled_at_ply || 0), 0) / wins.filter(g => g.castled_at_ply).length 
          : 0,
      },
      lossPatterns: {
        quickLosses: losses.filter(g => g.is_quick_loss).length,
        lateCastling: losses.filter(g => g.castled_at_ply && g.castled_at_ply > 16).length,
        neverCastled: losses.filter(g => g.castled_at_ply === null).length,
        nc7Forks: losses.filter(g => g.nc7_fork_detected).length,
        highQueenMoves: losses.filter(g => (g.queen_moves_first_10 || 0) >= 3).length,
        earlyChecks: losses.filter(g => (g.early_checks_received || 0) >= 2).length,
        tempoLoss: losses.filter(g => g.queen_tempo_loss).length,
        avgQueenMoves: losses.length > 0 ? losses.reduce((sum, g) => sum + (g.queen_moves_first_10 || 0), 0) / losses.length : 0,
      },
      openingPerformance: {
        bestOpening: getBestOpening(wins),
        worstOpening: getWorstOpening(losses),
      }
    };
  };

  const getBestOpening = (wins: Game[]) => {
    const openingCounts: Record<string, number> = {};
    wins.forEach(g => {
      if (g.opening_bucket) {
        openingCounts[g.opening_bucket] = (openingCounts[g.opening_bucket] || 0) + 1;
      }
    });
    const sorted = Object.entries(openingCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  };

  const getWorstOpening = (losses: Game[]) => {
    const openingCounts: Record<string, number> = {};
    losses.forEach(g => {
      if (g.opening_bucket) {
        openingCounts[g.opening_bucket] = (openingCounts[g.opening_bucket] || 0) + 1;
      }
    });
    const sorted = Object.entries(openingCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  };

  const analyzeHabits = async () => {
    if (filteredGames.length === 0) {
      setError('No games to analyze');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const patterns = calculatePatterns();
      
      const { data, error: fnError } = await supabase.functions.invoke('analyze-habits', {
        body: { patterns }
      });

      if (fnError) throw fnError;
      
      setAnalysis(data);
    } catch (err) {
      console.error('Error analyzing habits:', err);
      setError('Failed to analyze habits. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (filteredGames.length > 0) {
      analyzeHabits();
    }
  }, [filteredGames.length, filters]);

  const HabitCard = ({ insight, index }: { insight: HabitInsight; index: number }) => (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
          {index + 1}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{insight.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{insight.frequency}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-11">
        {insight.description}
      </p>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="font-semibold text-foreground mb-2">No Analysis Available</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Import more games to get AI-powered insights about your winning and losing habits.
      </p>
    </div>
  );

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
      <h3 className="font-semibold text-foreground mb-2">Analyzing Your Games</h3>
      <p className="text-sm text-muted-foreground">
        Finding patterns in decisive evaluation swings...
      </p>
    </div>
  );

  return (
    <PageContainer>
      <PageHeader 
        title="Habits"
        subtitle="AI analysis of decisive moves and evaluation swings in your games"
      />

      <StickyFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableOpenings={availableOpenings}
        totalGames={games.length}
        filteredCount={filteredGames.length}
      />

      <Tabs defaultValue="winning" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="winning" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Winning Habits
          </TabsTrigger>
          <TabsTrigger value="losing" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Losing Habits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="winning">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : analysis?.winningHabits && analysis.winningHabits.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Common tactics that create decisive evaluation swings in your favor
              </p>
              {analysis.winningHabits.map((insight, index) => (
                <HabitCard key={index} insight={insight} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </TabsContent>

        <TabsContent value="losing">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : analysis?.losingHabits && analysis.losingHabits.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Common patterns that lead to decisive evaluation swings against you
              </p>
              {analysis.losingHabits.map((insight, index) => (
                <HabitCard key={index} insight={insight} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};
