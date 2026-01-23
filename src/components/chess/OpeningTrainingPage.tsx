import { useState, useEffect, useMemo, useCallback } from 'react';
import { Game, FilterState, OpeningBucket, OPENING_LABELS } from '@/types/chess';
import { filterGames, calculateOpeningStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RotateCcw, ChevronDown, CheckCircle, XCircle, Lightbulb, Trophy, ArrowLeft, Play } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface OpeningTrainingPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

interface PracticeLine {
  name: string;
  moves: string[];
  keyIdea: string;
}

interface OpeningWithLines {
  bucket: string;
  name: string;
  lines: PracticeLine[];
  winRate: number;
  games: number;
}

interface SelectedLine {
  opening: OpeningWithLines;
  line: PracticeLine;
  color: 'white' | 'black';
}

export const OpeningTrainingPage = ({ games, filters, onFiltersChange }: OpeningTrainingPageProps) => {
  const [openingsWithLines, setOpeningsWithLines] = useState<OpeningWithLines[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorFilter, setColorFilter] = useState<'white' | 'black'>('white');
  const [expandedOpenings, setExpandedOpenings] = useState<string[]>([]);
  
  // Practice mode state
  const [selectedLine, setSelectedLine] = useState<SelectedLine | null>(null);
  const [game, setGame] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);

  const filteredGames = filterGames(games, filters);
  
  // Calculate top 3 winning openings for the selected color
  const topWinningOpenings = useMemo(() => {
    const colorGames = filteredGames.filter(g => g.player_color === colorFilter);
    const stats = calculateOpeningStats(colorGames);
    
    // Calculate win rate and sort by it
    const withWinRate = stats
      .filter(s => s.games >= 3) // Minimum 3 games for meaningful stats
      .map(s => ({
        ...s,
        label: OPENING_LABELS[s.bucket] || s.bucket.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        winRate: s.wins + s.losses > 0 ? (s.wins / (s.wins + s.losses)) * 100 : 0
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3);
    
    return withWinRate;
  }, [filteredGames, colorFilter]);

  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  const fetchOpeningLines = async () => {
    if (topWinningOpenings.length === 0) {
      setOpeningsWithLines([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('opening-trainer', {
        body: { 
          topOpenings: topWinningOpenings,
          playerColor: colorFilter 
        }
      });

      if (fnError) throw fnError;
      
      // Merge AI-generated lines with our stats
      const openings: OpeningWithLines[] = (data?.openings || []).map((o: any, index: number) => ({
        ...o,
        winRate: topWinningOpenings[index]?.winRate || 0,
        games: topWinningOpenings[index]?.games || 0
      }));
      
      setOpeningsWithLines(openings);
    } catch (err) {
      console.error('Error fetching opening lines:', err);
      setError('Failed to get opening lines. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (topWinningOpenings.length > 0) {
      fetchOpeningLines();
    } else {
      setOpeningsWithLines([]);
    }
  }, [colorFilter, JSON.stringify(topWinningOpenings.map(o => o.bucket))]);

  const toggleOpening = (bucket: string) => {
    setExpandedOpenings(prev => 
      prev.includes(bucket) 
        ? prev.filter(b => b !== bucket)
        : [...prev, bucket]
    );
  };

  const resetPractice = useCallback(() => {
    setGame(new Chess());
    setCurrentMoveIndex(0);
    setFeedback(null);
    setShowHint(false);
    setPracticeComplete(false);
  }, []);

  const handleSelectLine = (opening: OpeningWithLines, line: PracticeLine) => {
    setSelectedLine({ opening, line, color: colorFilter });
    resetPractice();
  };

  const handleBackToList = () => {
    setSelectedLine(null);
  };

  const isPlayerTurn = useCallback(() => {
    if (!selectedLine) return false;
    const isWhiteTurn = game.turn() === 'w';
    return (selectedLine.color === 'white' && isWhiteTurn) || 
           (selectedLine.color === 'black' && !isWhiteTurn);
  }, [game, selectedLine]);

  // Make opponent's move automatically
  useEffect(() => {
    if (!selectedLine || practiceComplete) return;
    
    const moves = selectedLine.line.moves;
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
  }, [currentMoveIndex, game, selectedLine, isPlayerTurn, practiceComplete]);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!selectedLine || !isPlayerTurn() || practiceComplete) return false;
    
    const moves = selectedLine.line.moves;
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
  }, [game, selectedLine, currentMoveIndex, isPlayerTurn, practiceComplete]);

  const boardOrientation = selectedLine?.color === 'black' ? 'black' : 'white';

  return (
    <PageContainer>
      <PageHeader 
        title="Opening Training"
        subtitle="Practice your top winning openings with multiple lines"
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
          <h3 className="font-semibold text-foreground mb-2">Generating Practice Lines</h3>
          <p className="text-sm text-muted-foreground">Finding variations for your best openings...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : selectedLine ? (
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
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{selectedLine.opening.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLine.line.name}</p>
                </div>
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
                  {!feedback && !practiceComplete && !isPlayerTurn() && currentMoveIndex < selectedLine.line.moves.length && (
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
                
                {showHint && currentMoveIndex < selectedLine.line.moves.length && (
                  <div className="mt-2 text-center">
                    <p className="text-sm text-primary font-mono">
                      Next move: {selectedLine.line.moves[currentMoveIndex]}
                    </p>
                  </div>
                )}

                {/* Progress */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{currentMoveIndex} / {selectedLine.line.moves.length} moves</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(currentMoveIndex / selectedLine.line.moves.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Details Sidebar */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground mb-2">Key Idea</p>
                <p className="text-sm text-muted-foreground">{selectedLine.line.keyIdea}</p>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Full Line</p>
                  <p className="text-sm font-mono text-foreground">
                    {selectedLine.line.moves.map((move, i) => (
                      <span key={i} className={i < currentMoveIndex ? 'text-primary' : ''}>
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
      ) : (
        /* List View - Collapsible Opening Cards */
        <div className="mt-4 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Your Top Winning Openings
          </h3>
          
          {openingsWithLines.length === 0 && !isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Import more games to see your top winning openings.</p>
              <p className="text-sm mt-1">You need at least 3 games with an opening to see it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openingsWithLines.map((opening, index) => (
                <Collapsible
                  key={opening.bucket}
                  open={expandedOpenings.includes(opening.bucket)}
                  onOpenChange={() => toggleOpening(opening.bucket)}
                >
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-foreground">{opening.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {opening.winRate.toFixed(0)}% win rate • {opening.games} games
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedOpenings.includes(opening.bucket) ? 'rotate-180' : ''
                      }`} />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t border-border p-4 space-y-3">
                        {opening.lines.map((line, lineIndex) => (
                          <button
                            key={lineIndex}
                            onClick={() => handleSelectLine(opening, line)}
                            className="w-full text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-foreground">{line.name}</h5>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{line.keyIdea}</p>
                              </div>
                              <div className="flex items-center gap-2 text-primary flex-shrink-0 ml-2">
                                <Play className="h-5 w-5" />
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Moves</p>
                              <p className="text-xs font-mono text-foreground truncate">
                                {line.moves.slice(0, 6).map((move, i) => (
                                  <span key={i}>
                                    {i % 2 === 0 && <span className="text-muted-foreground">{Math.floor(i/2) + 1}.</span>}
                                    {move}{' '}
                                  </span>
                                ))}
                                {line.moves.length > 6 && '...'}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};
