import { useState, useCallback, useEffect, useMemo } from 'react';
import { Game, FilterState, OPENING_LABELS } from '@/types/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/layout/SectionCard';
import { CoachChat } from './CoachChat';
import { PracticeLine } from './PracticeBoard';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

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
  
  // Practice board state (matching OpeningTrainingPage)
  const [game, setGame] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  
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

  const resetPractice = useCallback(() => {
    setGame(new Chess());
    setCurrentMoveIndex(0);
    setFeedback(null);
    setShowHint(false);
    setPracticeComplete(false);
    setSelectedSquare(null);
  }, []);

  const handlePracticeLineSelected = (line: PracticeLine, color: 'white' | 'black') => {
    setPracticeLine(line);
    setPracticeColor(color);
    resetPractice();
  };

  const handleBackToConversation = () => {
    setPracticeLine(null);
    resetPractice();
  };

  const isPlayerTurn = useCallback(() => {
    if (!practiceLine) return false;
    const isWhiteTurn = game.turn() === 'w';
    return (practiceColor === 'white' && isWhiteTurn) || (practiceColor === 'black' && !isWhiteTurn);
  }, [game, practiceLine, practiceColor]);

  // Make opponent's move automatically
  useEffect(() => {
    if (!practiceLine || practiceComplete) return;
    
    const moves = practiceLine.moves;
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
  }, [currentMoveIndex, game, practiceLine, isPlayerTurn, practiceComplete]);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!practiceLine || !isPlayerTurn() || practiceComplete) return false;
    
    const moves = practiceLine.moves;
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
  }, [game, practiceLine, currentMoveIndex, isPlayerTurn, practiceComplete]);

  // Handle click-to-move
  const onSquareClick = useCallback((square: string) => {
    if (!practiceLine || !isPlayerTurn() || practiceComplete) {
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
      const isPlayerPiece = (practiceColor === 'white' && isWhitePiece) || (practiceColor === 'black' && !isWhitePiece);
      if (isPlayerPiece) {
        setSelectedSquare(square);
        return;
      }
    }
    
    setSelectedSquare(null);
  }, [practiceLine, selectedSquare, isPlayerTurn, practiceComplete, game, onDrop, practiceColor]);

  // Custom square styles for selected piece and legal move indicators
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

  const boardOrientation = practiceColor === 'black' ? 'black' : 'white';

  // Render both views, hide one based on practiceLine state to preserve conversation
  return (
    <PageContainer>
      {/* Full-screen practice mode (matching Opening Training exactly) */}
      {practiceLine && (
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
                <Button variant="outline" size="sm" onClick={resetPractice} className="gap-1">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="aspect-square max-w-2xl mx-auto">
                  <Chessboard
                    id="coaching-practice"
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
                      <span className="font-medium">Line complete! Great job!</span>
                    </div>
                  )}
                  {!feedback && !practiceComplete && isPlayerTurn() && (
                    <p className="text-sm text-muted-foreground">Your turn - play the next move</p>
                  )}
                  {!feedback && !practiceComplete && !isPlayerTurn() && currentMoveIndex < practiceLine.moves.length && (
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
                
                {showHint && currentMoveIndex < practiceLine.moves.length && (
                  <div className="mt-2 text-center">
                    <p className="text-sm text-primary font-mono">
                      Next move: {practiceLine.moves[currentMoveIndex]}
                    </p>
                  </div>
                )}

                {/* Progress */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{currentMoveIndex} / {practiceLine.moves.length} moves</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(currentMoveIndex / practiceLine.moves.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Details Sidebar */}
            <div className="space-y-4">
              {/* Color Selection */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground mb-3">Playing as</p>
                <Tabs value={practiceColor} onValueChange={(v) => {
                  setPracticeColor(v as 'white' | 'black');
                  resetPractice();
                }} className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="white">White</TabsTrigger>
                    <TabsTrigger value="black">Black</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Key Idea */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground mb-2">Key Idea</p>
                <p className="text-sm text-muted-foreground">{practiceLine.keyIdea}</p>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Full Line</p>
                  <p className="text-sm font-mono text-foreground">
                    {practiceLine.moves.map((move, i) => (
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
      )}

      {/* Chat mode - always mounted but hidden when practicing */}
      <div className={practiceLine ? 'hidden' : ''}>
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
      </div>
    </PageContainer>
  );
};