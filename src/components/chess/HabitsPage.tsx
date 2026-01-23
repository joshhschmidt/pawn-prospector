import { useState, useEffect } from 'react';
import { Game, FilterState, OpeningBucket, PlayerColor } from '@/types/chess';
import { filterGames } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Loader2, Lightbulb, ChevronDown, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface HabitsPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onNavigate?: (view: string) => void;
}

interface HabitInsight {
  title: string;
  description: string;
  frequency: string;
  detailedExplanation?: string;
}

type ColorFilter = 'all' | PlayerColor;

export const HabitsPage = ({ games, filters, onFiltersChange, onNavigate }: HabitsPageProps) => {
  const [winningColorFilter, setWinningColorFilter] = useState<ColorFilter>('white');
  const [losingColorFilter, setLosingColorFilter] = useState<ColorFilter>('white');
  const [winningAnalysis, setWinningAnalysis] = useState<HabitInsight[] | null>(null);
  const [losingAnalysis, setLosingAnalysis] = useState<HabitInsight[] | null>(null);
  const [isLoadingWinning, setIsLoadingWinning] = useState(false);
  const [isLoadingLosing, setIsLoadingLosing] = useState(false);
  const [winningError, setWinningError] = useState<string | null>(null);
  const [losingError, setLosingError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  
  const filteredGames = filterGames(games, filters);
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  const getColorFilteredGames = (colorFilter: ColorFilter) => {
    if (colorFilter === 'all') return filteredGames;
    return filteredGames.filter(g => g.player_color === colorFilter);
  };

  const calculatePatterns = (gamesToAnalyze: Game[], type: 'winning' | 'losing') => {
    const wins = gamesToAnalyze.filter(g => g.result === 'win');
    const losses = gamesToAnalyze.filter(g => g.result === 'loss');

    const getBestOpening = (gamesArr: Game[]) => {
      const openingCounts: Record<string, number> = {};
      gamesArr.forEach(g => {
        if (g.opening_bucket) {
          openingCounts[g.opening_bucket] = (openingCounts[g.opening_bucket] || 0) + 1;
        }
      });
      const sorted = Object.entries(openingCounts).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] || null;
    };

    return {
      totalGames: gamesToAnalyze.length,
      wins: wins.length,
      losses: losses.length,
      type,
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
        worstOpening: getBestOpening(losses),
      }
    };
  };

  const analyzeWinningHabits = async () => {
    const gamesToAnalyze = getColorFilteredGames(winningColorFilter);
    if (gamesToAnalyze.length === 0) {
      setWinningError('No games to analyze');
      setWinningAnalysis(null);
      return;
    }

    setIsLoadingWinning(true);
    setWinningError(null);

    try {
      const patterns = calculatePatterns(gamesToAnalyze, 'winning');
      
      const { data, error: fnError } = await supabase.functions.invoke('analyze-habits', {
        body: { patterns }
      });

      if (fnError) throw fnError;
      
      setWinningAnalysis(data?.winningHabits || []);
    } catch (err) {
      console.error('Error analyzing winning habits:', err);
      setWinningError('Failed to analyze habits. Please try again.');
    } finally {
      setIsLoadingWinning(false);
    }
  };

  const analyzeLosingHabits = async () => {
    const gamesToAnalyze = getColorFilteredGames(losingColorFilter);
    if (gamesToAnalyze.length === 0) {
      setLosingError('No games to analyze');
      setLosingAnalysis(null);
      return;
    }

    setIsLoadingLosing(true);
    setLosingError(null);

    try {
      const patterns = calculatePatterns(gamesToAnalyze, 'losing');
      
      const { data, error: fnError } = await supabase.functions.invoke('analyze-habits', {
        body: { patterns }
      });

      if (fnError) throw fnError;
      
      setLosingAnalysis(data?.losingHabits || []);
    } catch (err) {
      console.error('Error analyzing losing habits:', err);
      setLosingError('Failed to analyze habits. Please try again.');
    } finally {
      setIsLoadingLosing(false);
    }
  };

  const generateDetailedExplanation = async (cardKey: string, insight: HabitInsight, type: 'winning' | 'losing') => {
    setLoadingDetails(prev => ({ ...prev, [cardKey]: true }));
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-habits', {
        body: { 
          detailRequest: true,
          habitTitle: insight.title,
          habitDescription: insight.description,
          habitType: type
        }
      });

      if (fnError) throw fnError;
      
      const detailedExplanation = data?.detailedExplanation || 'Unable to generate detailed explanation.';
      
      if (type === 'winning') {
        setWinningAnalysis(prev => prev?.map((h, i) => 
          `winning-${i}` === cardKey ? { ...h, detailedExplanation } : h
        ) || null);
      } else {
        setLosingAnalysis(prev => prev?.map((h, i) => 
          `losing-${i}` === cardKey ? { ...h, detailedExplanation } : h
        ) || null);
      }
      
      setExpandedCards(prev => ({ ...prev, [cardKey]: true }));
    } catch (err) {
      console.error('Error generating detailed explanation:', err);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [cardKey]: false }));
    }
  };

  const toggleExpanded = (cardKey: string, insight: HabitInsight, type: 'winning' | 'losing') => {
    if (!insight.detailedExplanation && !expandedCards[cardKey]) {
      generateDetailedExplanation(cardKey, insight, type);
    } else {
      setExpandedCards(prev => ({ ...prev, [cardKey]: !prev[cardKey] }));
    }
  };

  useEffect(() => {
    if (filteredGames.length > 0) {
      analyzeWinningHabits();
    }
  }, [filteredGames.length, filters, winningColorFilter]);

  useEffect(() => {
    if (filteredGames.length > 0) {
      analyzeLosingHabits();
    }
  }, [filteredGames.length, filters, losingColorFilter]);

  const HabitCard = ({ insight, index, type }: { insight: HabitInsight; index: number; type: 'winning' | 'losing' }) => {
    const cardKey = `${type}-${index}`;
    const isExpanded = expandedCards[cardKey];
    const isLoadingDetail = loadingDetails[cardKey];
    
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{insight.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{insight.frequency}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate?.('coaching')}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Discuss
          </Button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed pl-11">
          {insight.description}
        </p>
        
        {/* Expanded Details */}
        {isExpanded && insight.detailedExplanation && (
          <div className="pl-11 pt-2 border-t border-border mt-3">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {insight.detailedExplanation}
            </p>
          </div>
        )}
        
        {/* More Details Button */}
        <div className="pl-11 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleExpanded(cardKey, insight, type)}
            disabled={isLoadingDetail}
            className="text-muted-foreground hover:text-foreground"
          >
            {isLoadingDetail ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                {isExpanded ? 'Show Less' : 'More Details'}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

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

  const ColorSubTabs = ({ 
    value, 
    onChange 
  }: { 
    value: ColorFilter; 
    onChange: (val: ColorFilter) => void;
  }) => (
    <div className="grid grid-cols-2 gap-1 mb-4">
      <button
        onClick={() => onChange('white')}
        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          value === 'white' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        As White
      </button>
      <button
        onClick={() => onChange('black')}
        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          value === 'black' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        As Black
      </button>
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

      <div className="mt-6">
        <Tabs defaultValue="winning" className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-2">
            <TabsTrigger value="winning">Winning Habits</TabsTrigger>
            <TabsTrigger value="losing">Losing Habits</TabsTrigger>
          </TabsList>

        <TabsContent value="winning">
          <ColorSubTabs value={winningColorFilter} onChange={setWinningColorFilter} />
          
          {isLoadingWinning ? (
            <LoadingState />
          ) : winningError ? (
            <div className="text-center py-8 text-destructive">{winningError}</div>
          ) : winningAnalysis && winningAnalysis.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Common tactics that create decisive evaluation swings in your favor
              </p>
              {winningAnalysis.map((insight, index) => (
                <HabitCard key={index} insight={insight} index={index} type="winning" />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </TabsContent>

        <TabsContent value="losing">
          <ColorSubTabs value={losingColorFilter} onChange={setLosingColorFilter} />
          
          {isLoadingLosing ? (
            <LoadingState />
          ) : losingError ? (
            <div className="text-center py-8 text-destructive">{losingError}</div>
          ) : losingAnalysis && losingAnalysis.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Common patterns that lead to decisive evaluation swings against you
              </p>
              {losingAnalysis.map((insight, index) => (
                <HabitCard key={index} insight={insight} index={index} type="losing" />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </TabsContent>
      </Tabs>
      </div>
    </PageContainer>
  );
};
