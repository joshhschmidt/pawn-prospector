import { useState, useEffect, useMemo, useCallback } from 'react';
import { Game, FilterState, OpeningBucket, OPENING_LABELS } from '@/types/chess';
import { filterGames, calculateOpeningStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RotateCcw, ChevronRight, CheckCircle, XCircle, Lightbulb, BookOpen, ArrowLeft } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface OpeningTrainingPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

interface OpeningRecommendation {
  name: string;
  reason: string;
  mainLine: string[];
  keyIdeas: string[];
  color: 'white' | 'black';
  difficulty: string;
}

export const OpeningTrainingPage = ({ games, filters, onFiltersChange }: OpeningTrainingPageProps) => {
  const [recommendations, setRecommendations] = useState<OpeningRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOpening, setSelectedOpening] = useState<OpeningRecommendation | null>(null);
  const [colorFilter, setColorFilter] = useState<'white' | 'black'>('white');
  const [isPracticing, setIsPracticing] = useState(false);
  
  // Chess game state
  const [game, setGame] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [playerMoveIndex, setPlayerMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);

  const filteredGames = filterGames(games, filters);
  const openingStats = useMemo(() => {
    const stats = calculateOpeningStats(filteredGames);
    return stats.map(s => ({
      ...s,
      label: OPENING_LABELS[s.bucket] || s.bucket.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  }, [filteredGames]);
  
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  const fetchRecommendations = async () => {
    if (openingStats.length === 0) {
      setError('No opening data available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('opening-trainer', {
        body: { openingStats, playerColor: colorFilter }
      });

      if (fnError) throw fnError;
      
      setRecommendations(data?.recommendations || []);
      if (data?.recommendations?.length > 0) {
        setSelectedOpening(data.recommendations[0]);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to get recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (openingStats.length > 0) {
      fetchRecommendations();
    }
  }, [colorFilter]);

  // Reset board when opening changes
  useEffect(() => {
    if (selectedOpening && isPracticing) {
      resetPractice();
    }
  }, [selectedOpening, isPracticing]);

  const resetPractice = useCallback(() => {
    setGame(new Chess());
    setCurrentMoveIndex(0);
    setPlayerMoveIndex(0);
    setFeedback(null);
    setShowHint(false);
    setPracticeComplete(false);
  }, []);

  const handleSelectOpening = (opening: OpeningRecommendation) => {
    setSelectedOpening(opening);
    setIsPracticing(true);
  };

  const handleBackToList = () => {
    setIsPracticing(false);
    setSelectedOpening(null);
  };

  // Determine if it's player's turn based on the opening color
  const isPlayerTurn = useCallback(() => {
    if (!selectedOpening) return false;
    const isWhiteTurn = game.turn() === 'w';
    return (selectedOpening.color === 'white' && isWhiteTurn) || 
           (selectedOpening.color === 'black' && !isWhiteTurn);
  }, [game, selectedOpening]);

  // Make opponent's move automatically
  useEffect(() => {
    if (!selectedOpening || practiceComplete) return;
    
    const mainLine = selectedOpening.mainLine;
    if (currentMoveIndex >= mainLine.length) {
      setPracticeComplete(true);
      return;
    }

    if (!isPlayerTurn() && currentMoveIndex < mainLine.length) {
      const timer = setTimeout(() => {
        try {
          const newGame = new Chess(game.fen());
          newGame.move(mainLine[currentMoveIndex]);
          setGame(newGame);
          setCurrentMoveIndex(prev => prev + 1);
        } catch (e) {
          console.error('Invalid opponent move:', mainLine[currentMoveIndex]);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentMoveIndex, game, selectedOpening, isPlayerTurn, practiceComplete]);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!selectedOpening || !isPlayerTurn() || practiceComplete) return false;
    
    const mainLine = selectedOpening.mainLine;
    if (currentMoveIndex >= mainLine.length) return false;

    const expectedMove = mainLine[currentMoveIndex];
    
    try {
      const newGame = new Chess(game.fen());
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (!move) return false;

      // Check if move matches expected
      const moveNotation = move.san;
      if (moveNotation === expectedMove || 
          moveNotation.replace('+', '').replace('#', '') === expectedMove.replace('+', '').replace('#', '')) {
        setGame(newGame);
        setCurrentMoveIndex(prev => prev + 1);
        setPlayerMoveIndex(prev => prev + 1);
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
  }, [game, selectedOpening, currentMoveIndex, isPlayerTurn, practiceComplete]);

  const boardOrientation = selectedOpening?.color === 'black' ? 'black' : 'white';

  return (
    <PageContainer>
      <PageHeader 
        title="Opening Training"
        subtitle="Practice AI-recommended opening lines based on your games"
      />

      <StickyFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableOpenings={availableOpenings}
        totalGames={games.length}
        filteredCount={filteredGames.length}
      />

      {/* Color Filter */}
      <div className="mt-6">
        <Tabs value={colorFilter} onValueChange={(v) => setColorFilter(v as 'white' | 'black')} className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-2">
            <TabsTrigger value="white">As White</TabsTrigger>
            <TabsTrigger value="black">As Black</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Analyzing Your Openings</h3>
          <p className="text-sm text-muted-foreground">Finding the best lines for you to practice...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : isPracticing && selectedOpening ? (
          /* Practice View - Large Chessboard */
          <div className="mt-4 space-y-4">
            <Button variant="ghost" onClick={handleBackToList} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Openings
            </Button>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Chessboard - Takes 2/3 of the screen */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-lg">{selectedOpening.name}</h3>
                  <Button variant="outline" size="sm" onClick={resetPractice} className="gap-1">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="aspect-square max-w-2xl mx-auto">
                    <Chessboard
                      id="opening-trainer"
                      position={game.fen()}
                      onPieceDrop={(sourceSquare, targetSquare) => {
                        if (!targetSquare) return false;
                        return onDrop(sourceSquare, targetSquare);
                      }}
                      boardOrientation={boardOrientation}
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
                        <span className="font-medium">Line complete! Great job!</span>
                      </div>
                    )}
                    {!feedback && !practiceComplete && isPlayerTurn() && (
                      <p className="text-sm text-muted-foreground">Your turn - play the next move</p>
                    )}
                    {!feedback && !practiceComplete && !isPlayerTurn() && currentMoveIndex < (selectedOpening?.mainLine.length || 0) && (
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
                  
                  {showHint && selectedOpening && currentMoveIndex < selectedOpening.mainLine.length && (
                    <div className="mt-2 text-center">
                      <p className="text-sm text-primary font-mono">
                        Next move: {selectedOpening.mainLine[currentMoveIndex]}
                      </p>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>Progress</span>
                      <span>{currentMoveIndex} / {selectedOpening.mainLine.length} moves</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(currentMoveIndex / selectedOpening.mainLine.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Opening Details Sidebar */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground mb-4">{selectedOpening.reason}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Main Line</p>
                      <p className="text-sm font-mono text-foreground">
                        {selectedOpening.mainLine.map((move, i) => (
                          <span key={i} className={i < currentMoveIndex ? 'text-primary' : ''}>
                            {i % 2 === 0 && <span className="text-muted-foreground">{Math.floor(i/2) + 1}. </span>}
                            {move}{' '}
                          </span>
                        ))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Key Ideas</p>
                      <ul className="text-sm text-foreground space-y-1">
                        {selectedOpening.keyIdeas.map((idea, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {idea}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View - Full Width Recommendations */
          <div className="mt-4 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Recommended Openings
            </h3>
            
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectOpening(rec)}
                  className="w-full text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{rec.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{rec.reason}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Main Line</p>
                    <p className="text-xs font-mono text-foreground truncate">
                      {rec.mainLine.slice(0, 6).map((move, i) => (
                        <span key={i}>
                          {i % 2 === 0 && <span className="text-muted-foreground">{Math.floor(i/2) + 1}.</span>}
                          {move}{' '}
                        </span>
                      ))}
                      {rec.mainLine.length > 6 && '...'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {recommendations.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Import more games to get personalized opening recommendations.</p>
              </div>
            )}
        </div>
      )}
    </PageContainer>
  );
};
