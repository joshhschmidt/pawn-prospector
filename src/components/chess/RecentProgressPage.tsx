import { useState, useEffect, useMemo } from 'react';
import { Game, FilterState, OpeningBucket, PlayerColor } from '@/types/chess';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { KPIGrid, KPICard } from './KPICard';
import { OpeningChart } from './OpeningChart';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Trophy, Target, XCircle, Minus, Loader2, Lightbulb, ChevronDown, MessageCircle,
  Swords, Crown, Castle, Shield, Zap, Brain, Crosshair, Timer, Footprints,
  AlertTriangle, CheckCircle, Eye, BarChart3, TrendingUp, TrendingDown, type LucideIcon
} from 'lucide-react';

interface RecentProgressPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onNavigate?: (view: string, context?: string) => void;
}

interface HabitInsight {
  title: string;
  description: string;
  frequency: string;
  detailedExplanation?: string;
}

type GameCount = 10 | 20 | 30;
type ColorFilter = 'all' | PlayerColor;

export const RecentProgressPage = ({ games, filters, onFiltersChange, onNavigate }: RecentProgressPageProps) => {
  const [gameCount, setGameCount] = useState<GameCount>(10);
  const [colorFilter, setColorFilter] = useState<ColorFilter>('white');
  const [winningAnalysis, setWinningAnalysis] = useState<HabitInsight[] | null>(null);
  const [losingAnalysis, setLosingAnalysis] = useState<HabitInsight[] | null>(null);
  const [isLoadingHabits, setIsLoadingHabits] = useState(false);
  const [habitsError, setHabitsError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  // First filter by color, then get the most recent N games from that subset
  const recentGames = useMemo(() => {
    // Filter by color first
    const colorGames = colorFilter === 'all' 
      ? games 
      : games.filter(g => g.player_color === colorFilter);
    
    // Sort by date (most recent first)
    const sortedGames = [...colorGames].sort((a, b) => {
      const dateA = a.game_date ? new Date(a.game_date).getTime() : 0;
      const dateB = b.game_date ? new Date(b.game_date).getTime() : 0;
      return dateB - dateA;
    });
    
    // Take the last N games for this color
    return sortedGames.slice(0, gameCount);
  }, [games, gameCount, colorFilter]);

  const stats = useMemo(() => calculateStats(recentGames), [recentGames]);
  const openingStats = useMemo(() => calculateOpeningStats(recentGames), [recentGames]);

  // Calculate patterns for habits analysis
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

  const analyzeHabits = async () => {
    if (recentGames.length === 0) {
      setHabitsError('No games to analyze');
      setWinningAnalysis(null);
      setLosingAnalysis(null);
      return;
    }

    setIsLoadingHabits(true);
    setHabitsError(null);

    try {
      const winningPatterns = calculatePatterns(recentGames, 'winning');
      const losingPatterns = calculatePatterns(recentGames, 'losing');
      
      const [winningResult, losingResult] = await Promise.all([
        supabase.functions.invoke('analyze-habits', { body: { patterns: winningPatterns } }),
        supabase.functions.invoke('analyze-habits', { body: { patterns: losingPatterns } })
      ]);

      if (winningResult.error) throw winningResult.error;
      if (losingResult.error) throw losingResult.error;
      
      setWinningAnalysis(winningResult.data?.winningHabits || []);
      setLosingAnalysis(losingResult.data?.losingHabits || []);
    } catch (err) {
      console.error('Error analyzing habits:', err);
      setHabitsError('Failed to analyze habits. Please try again.');
    } finally {
      setIsLoadingHabits(false);
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
    if (recentGames.length > 0) {
      analyzeHabits();
    }
  }, [gameCount, colorFilter, games.length]);

  // Get contextual icon based on habit content
  const getHabitIcon = (title: string, description: string): LucideIcon => {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('castl') || text.includes('king safety') || text.includes('king side')) return Castle;
    if (text.includes('queen')) return Crown;
    if (text.includes('knight') || text.includes('fork') || text.includes('nc7') || text.includes('horse')) return Swords;
    if (text.includes('tempo') || text.includes('time') || text.includes('quick') || text.includes('fast') || text.includes('speed')) return Timer;
    if (text.includes('develop') || text.includes('opening') || text.includes('early')) return Footprints;
    if (text.includes('attack') || text.includes('tactic') || text.includes('aggress') || text.includes('pressure')) return Crosshair;
    if (text.includes('defend') || text.includes('safe') || text.includes('protect') || text.includes('solid')) return Shield;
    if (text.includes('blunder') || text.includes('mistake') || text.includes('error') || text.includes('hang')) return AlertTriangle;
    if (text.includes('check')) return Zap;
    if (text.includes('pattern') || text.includes('strateg') || text.includes('plan') || text.includes('think')) return Brain;
    if (text.includes('vision') || text.includes('see') || text.includes('aware') || text.includes('spot')) return Eye;
    if (text.includes('win') || text.includes('success') || text.includes('strong')) return CheckCircle;
    if (text.includes('loss') || text.includes('fail') || text.includes('weak')) return XCircle;
    
    return Target;
  };

  const HabitCard = ({ insight, index, type }: { insight: HabitInsight; index: number; type: 'winning' | 'losing' }) => {
    const cardKey = `${type}-${index}`;
    const isExpanded = expandedCards[cardKey];
    const isLoadingDetail = loadingDetails[cardKey];
    const IconComponent = getHabitIcon(insight.title, insight.description);
    
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex">
          <div className="flex items-center justify-center w-16 bg-primary/5 border-r border-border">
            <IconComponent className="h-8 w-8 text-primary/40" strokeWidth={1.5} />
          </div>
          
          <div className="flex-1 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">{insight.title}</h3>
                <p className="text-xs text-muted-foreground">{insight.frequency}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const context = `I want to discuss this ${type} habit: "${insight.title}". ${insight.description}`;
                  onNavigate?.('coaching', context);
                }}
                className="h-7 px-2 gap-1 flex-shrink-0 text-xs"
              >
                <MessageCircle className="h-3 w-3" />
                Discuss
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {insight.description}
            </p>
            
            {isExpanded && insight.detailedExplanation && (
              <div className="pt-2 border-t border-border mt-2">
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {insight.detailedExplanation}
                </p>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(cardKey, insight, type)}
              disabled={isLoadingDetail}
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
            >
              {isLoadingDetail ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  {isExpanded ? 'Less' : 'More'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const ColorSubTabs = ({ value, onChange }: { value: ColorFilter; onChange: (val: ColorFilter) => void }) => (
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

  const EmptyHabitsState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Lightbulb className="h-8 w-8 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">No habits detected</p>
    </div>
  );

  const LoadingHabitsState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Loader2 className="h-6 w-6 text-primary animate-spin mb-3" />
      <p className="text-sm text-muted-foreground">Analyzing patterns...</p>
    </div>
  );

  const CollapsibleSection = ({ 
    title, 
    description, 
    icon: Icon, 
    defaultOpen = true, 
    children 
  }: { 
    title: string; 
    description: string; 
    icon: LucideIcon; 
    defaultOpen?: boolean; 
    children: React.ReactNode;
  }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={`interactive-card rounded-xl border border-border bg-card overflow-hidden ${isOpen ? 'expanded' : ''}`}>
          <CollapsibleTrigger className="w-full flex">
            {/* Icon column */}
            <div className="icon-container flex items-center justify-center w-16 transition-colors duration-200">
              <Icon className="opening-icon h-8 w-8" strokeWidth={1.5} />
            </div>
            
            {/* Content column */}
            <div className="flex-1 p-4 flex items-center justify-between">
              <div className="text-left">
                <h4 className="font-semibold text-foreground">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <ChevronDown 
                className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
              />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="p-4 border-t border-border">
              {children}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Recent Progress"
        subtitle="Performance snapshot of your most recent games"
      />

      {/* Game Count Tabs */}
      <Tabs value={String(gameCount)} onValueChange={(v) => setGameCount(Number(v) as GameCount)} className="w-full">
        <TabsList className="mb-6 w-full grid grid-cols-3">
          <TabsTrigger value="10">Last 10 Games</TabsTrigger>
          <TabsTrigger value="20">Last 20 Games</TabsTrigger>
          <TabsTrigger value="30">Last 30 Games</TabsTrigger>
        </TabsList>

        {[10, 20, 30].map((count) => (
          <TabsContent key={count} value={String(count)} className="mt-0">
            {/* Color Filter */}
            <ColorSubTabs value={colorFilter} onChange={setColorFilter} />

            {/* KPI Row */}
            <KPIGrid>
              <KPICard title="Games" value={stats.totalGames} icon={<Target className="h-5 w-5" />} />
              <KPICard title="Wins" value={stats.wins} variant="success" icon={<Trophy className="h-5 w-5" />} />
              <KPICard title="Losses" value={stats.losses} variant="danger" icon={<XCircle className="h-5 w-5" />} />
              <KPICard title="Draws" value={stats.draws} icon={<Minus className="h-5 w-5" />} />
            </KPIGrid>

            {/* Two Column Layout */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Overview Analytics */}
              <div className="space-y-4">
                <CollapsibleSection
                  title="Opening Frequency"
                  description="Most played openings"
                  icon={BarChart3}
                  defaultOpen={true}
                >
                  <div className="h-[280px]">
                    <OpeningChart data={openingStats.slice(0, 6)} type="frequency" />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Opening Win Rate"
                  description="Win % by opening (excluding draws)"
                  icon={Target}
                  defaultOpen={true}
                >
                  <div className="h-[280px]">
                    <OpeningChart data={openingStats.slice(0, 6)} type="performance" />
                  </div>
                </CollapsibleSection>
              </div>

              {/* Right Column - Habits Analytics */}
              <div className="space-y-4">
                <CollapsibleSection
                  title="Winning Habits"
                  description="Patterns in your wins"
                  icon={TrendingUp}
                  defaultOpen={true}
                >
                  {isLoadingHabits ? (
                    <LoadingHabitsState />
                  ) : habitsError ? (
                    <div className="text-center py-4 text-destructive text-sm">{habitsError}</div>
                  ) : winningAnalysis && winningAnalysis.length > 0 ? (
                    <div className="space-y-3">
                      {winningAnalysis.slice(0, 3).map((insight, index) => (
                        <HabitCard key={index} insight={insight} index={index} type="winning" />
                      ))}
                    </div>
                  ) : (
                    <EmptyHabitsState />
                  )}
                </CollapsibleSection>

                <CollapsibleSection
                  title="Losing Habits"
                  description="Patterns in your losses"
                  icon={TrendingDown}
                  defaultOpen={true}
                >
                  {isLoadingHabits ? (
                    <LoadingHabitsState />
                  ) : habitsError ? (
                    <div className="text-center py-4 text-destructive text-sm">{habitsError}</div>
                  ) : losingAnalysis && losingAnalysis.length > 0 ? (
                    <div className="space-y-3">
                      {losingAnalysis.slice(0, 3).map((insight, index) => (
                        <HabitCard key={index} insight={insight} index={index} type="losing" />
                      ))}
                    </div>
                  ) : (
                    <EmptyHabitsState />
                  )}
                </CollapsibleSection>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  );
};
