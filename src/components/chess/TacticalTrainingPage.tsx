import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/layout/SectionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Lightbulb, 
  Play,
  Swords,
  Target,
  Crown,
  Zap,
  Shield,
  Sparkles,
  Loader2,
  Brain
} from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Game, FilterState, OPENING_LABELS } from '@/types/chess';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';

interface TacticalPattern {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  fen: string;
  moves: string[];
  key_idea: string;
  play_as: string;
  tags: string[];
  recommendation_reason?: string;
}

interface RecommendedOpening {
  bucket: string;
  name: string;
  color?: 'white' | 'black';
  reason: string;
  lines: {
    name: string;
    moves: string[];
    keyIdea: string;
  }[];
}

type ColorFilter = 'white' | 'black';

interface TacticalTrainingPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'attacks': return Swords;
    case 'traps': return Target;
    case 'checkmates': return Crown;
    case 'endgames': return Shield;
    case 'sacrifices': return Zap;
    default: return Zap;
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner': return 'bg-green-500/20 text-green-500';
    case 'intermediate': return 'bg-yellow-500/20 text-yellow-500';
    case 'advanced': return 'bg-red-500/20 text-red-500';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const TacticalTrainingPage = ({ games, filters, onFiltersChange }: TacticalTrainingPageProps) => {
  const [selectedPattern, setSelectedPattern] = useState<TacticalPattern | null>(null);
  const [patterns, setPatterns] = useState<TacticalPattern[]>([]);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true);
  const [recommendations, setRecommendations] = useState<TacticalPattern[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recommendedOpeningsBySide, setRecommendedOpeningsBySide] = useState<Record<ColorFilter, RecommendedOpening[]>>({
    white: [],
    black: [],
  });
  const [isLoadingOpenings, setIsLoadingOpenings] = useState(false);

  // Page-level side filter (governs both sections)
  const [side, setSide] = useState<ColorFilter>('white');
  
  // Practice state
  const [game, setGame] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Calculate player stats for AI recommendations
  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  const openingStats = calculateOpeningStats(filteredGames);

  // Side-scoped stats (used for side-specific opening recommendations)
  const sideGames = useMemo(
    () => filteredGames.filter((g) => g.player_color === side),
    [filteredGames, side]
  );
  const sideStats = useMemo(() => calculateStats(sideGames), [sideGames]);
  const sideOpeningStats = useMemo(() => calculateOpeningStats(sideGames), [sideGames]);

  const playerStats = useMemo(() => {
    const sortedByGames = [...openingStats].sort((a, b) => b.games - a.games);
    const sortedByScore = [...openingStats].sort((a, b) => a.scorePercent - b.scorePercent);
    
    return {
      totalGames: stats.totalGames,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      scorePercent: stats.scorePercent,
      avgGameLength: stats.avgGameLength,
      quickLosses: stats.quickLosses,
      quickWins: stats.quickWins,
      topOpenings: sortedByGames.slice(0, 3).map(o => OPENING_LABELS[o.bucket]),
      weakestOpenings: sortedByScore.slice(0, 3).map(o => OPENING_LABELS[o.bucket]),
    };
  }, [stats, openingStats]);

  const playerStatsForSide = useMemo(() => {
    const sortedByGames = [...sideOpeningStats].sort((a, b) => b.games - a.games);
    const sortedByScore = [...sideOpeningStats].sort((a, b) => a.scorePercent - b.scorePercent);

    return {
      totalGames: sideStats.totalGames,
      wins: sideStats.wins,
      losses: sideStats.losses,
      draws: sideStats.draws,
      scorePercent: sideStats.scorePercent,
      avgGameLength: sideStats.avgGameLength,
      quickLosses: sideStats.quickLosses,
      quickWins: sideStats.quickWins,
      topOpenings: sortedByGames.slice(0, 3).map((o) => OPENING_LABELS[o.bucket]),
      weakestOpenings: sortedByScore.slice(0, 3).map((o) => OPENING_LABELS[o.bucket]),
    };
  }, [sideStats, sideOpeningStats]);

  // Fetch patterns from database
  useEffect(() => {
    const fetchPatterns = async () => {
      setIsLoadingPatterns(true);
      try {
        const { data, error } = await supabase
          .from('tactical_patterns')
          .select('*')
          .order('category', { ascending: true });

        if (error) throw error;
        setPatterns(data || []);
      } catch (err) {
        console.error('Error fetching patterns:', err);
        toast.error('Failed to load tactical patterns');
      } finally {
        setIsLoadingPatterns(false);
      }
    };

    fetchPatterns();
  }, []);

  // Track if we've already fetched recommendations to prevent duplicate calls
  const hasFetchedRecs = useRef(false);
  const gamesCount = games.length;
  const patternsCount = patterns.length;

  // Fetch AI recommendations once when patterns are loaded and we have game data
  useEffect(() => {
    const fetchRecommendations = async () => {
      // Only fetch once, and only when we have data
      if (hasFetchedRecs.current || patternsCount === 0 || gamesCount === 0) return;
      
      hasFetchedRecs.current = true;
      setIsLoadingRecs(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('recommend-tactics', {
          body: { playerStats, patterns }
        });

        if (error) {
          // Handle rate limit gracefully
          if (error.message?.includes('429') || error.message?.includes('rate limit')) {
            console.log('Rate limited - showing patterns without AI recommendations');
          } else {
            throw error;
          }
        } else {
          setRecommendations(data?.recommendations || []);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        // Don't show error toast - recommendations are optional enhancement
      } finally {
        setIsLoadingRecs(false);
      }
    };

    fetchRecommendations();
  }, [patternsCount, gamesCount]); // Only depend on counts, not the full objects

  // Fetch recommended openings from AI
  const hasFetchedOpeningsBySide = useRef<Record<ColorFilter, boolean>>({ white: false, black: false });
  const isFetchingOpeningsBySide = useRef<Record<ColorFilter, boolean>>({ white: false, black: false });
  
  useEffect(() => {
    const fetchOpenings = async () => {
      if (
        gamesCount === 0 ||
        isFetchingOpeningsBySide.current[side] ||
        hasFetchedOpeningsBySide.current[side]
      ) {
        return;
      }

      isFetchingOpeningsBySide.current[side] = true;
      setIsLoadingOpenings(true);

      // small delay to reduce chance of rate limit when tactics + openings are requested together
      await new Promise((r) => setTimeout(r, 900));

      const delays = [500, 1200, 2500];
      let lastError: unknown = null;

      try {
        // Get openings the player has played for THIS side
        const playedBuckets = new Set(sideOpeningStats.map((o) => o.bucket));

        for (let attempt = 0; attempt < delays.length + 1; attempt++) {
          const { data, error } = await supabase.functions.invoke('recommend-openings', {
            body: {
              playerStats: playerStatsForSide,
              playedOpenings: Array.from(playedBuckets),
              desiredColor: side,
            },
          });

          if (!error) {
            setRecommendedOpeningsBySide((prev) => ({
              ...prev,
              [side]: data?.openings || [],
            }));
            hasFetchedOpeningsBySide.current[side] = true;
            lastError = null;
            break;
          }

          lastError = error;
          const isRateLimited = error.message?.includes('429') || error.message?.toLowerCase?.().includes('rate limit');
          if (!isRateLimited) break;

          if (attempt < delays.length) {
            await new Promise((r) => setTimeout(r, delays[attempt]));
          }
        }

        if (lastError) {
          // keep console-only: recommendations are an enhancement and can be rate-limited
          console.error('Error fetching opening recommendations:', lastError);
        }
      } finally {
        isFetchingOpeningsBySide.current[side] = false;
        setIsLoadingOpenings(false);
      }
    };

    fetchOpenings();
  }, [gamesCount, side, sideOpeningStats, playerStatsForSide]);

  const ColorSubTabs = ({ value, onChange }: { value: ColorFilter; onChange: (v: ColorFilter) => void }) => (
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

  const recommendedOpenings = recommendedOpeningsBySide[side] ?? [];

  // If user flips the page-level side while practicing a pattern from the other side,
  // return to list view (keeps the UX consistent with the global filter).
  useEffect(() => {
    if (selectedPattern && selectedPattern.play_as !== side) {
      setSelectedPattern(null);
    }
  }, [side, selectedPattern]);

  const resetPractice = useCallback(() => {
    const fen = selectedPattern?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setGame(new Chess(fen));
    setCurrentMoveIndex(0);
    setFeedback(null);
    setShowHint(false);
    setPracticeComplete(false);
    setSelectedSquare(null);
  }, [selectedPattern]);

  useEffect(() => {
    if (selectedPattern) {
      resetPractice();
    }
  }, [selectedPattern, resetPractice]);

  const handleSelectPattern = (pattern: TacticalPattern) => {
    setSelectedPattern(pattern);
  };

  const handleBackToList = () => {
    setSelectedPattern(null);
  };

  const isPlayerTurn = useCallback(() => {
    if (!selectedPattern) return false;
    const isWhiteTurn = game.turn() === 'w';
    return (selectedPattern.play_as === 'white' && isWhiteTurn) || 
           (selectedPattern.play_as === 'black' && !isWhiteTurn);
  }, [game, selectedPattern]);

  // Auto-play opponent moves
  useEffect(() => {
    if (!selectedPattern || practiceComplete) return;
    
    const moves = selectedPattern.moves;
    if (currentMoveIndex >= moves.length) {
      setPracticeComplete(true);
      return;
    }

    if (!isPlayerTurn() && currentMoveIndex < moves.length) {
      const timer = setTimeout(() => {
        try {
          const newGame = new Chess(game.fen());
          newGame.move(moves[currentMoveIndex]);
          setGame(newGame);
          setCurrentMoveIndex(prev => prev + 1);
        } catch (e) {
          console.error('Invalid opponent move:', moves[currentMoveIndex]);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentMoveIndex, game, selectedPattern, isPlayerTurn, practiceComplete]);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!selectedPattern || !isPlayerTurn() || practiceComplete) return false;
    
    const moves = selectedPattern.moves;
    if (currentMoveIndex >= moves.length) return false;

    const expectedMove = moves[currentMoveIndex];
    
    try {
      const newGame = new Chess(game.fen());
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (!move) return false;

      const moveNotation = move.san;
      if (moveNotation === expectedMove || 
          moveNotation.replace('+', '').replace('#', '') === expectedMove.replace('+', '').replace('#', '')) {
        setGame(newGame);
        setCurrentMoveIndex(prev => prev + 1);
        setFeedback('correct');
        setShowHint(false);
        setTimeout(() => setFeedback(null), 1000);
        return true;
      } else {
        setFeedback('incorrect');
        setTimeout(() => setFeedback(null), 1500);
        return false;
      }
    } catch (e) {
      return false;
    }
  }, [game, selectedPattern, currentMoveIndex, isPlayerTurn, practiceComplete]);

  const onSquareClick = useCallback((square: string) => {
    if (!selectedPattern || !isPlayerTurn() || practiceComplete) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare) {
      const moveSuccessful = onDrop(selectedSquare, square);
      setSelectedSquare(null);
      if (moveSuccessful) return;
    }

    const piece = game.get(square as any);
    if (piece) {
      const isWhitePiece = piece.color === 'w';
      const isPlayerPiece = (selectedPattern.play_as === 'white' && isWhitePiece) || 
                            (selectedPattern.play_as === 'black' && !isWhitePiece);
      if (isPlayerPiece) {
        setSelectedSquare(square);
        return;
      }
    }
    
    setSelectedSquare(null);
  }, [selectedPattern, selectedSquare, isPlayerTurn, practiceComplete, game, onDrop]);

  const customSquareStyles = useMemo(() => {
    if (!selectedSquare) return {};
    
    const styles: Record<string, React.CSSProperties> = {
      [selectedSquare]: {
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
      }
    };

    const legalMoves = game.moves({ square: selectedSquare as any, verbose: true });
    
    legalMoves.forEach(move => {
      const targetSquare = move.to;
      const isCapture = game.get(targetSquare as any);
      
      if (isCapture) {
        styles[targetSquare] = {
          background: 'radial-gradient(transparent 0%, transparent 60%, rgba(0, 0, 0, 0.2) 60%, rgba(0, 0, 0, 0.2) 100%)',
        };
      } else {
        styles[targetSquare] = {
          background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.2) 25%, transparent 25%)',
        };
      }
    });

    return styles;
  }, [selectedSquare, game]);

  const boardOrientation = selectedPattern?.play_as === 'black' ? 'black' : 'white';

  if (isLoadingPatterns) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Loading Tactical Patterns</h3>
          <p className="text-sm text-muted-foreground">Preparing your training library...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Training and Development"
        subtitle="Master tactical patterns and expand your opening repertoire"
      />

      {games.length > 0 && !selectedPattern && (
        <div className="mt-4 max-w-sm">
          <ColorSubTabs value={side} onChange={setSide} />
        </div>
      )}

      {selectedPattern ? (
        /* Practice View */
        <div className="mt-4 space-y-4">
          <Button variant="ghost" onClick={handleBackToList} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Patterns
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chessboard */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-lg">{selectedPattern.name}</h3>
                    <Badge className={getDifficultyColor(selectedPattern.difficulty)}>
                      {selectedPattern.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Playing as {selectedPattern.play_as === 'white' ? '♔ White' : '♚ Black'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetPractice} className="gap-1">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="aspect-square max-w-2xl mx-auto">
                  <Chessboard
                    id="tactical-trainer"
                    position={game.fen()}
                    onPieceDrop={(sourceSquare, targetSquare) => {
                      if (!targetSquare) return false;
                      setSelectedSquare(null);
                      return onDrop(sourceSquare, targetSquare);
                    }}
                    onSquareClick={onSquareClick}
                    boardOrientation={boardOrientation}
                    customSquareStyles={customSquareStyles}
                    customBoardStyle={{
                      borderRadius: '8px',
                      boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)'
                    }}
                    customDarkSquareStyle={{ backgroundColor: 'hsl(217, 91%, 35%)' }}
                    customLightSquareStyle={{ backgroundColor: 'hsl(0, 0%, 85%)' }}
                  />
                </div>

                {/* Feedback */}
                <div className="mt-4 text-center">
                  {feedback === 'correct' && (
                    <div className="flex items-center justify-center gap-2 text-green-500">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Correct!</span>
                    </div>
                  )}
                  {feedback === 'incorrect' && (
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Try again</span>
                    </div>
                  )}
                  {practiceComplete && (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Pattern complete! Great job!</span>
                    </div>
                  )}
                  {!feedback && !practiceComplete && isPlayerTurn() && (
                    <p className="text-sm text-muted-foreground">Your turn - play the next move</p>
                  )}
                  {!feedback && !practiceComplete && !isPlayerTurn() && currentMoveIndex < selectedPattern.moves.length && (
                    <p className="text-sm text-muted-foreground">Opponent is thinking...</p>
                  )}
                </div>

                {/* Hint */}
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHint(!showHint)}
                    disabled={!isPlayerTurn() || practiceComplete}
                  >
                    <Lightbulb className="h-4 w-4 mr-1" />
                    {showHint ? 'Hide Hint' : 'Show Hint'}
                  </Button>
                </div>
                
                {showHint && currentMoveIndex < selectedPattern.moves.length && (
                  <div className="mt-2 text-center">
                    <p className="text-sm text-primary font-mono">
                      Next move: {selectedPattern.moves[currentMoveIndex]}
                    </p>
                  </div>
                )}

                {/* Progress */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{currentMoveIndex} / {selectedPattern.moves.length} moves</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(currentMoveIndex / selectedPattern.moves.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground mb-2">Key Idea</p>
                <p className="text-sm text-muted-foreground">{selectedPattern.key_idea}</p>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Full Sequence</p>
                  <p className="text-sm font-mono text-foreground">
                    {selectedPattern.moves.map((move, i) => (
                      <span key={i} className={i < currentMoveIndex ? 'text-primary' : ''}>
                        {move}{i < selectedPattern.moves.length - 1 ? ' ' : ''}
                      </span>
                    ))}
                  </p>
                </div>

                {selectedPattern.tags && selectedPattern.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPattern.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pattern List View */
        <div className="mt-6">
          {games.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* AI Recommended Tactics Section */}
              <SectionCard
                title="Recommended Tactics"
                description="AI-selected patterns based on your games"
              >
                {isLoadingRecs ? (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Analyzing your games...</span>
                  </div>
                ) : recommendations.filter((p) => p.play_as === side).length > 0 ? (
                  <div className="grid gap-4">
                    {recommendations
                      .filter((p) => p.play_as === side)
                      .map((pattern) => {
                      const CategoryIcon = getCategoryIcon(pattern.category);
                      return (
                        <button
                          key={pattern.id}
                          onClick={() => handleSelectPattern(pattern)}
                          className="text-left rounded-xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/50 group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <CategoryIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground truncate">{pattern.name}</h3>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={getDifficultyColor(pattern.difficulty)}>
                                  {pattern.difficulty}
                                </Badge>
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Recommended
                                </Badge>
                              </div>
                              {pattern.recommendation_reason && (
                                <p className="text-xs text-primary mt-2">{pattern.recommendation_reason}</p>
                              )}
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {pattern.key_idea}
                              </p>
                              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="capitalize">{pattern.category}</span>
                                <span>•</span>
                                <span>{pattern.play_as === 'white' ? '♔' : '♚'}</span>
                                <span>•</span>
                                <span>{pattern.moves.length} {pattern.moves.length === 1 ? 'move' : 'moves'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                            <p className="text-xs font-mono text-muted-foreground truncate flex-1">
                              {pattern.moves.slice(0, 3).join(' ')}
                              {pattern.moves.length > 3 && '...'}
                            </p>
                            <Play className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-4 text-muted-foreground">
                    <Brain className="h-5 w-5" />
                    <span className="text-sm">No recommendations for this side yet</span>
                  </div>
                )}
              </SectionCard>

              {/* Recommended Openings Section */}
              <SectionCard
                title="Recommended Openings"
                description="AI-suggested openings to expand your repertoire"
              >
                {isLoadingOpenings ? (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Finding new openings for you...</span>
                  </div>
                ) : recommendedOpenings.filter((o) => !o.color || o.color === side).length > 0 ? (
                  <div className="grid gap-4">
                    {recommendedOpenings
                      .filter((o) => !o.color || o.color === side)
                      .map((opening) => (
                      <div
                        key={opening.bucket}
                        className="text-left rounded-xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/50 group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Brain className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground truncate">{opening.name}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Recommended
                              </Badge>
                            </div>
                            <p className="text-xs text-primary mt-2">{opening.reason}</p>
                            <div className="mt-3 space-y-2">
                              {opening.lines.slice(0, 2).map((line, idx) => (
                                <div key={idx} className="text-sm">
                                  <p className="font-medium text-foreground">{line.name}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{line.keyIdea}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{opening.lines.length} {opening.lines.length === 1 ? 'line' : 'lines'} to explore</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                          <p className="text-xs font-mono text-muted-foreground truncate flex-1">
                            {opening.lines[0]?.moves.slice(0, 4).join(' ')}...
                          </p>
                          <Play className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-4 text-muted-foreground">
                    <Brain className="h-5 w-5" />
                    <span className="text-sm">No opening recommendations for this side yet</span>
                  </div>
                )}
              </SectionCard>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};
