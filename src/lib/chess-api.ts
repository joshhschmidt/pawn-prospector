import { supabase } from '@/integrations/supabase/client';
import { Game, TimeControl, GameResult, PlayerColor, OpeningBucket } from '@/types/chess';
import { classifyOpening } from './opening-classifier';
import { parseTimeControl as parseTC } from './pgn-parser';

interface ChessComGame {
  pgn: string;
  url: string;
  time_control: string;
  time_class: string;
  end_time: number;
  player_color: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  opponent_name: string;
  opponent_rating: number;
  player_rating: number;
}

function parseMovesFromPGN(pgn: string): string[] {
  // Extract moves section from PGN
  const lines = pgn.split('\n');
  let movesSection = '';
  let inMoves = false;

  for (const line of lines) {
    if (!line.startsWith('[') && line.trim()) {
      inMoves = true;
      movesSection += ' ' + line;
    }
  }

  // Parse moves
  const cleanMoves = movesSection
    .replace(/\{[^}]*\}/g, '') // Remove comments
    .replace(/\([^)]*\)/g, '') // Remove variations
    .replace(/\$\d+/g, '') // Remove NAGs
    .replace(/\d+\.\.\./g, '') // Remove ... after move numbers
    .replace(/\d+\./g, ' ') // Remove move numbers
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '') // Remove results
    .trim();

  return cleanMoves.split(/\s+/).filter(m => 
    m && m.match(/^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$|^O-O(-O)?[+#]?$/)
  );
}

function mapTimeClass(timeClass: string): TimeControl {
  switch (timeClass) {
    case 'bullet': return 'bullet';
    case 'blitz': return 'blitz';
    case 'rapid': return 'rapid';
    case 'daily': return 'correspondence';
    default: return 'rapid';
  }
}

function analyzeGame(
  pgn: string, 
  playerColor: PlayerColor, 
  result: GameResult
): {
  moves: string[];
  totalMoves: number;
  openingBucket: OpeningBucket | null;
  castledAtPly: number | null;
  queenMovesFirst10: number;
  isQuickLoss: boolean;
  isQuickWin: boolean;
  earlyChecksReceived: number;
  queenTempoLoss: boolean;
  nc7ForkDetected: boolean;
} {
  const moves = parseMovesFromPGN(pgn);
  const totalMoves = Math.ceil(moves.length / 2);
  
  // Opening classification
  const openingBucket = classifyOpening(moves, playerColor);
  
  // Player moves in first 20 plies (10 moves)
  const playerMoveIndices = playerColor === 'white'
    ? moves.slice(0, 20).filter((_, i) => i % 2 === 0)
    : moves.slice(0, 20).filter((_, i) => i % 2 === 1);
  
  // Queen moves in first 10 moves
  const queenMovesFirst10 = playerMoveIndices.filter(m => 
    m.startsWith('Q') || m.startsWith('Qx')
  ).length;
  
  // Castling ply
  let castledAtPly: number | null = null;
  const playerMoves = playerColor === 'white'
    ? moves.filter((_, i) => i % 2 === 0)
    : moves.filter((_, i) => i % 2 === 1);
  
  const castlingIndex = playerMoves.findIndex(m => m === 'O-O' || m === 'O-O-O');
  if (castlingIndex !== -1) {
    castledAtPly = playerColor === 'white'
      ? castlingIndex * 2 + 1
      : castlingIndex * 2 + 2;
  }
  
  // Early checks received
  const opponentMoves = playerColor === 'white'
    ? moves.slice(0, 12).filter((_, i) => i % 2 === 1)
    : moves.slice(0, 12).filter((_, i) => i % 2 === 0);
  
  const earlyChecksReceived = opponentMoves.filter(m => m.includes('+')).length;
  
  // Nc7+ fork detection
  const nc7ForkDetected = opponentMoves.some(m => m === 'Nc7+' || m === 'Nc7#');
  
  // Queen tempo loss
  const earlyPlayerMoves = playerColor === 'white'
    ? moves.slice(0, 12).filter((_, i) => i % 2 === 0)
    : moves.slice(0, 12).filter((_, i) => i % 2 === 1);
  
  const queenMoveCount = earlyPlayerMoves.filter(m => m.startsWith('Q')).length;
  const queenTempoLoss = queenMoveCount >= 2;
  
  const isQuickLoss = result === 'loss' && totalMoves <= 15;
  const isQuickWin = result === 'win' && totalMoves <= 15;

  return {
    moves,
    totalMoves,
    openingBucket,
    castledAtPly,
    queenMovesFirst10,
    isQuickLoss,
    isQuickWin,
    earlyChecksReceived,
    queenTempoLoss,
    nc7ForkDetected,
  };
}

export async function fetchChessComGames(
  username: string,
  dateRangeDays: number,
  maxGames: number
): Promise<Game[]> {
  const { data, error } = await supabase.functions.invoke('fetch-chess-games', {
    body: { username, dateRangeDays, maxGames },
  });

  if (error) {
    throw new Error(error.message || 'Failed to fetch games from Chess.com');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  const chessComGames: ChessComGame[] = data.games || [];

  // Convert to our Game format with analysis
  const games: Game[] = chessComGames.map((game, index) => {
    const analysis = analyzeGame(game.pgn, game.player_color, game.result);

    return {
      id: `chess-com-${index}-${game.end_time}`,
      user_id: username,
      game_date: new Date(game.end_time * 1000).toISOString(),
      time_control: mapTimeClass(game.time_class),
      player_color: game.player_color,
      result: game.result,
      opponent_name: game.opponent_name,
      opponent_rating: game.opponent_rating,
      player_rating: game.player_rating,
      total_moves: analysis.totalMoves,
      moves: analysis.moves,
      opening_bucket: analysis.openingBucket,
      pgn_raw: game.pgn,
      game_url: game.url,
      castled_at_ply: analysis.castledAtPly,
      queen_moves_first_10: analysis.queenMovesFirst10,
      is_quick_loss: analysis.isQuickLoss,
      is_quick_win: analysis.isQuickWin,
      early_checks_received: analysis.earlyChecksReceived,
      queen_tempo_loss: analysis.queenTempoLoss,
      nc7_fork_detected: analysis.nc7ForkDetected,
      created_at: new Date().toISOString(),
    };
  });

  return games;
}
