import { useState, useCallback, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Crosshair
} from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface TacticalPattern {
  id: string;
  name: string;
  category: 'attacks' | 'traps' | 'checkmates';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  fen: string;
  moves: string[];
  keyIdea: string;
  playAs: 'white' | 'black';
}

const TACTICAL_PATTERNS: TacticalPattern[] = [
  // Attacks
  {
    id: 'greek-gift',
    name: 'Greek Gift Sacrifice',
    category: 'attacks',
    difficulty: 'intermediate',
    fen: 'r1bq1rk1/pppn1ppp/4pn2/3p4/3P4/3BPN2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    moves: ['Bxh7+', 'Kxh7', 'Ng5+', 'Kg8', 'Qh5'],
    keyIdea: 'Sacrifice the bishop on h7 to expose the king, then bring in the knight and queen for a devastating attack.',
    playAs: 'white'
  },
  {
    id: 'fried-liver',
    name: 'Fried Liver Attack',
    category: 'attacks',
    difficulty: 'intermediate',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    moves: ['Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7'],
    keyIdea: 'Attack f7 with queen and bishop, then sacrifice the knight to fork king and rook.',
    playAs: 'white'
  },
  {
    id: 'reti-smothered',
    name: 'Réti Smothered Mate',
    category: 'attacks',
    difficulty: 'advanced',
    fen: 'r1b1k2r/pppp1ppp/2n2n2/2b1p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 6 5',
    moves: ['Qxf7+', 'Ke7', 'Qxe5+', 'Be6', 'Qxc5+'],
    keyIdea: 'Force the king into the center with queen checks, picking up material along the way.',
    playAs: 'white'
  },
  // Traps
  {
    id: 'legal-trap',
    name: 'Légal Trap',
    category: 'traps',
    difficulty: 'beginner',
    fen: 'r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
    moves: ['Nc3', 'Bg4', 'h3', 'Bh5', 'Nxe5'],
    keyIdea: 'Pin the knight to bait the bishop, then sacrifice the queen for a checkmate with the knights.',
    playAs: 'white'
  },
  {
    id: 'noahs-ark',
    name: "Noah's Ark Trap",
    category: 'traps',
    difficulty: 'intermediate',
    fen: 'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    moves: ['c3', 'b5', 'Bc2', 'd5', 'exd5'],
    keyIdea: 'As Black, trap White\'s light-squared bishop on a4/b3 with advancing pawns.',
    playAs: 'black'
  },
  {
    id: 'fishing-pole',
    name: 'Fishing Pole Trap',
    category: 'traps',
    difficulty: 'intermediate',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    moves: ['Ng5', 'O-O', 'Nxf7', 'Rxf7', 'Bxf7+'],
    keyIdea: 'Bait the opponent into taking on f7, leading to a winning attack or material gain.',
    playAs: 'white'
  },
  // Checkmates
  {
    id: 'smothered-mate',
    name: 'Smothered Mate',
    category: 'checkmates',
    difficulty: 'advanced',
    fen: '6rk/5Npp/8/8/8/8/8/4K2R w - - 0 1',
    moves: ['Nf7+', 'Kg8', 'Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'],
    keyIdea: 'Use the knight to force the king into a corner, then sacrifice the queen to deliver mate with the knight.',
    playAs: 'white'
  },
  {
    id: 'back-rank',
    name: 'Back Rank Mate',
    category: 'checkmates',
    difficulty: 'beginner',
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    moves: ['Ra8'],
    keyIdea: 'Exploit the lack of escape squares for the enemy king on the back rank.',
    playAs: 'white'
  },
  {
    id: 'anastasia',
    name: "Anastasia's Mate",
    category: 'checkmates',
    difficulty: 'advanced',
    fen: '4r1k1/5Npp/8/8/8/8/8/4R1K1 w - - 0 1',
    moves: ['Qh5', 'Ne7', 'Qxa5'],
    keyIdea: 'Knight and rook coordinate to trap the king on the h-file with a pawn barrier.',
    playAs: 'white'
  },
  {
    id: 'arabian',
    name: 'Arabian Mate',
    category: 'checkmates',
    difficulty: 'intermediate',
    fen: '7k/7R/5N2/8/8/8/8/4K3 w - - 0 1',
    moves: ['Rh8#'],
    keyIdea: 'Knight on f6 controls escape squares while the rook delivers mate on the back rank.',
    playAs: 'white'
  },
  {
    id: 'bodens',
    name: "Boden's Mate",
    category: 'checkmates',
    difficulty: 'advanced',
    fen: '2kr4/ppp5/2n5/3B4/8/8/8/2B1K3 w - - 0 1',
    moves: ['Bxc6+', 'bxc6', 'Ba3#'],
    keyIdea: 'Two bishops on crossing diagonals deliver checkmate when the king is blocked by its own pieces.',
    playAs: 'white'
  }
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'attacks': return Swords;
    case 'traps': return Target;
    case 'checkmates': return Crown;
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

export const TacticalTrainingPage = () => {
  const [category, setCategory] = useState<'all' | 'attacks' | 'traps' | 'checkmates'>('all');
  const [selectedPattern, setSelectedPattern] = useState<TacticalPattern | null>(null);
  
  // Practice state
  const [game, setGame] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const filteredPatterns = category === 'all' 
    ? TACTICAL_PATTERNS 
    : TACTICAL_PATTERNS.filter(p => p.category === category);

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
    return (selectedPattern.playAs === 'white' && isWhiteTurn) || 
           (selectedPattern.playAs === 'black' && !isWhiteTurn);
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
      const isPlayerPiece = (selectedPattern.playAs === 'white' && isWhitePiece) || 
                            (selectedPattern.playAs === 'black' && !isWhitePiece);
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

  const boardOrientation = selectedPattern?.playAs === 'black' ? 'black' : 'white';

  return (
    <PageContainer>
      <PageHeader 
        title="Tactical Training"
        subtitle="Master essential tactical patterns and combinations"
      />

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
                    Playing as {selectedPattern.playAs === 'white' ? '♔ White' : '♚ Black'}
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
                <p className="text-sm text-muted-foreground">{selectedPattern.keyIdea}</p>
                
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
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pattern List View */
        <div className="mt-6 space-y-6">
          {/* Category Filter */}
          <Tabs value={category} onValueChange={(v) => setCategory(v as any)} className="w-full">
            <TabsList className="mb-4 w-full grid grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="attacks">Attacks</TabsTrigger>
              <TabsTrigger value="traps">Traps</TabsTrigger>
              <TabsTrigger value="checkmates">Checkmates</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Pattern Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPatterns.map((pattern) => {
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{pattern.name}</h3>
                        <Badge className={getDifficultyColor(pattern.difficulty)}>
                          {pattern.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {pattern.keyIdea}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{pattern.category}</span>
                        <span>•</span>
                        <span>Play as {pattern.playAs === 'white' ? '♔' : '♚'}</span>
                        <span>•</span>
                        <span>{pattern.moves.length} moves</span>
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
        </div>
      )}
    </PageContainer>
  );
};
