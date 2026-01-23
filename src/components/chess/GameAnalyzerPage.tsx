import { useState, useMemo, useEffect } from 'react';
import { Game, FilterState, OpeningBucket, OPENING_LABELS, TIME_CONTROL_LABELS } from '@/types/chess';
import { filterGames } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  ArrowLeft, 
  Loader2, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  Trophy,
  Shield,
  Lightbulb,
  ChevronRight,
  RotateCcw,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface GameAnalyzerPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

interface CriticalMoment {
  moveNumber: number;
  move: string;
  playerColor: 'white' | 'black';
  classification: 'blunder' | 'missed_tactic' | 'turning_point' | 'winning_move' | 'defensive_resource';
  explanation: string;
  alternative: string;
  alternativeExplanation: string;
  fen?: string;
}

interface GameAnalysis {
  summary: string;
  moments: CriticalMoment[];
}

const classificationConfig: Record<CriticalMoment['classification'], { icon: typeof AlertTriangle; label: string; color: string }> = {
  blunder: { icon: AlertTriangle, label: 'Blunder', color: 'bg-destructive/20 text-destructive border-destructive/30' },
  missed_tactic: { icon: Target, label: 'Missed Tactic', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
  turning_point: { icon: TrendingUp, label: 'Turning Point', color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  winning_move: { icon: Trophy, label: 'Winning Move', color: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' },
  defensive_resource: { icon: Shield, label: 'Defense', color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30' },
};

export const GameAnalyzerPage = ({ games, filters, onFiltersChange }: GameAnalyzerPageProps) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');
  const [expandedMoment, setExpandedMoment] = useState<CriticalMoment | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [analysisCache, setAnalysisCache] = useState<Map<string, GameAnalysis>>(new Map());

  const filteredGames = useMemo(() => {
    let result = filterGames(games, filters);
    if (resultFilter !== 'all') {
      result = result.filter(g => g.result === resultFilter);
    }
    // Sort by date descending
    return result.sort((a, b) => {
      const dateA = a.game_date ? new Date(a.game_date).getTime() : 0;
      const dateB = b.game_date ? new Date(b.game_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [games, filters, resultFilter]);

  const availableOpenings = useMemo(() => {
    const openings = new Set<OpeningBucket>();
    games.forEach(game => {
      if (game.opening_bucket) openings.add(game.opening_bucket);
    });
    return Array.from(openings);
  }, [games]);

  // Generate FEN positions for each moment when analysis is complete
  useEffect(() => {
    if (analysis && selectedGame?.moves) {
      const momentsWithFen = analysis.moments.map(moment => {
        const chess = new Chess();
        const targetMoveIndex = (moment.moveNumber - 1) * 2 + (moment.playerColor === 'black' ? 1 : 0);
        
        // Play moves up to the position BEFORE the decisive move
        for (let i = 0; i < targetMoveIndex && i < selectedGame.moves!.length; i++) {
          try {
            chess.move(selectedGame.moves![i]);
          } catch (e) {
            console.warn(`Failed to play move ${i}: ${selectedGame.moves![i]}`);
            break;
          }
        }
        
        return { ...moment, fen: chess.fen() };
      });
      
      setAnalysis(prev => prev ? { ...prev, moments: momentsWithFen } : null);
    }
  }, [analysis?.summary, selectedGame]);

  const analyzeGame = async (game: Game) => {
    setSelectedGame(game);
    
    // Check cache first
    if (analysisCache.has(game.id)) {
      setAnalysis(analysisCache.get(game.id)!);
      return;
    }

    if (!game.moves || game.moves.length === 0) {
      toast.error('This game has no moves to analyze');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-game', {
        body: {
          moves: game.moves,
          playerColor: game.player_color,
          result: game.result,
          opening: game.opening_bucket ? OPENING_LABELS[game.opening_bucket] : 'Unknown',
          opponentName: game.opponent_name
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data);
      setAnalysisCache(prev => new Map(prev).set(game.id, data));
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze game');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBack = () => {
    setSelectedGame(null);
    setAnalysis(null);
    setExpandedMoment(null);
  };

  const handleExpandMoment = (moment: CriticalMoment) => {
    setExpandedMoment(moment);
    // Calculate the move index for this moment
    const moveIndex = (moment.moveNumber - 1) * 2 + (moment.playerColor === 'black' ? 1 : 0);
    setCurrentMoveIndex(moveIndex);
  };

  const getCurrentFen = () => {
    if (!selectedGame?.moves) return 'start';
    const chess = new Chess();
    for (let i = 0; i <= currentMoveIndex && i < selectedGame.moves.length; i++) {
      try {
        chess.move(selectedGame.moves[i]);
      } catch (e) {
        break;
      }
    }
    return chess.fen();
  };

  const resultBadgeColor = (result: string) => {
    switch (result) {
      case 'win': return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'loss': return 'bg-destructive/20 text-destructive';
      case 'draw': return 'bg-muted text-muted-foreground';
      default: return '';
    }
  };

  // Expanded moment view
  if (expandedMoment && selectedGame) {
    return (
      <PageContainer>
        <div className="mb-4">
          <Button variant="ghost" onClick={() => setExpandedMoment(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Analysis
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chessboard */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Move {expandedMoment.moveNumber}. {expandedMoment.move}</CardTitle>
                <Badge className={cn('border', classificationConfig[expandedMoment.classification].color)}>
                  {classificationConfig[expandedMoment.classification].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-square max-w-md mx-auto">
                <Chessboard
                  position={getCurrentFen()}
                  boardOrientation={selectedGame.player_color}
                  arePiecesDraggable={false}
                />
              </div>
              
              {/* Move navigation */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMoveIndex(0)}
                  disabled={currentMoveIndex === 0}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1))}
                  disabled={currentMoveIndex === 0}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Move {Math.floor(currentMoveIndex / 2) + 1}{currentMoveIndex % 2 === 0 ? '.' : '...'}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMoveIndex(Math.min((selectedGame.moves?.length || 1) - 1, currentMoveIndex + 1))}
                  disabled={currentMoveIndex >= (selectedGame.moves?.length || 1) - 1}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analysis panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-accent" />
                  Why This Was Decisive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{expandedMoment.explanation}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Better Alternative: {expandedMoment.alternative}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{expandedMoment.alternativeExplanation}</p>
              </CardContent>
            </Card>

            {/* Move list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Move List</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="flex flex-wrap gap-1">
                    {selectedGame.moves?.map((move, idx) => {
                      const isWhite = idx % 2 === 0;
                      const moveNum = Math.floor(idx / 2) + 1;
                      const isCurrentMove = idx === currentMoveIndex;
                      const isCriticalMove = idx === (expandedMoment.moveNumber - 1) * 2 + (expandedMoment.playerColor === 'black' ? 1 : 0);
                      
                      return (
                        <span key={idx} className="inline-flex items-center">
                          {isWhite && <span className="text-muted-foreground mr-1">{moveNum}.</span>}
                          <button
                            onClick={() => setCurrentMoveIndex(idx)}
                            className={cn(
                              'px-1 py-0.5 rounded text-sm transition-colors',
                              isCurrentMove && 'bg-primary text-primary-foreground',
                              isCriticalMove && !isCurrentMove && 'bg-accent/30 text-accent font-medium',
                              !isCurrentMove && !isCriticalMove && 'hover:bg-muted'
                            )}
                          >
                            {move}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Analysis view
  if (selectedGame) {
    return (
      <PageContainer>
        <div className="mb-4">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Games
          </Button>
        </div>

        <PageHeader
          title={`vs ${selectedGame.opponent_name || 'Unknown'}`}
          subtitle={`${selectedGame.opening_bucket ? OPENING_LABELS[selectedGame.opening_bucket] : 'Unknown Opening'} • ${selectedGame.time_control ? TIME_CONTROL_LABELS[selectedGame.time_control] : ''}`}
        />

        <div className="flex items-center gap-2 mb-6">
          <Badge className={cn('border', resultBadgeColor(selectedGame.result))}>
            {selectedGame.result.charAt(0).toUpperCase() + selectedGame.result.slice(1)}
          </Badge>
          <Badge variant="outline">
            Playing as {selectedGame.player_color}
          </Badge>
          {selectedGame.game_date && (
            <Badge variant="outline">
              {format(new Date(selectedGame.game_date), 'MMM d, yyyy')}
            </Badge>
          )}
        </div>

        {isAnalyzing ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Analyzing Game...</p>
                <p className="text-sm text-muted-foreground">Finding decisive moments</p>
              </div>
            </div>
          </Card>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-lg">{analysis.summary}</p>
              </CardContent>
            </Card>

            {/* Decisive moments */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{analysis.moments.length} Decisive Moments Found</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                  {analysis.moments.map((moment, idx) => {
                    const config = classificationConfig[moment.classification];
                    const Icon = config.icon;
                    
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card 
                          className="cursor-pointer hover:border-primary/50 transition-colors h-full"
                          onClick={() => handleExpandMoment(moment)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">Move {moment.moveNumber}</span>
                              <Badge className={cn('border text-xs', config.color)}>
                                <Icon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            <CardTitle className="text-xl">{moment.move}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {/* Mini board */}
                            {moment.fen && (
                              <div className="aspect-square mb-3 rounded overflow-hidden">
                                <Chessboard
                                  position={moment.fen}
                                  boardOrientation={selectedGame.player_color}
                                  arePiecesDraggable={false}
                                  customBoardStyle={{ 
                                    borderRadius: '4px'
                                  }}
                                />
                              </div>
                            )}
                            
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {moment.explanation}
                            </p>
                            
                            <div className="flex items-center text-sm text-primary">
                              <span>View Details</span>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : null}
      </PageContainer>
    );
  }

  // Game list view
  return (
    <PageContainer>
      <PageHeader
        title="Game Analyzer"
        subtitle="Select a game to identify decisive moments"
      />

      <StickyFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        totalGames={games.length}
        filteredCount={filteredGames.length}
        availableOpenings={availableOpenings}
      />

      <Tabs value={resultFilter} onValueChange={(v) => setResultFilter(v as typeof resultFilter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All Games</TabsTrigger>
          <TabsTrigger value="win">Wins</TabsTrigger>
          <TabsTrigger value="loss">Losses</TabsTrigger>
          <TabsTrigger value="draw">Draws</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredGames.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="font-medium">No games found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          </div>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="space-y-2">
            {filteredGames.map(game => (
              <Card 
                key={game.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => analyzeGame(game)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge className={cn('border', resultBadgeColor(game.result))}>
                        {game.result === 'win' ? 'W' : game.result === 'loss' ? 'L' : 'D'}
                      </Badge>
                      <div>
                        <p className="font-medium">vs {game.opponent_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {game.opening_bucket ? OPENING_LABELS[game.opening_bucket] : 'Unknown Opening'}
                          {game.time_control && ` • ${TIME_CONTROL_LABELS[game.time_control]}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {game.game_date && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(game.game_date), 'MMM d')}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {game.player_color === 'white' ? '♔' : '♚'} {game.total_moves} moves
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </PageContainer>
  );
};
