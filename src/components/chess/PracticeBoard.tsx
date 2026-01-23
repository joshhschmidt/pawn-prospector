import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, CheckCircle, XCircle, Lightbulb, Play, ArrowLeft } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export interface PracticeLine {
  name: string;
  moves: string[];
  keyIdea: string;
  recommended?: boolean;
}

interface PracticeBoardProps {
  line: PracticeLine | null;
  color: 'white' | 'black';
  onBack?: () => void;
  showBackButton?: boolean;
}

export const PracticeBoard = ({ line, color, onBack, showBackButton = true }: PracticeBoardProps) => {
  const [game, setGame] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const resetPractice = useCallback(() => {
    setGame(new Chess());
    setCurrentMoveIndex(0);
    setFeedback(null);
    setShowHint(false);
    setPracticeComplete(false);
    setSelectedSquare(null);
  }, []);

  // Reset when line changes
  useEffect(() => {
    resetPractice();
  }, [line, resetPractice]);

  const isPlayerTurn = useCallback(() => {
    if (!line) return false;
    const isWhiteTurn = game.turn() === 'w';
    return (color === 'white' && isWhiteTurn) || (color === 'black' && !isWhiteTurn);
  }, [game, line, color]);

  // Make opponent's move automatically
  useEffect(() => {
    if (!line || practiceComplete) return;
    
    const moves = line.moves;
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
  }, [currentMoveIndex, game, line, isPlayerTurn, practiceComplete]);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!line || !isPlayerTurn() || practiceComplete) return false;
    
    const moves = line.moves;
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
  }, [game, line, currentMoveIndex, isPlayerTurn, practiceComplete]);

  // Handle click-to-move
  const onSquareClick = useCallback((square: string) => {
    if (!line || !isPlayerTurn() || practiceComplete) {
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
      const isPlayerPiece = (color === 'white' && isWhitePiece) || (color === 'black' && !isWhitePiece);
      if (isPlayerPiece) {
        setSelectedSquare(square);
        return;
      }
    }
    
    setSelectedSquare(null);
  }, [line, selectedSquare, isPlayerTurn, practiceComplete, game, onDrop, color]);

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

  const boardOrientation = color === 'black' ? 'black' : 'white';

  if (!line) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Play className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-semibold text-foreground mb-2">Practice Board</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Ask your coach to suggest an opening line to practice, then click "Practice" to start.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showBackButton && onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{line.name}</h3>
          <p className="text-xs text-muted-foreground">Playing as {color}</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetPractice} className="gap-1">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="aspect-square max-w-md mx-auto">
          <Chessboard
            id="practice-board"
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
          {!feedback && !practiceComplete && !isPlayerTurn() && currentMoveIndex < line.moves.length && (
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
        
        {showHint && currentMoveIndex < line.moves.length && (
          <div className="mt-2 text-center">
            <p className="text-sm text-primary font-mono">
              Next move: {line.moves[currentMoveIndex]}
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{currentMoveIndex} / {line.moves.length} moves</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentMoveIndex / line.moves.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Key Idea */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Key Idea</p>
          <p className="text-sm text-foreground">{line.keyIdea}</p>
        </div>

        {/* Full Line */}
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Full Line</p>
          <p className="text-xs font-mono text-foreground">
            {line.moves.map((move, i) => (
              <span key={i} className={i < currentMoveIndex ? 'text-primary' : ''}>
                {i % 2 === 0 && <span className="text-muted-foreground">{Math.floor(i/2) + 1}. </span>}
                {move}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
};
