import { Game, OpeningBucket, TimeControl, GameResult, PlayerColor } from '@/types/chess';
import { classifyOpening } from './opening-classifier';

interface ParsedPGN {
  headers: Record<string, string>;
  moves: string[];
}
export const parsePGN = (pgnText: string): ParsedPGN[] => {
  const games: ParsedPGN[] = [];
  
  // Split by double newline followed by [Event or by [Event at start
  const gameStrings = pgnText.split(/\n\n(?=\[Event|\[White|\[Black)/).filter(s => s.trim());
  
  for (const gameStr of gameStrings) {
    const headers: Record<string, string> = {};
    let movesSection = '';
    
    const lines = gameStr.split('\n');
    let inMoves = false;
    
    for (const line of lines) {
      if (line.startsWith('[') && line.endsWith(']')) {
        const match = line.match(/\[(\w+)\s+"(.*)"\]/);
        if (match) {
          headers[match[1]] = match[2];
        }
      } else if (line.trim() && !line.startsWith('[')) {
        inMoves = true;
        movesSection += ' ' + line;
      }
    }
    
    // Parse moves - remove comments, variations, and result
    const cleanMoves = movesSection
      .replace(/\{[^}]*\}/g, '') // Remove comments
      .replace(/\([^)]*\)/g, '') // Remove variations
      .replace(/\$\d+/g, '') // Remove NAGs
      .replace(/\d+\.\.\./g, '') // Remove ... after move numbers
      .replace(/\d+\./g, ' ') // Remove move numbers
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, '') // Remove results
      .trim();
    
    const moves = cleanMoves.split(/\s+/).filter(m => m && m.match(/^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$|^O-O(-O)?[+#]?$/));
    
    if (Object.keys(headers).length > 0) {
      games.push({ headers, moves });
    }
  }
  
  return games;
};

// classifyOpening is now imported from opening-classifier.ts
export { classifyOpening } from './opening-classifier';

export const parseTimeControl = (timeControlStr: string): TimeControl => {
  if (!timeControlStr) return 'rapid';
  
  // Parse time control like "180+2" or "300" or "600"
  const match = timeControlStr.match(/^(\d+)/);
  if (!match) return 'rapid';
  
  const baseTime = parseInt(match[1]);
  
  if (baseTime < 180) return 'bullet';
  if (baseTime < 600) return 'blitz';
  if (baseTime < 1800) return 'rapid';
  if (baseTime < 86400) return 'classical';
  return 'correspondence';
};

export const parseResult = (resultStr: string, playerColor: PlayerColor): GameResult => {
  if (resultStr === '1-0') {
    return playerColor === 'white' ? 'win' : 'loss';
  }
  if (resultStr === '0-1') {
    return playerColor === 'black' ? 'win' : 'loss';
  }
  return 'draw';
};

export const convertPGNToGame = (
  parsed: ParsedPGN,
  userId: string,
  playerUsername: string
): Game | null => {
  const { headers, moves } = parsed;
  
  // Determine player color
  const whitePlayer = headers['White'] || '';
  const blackPlayer = headers['Black'] || '';
  
  let playerColor: PlayerColor;
  if (whitePlayer.toLowerCase() === playerUsername.toLowerCase()) {
    playerColor = 'white';
  } else if (blackPlayer.toLowerCase() === playerUsername.toLowerCase()) {
    playerColor = 'black';
  } else {
    // Default to white if can't determine
    playerColor = 'white';
  }
  
  const result = parseResult(headers['Result'] || '*', playerColor);
  const timeControl = parseTimeControl(headers['TimeControl'] || '');
  const openingBucket = classifyOpening(moves, playerColor);
  
  // Count queen moves in first 10 moves (20 plies)
  const playerMoveIndices = playerColor === 'white' 
    ? moves.slice(0, 20).filter((_, i) => i % 2 === 0)
    : moves.slice(0, 20).filter((_, i) => i % 2 === 1);
  
  const queenMovesFirst10 = playerMoveIndices.filter(m => 
    m.startsWith('Q') || m.startsWith('Qx')
  ).length;
  
  // Find castling ply
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
  
  // Count early checks received (first 12 plies from opponent)
  const opponentMoves = playerColor === 'white'
    ? moves.slice(0, 12).filter((_, i) => i % 2 === 1)
    : moves.slice(0, 12).filter((_, i) => i % 2 === 0);
  
  const earlyChecksReceived = opponentMoves.filter(m => m.includes('+')).length;
  
  // Detect Nc7+ fork from opponent
  const nc7ForkDetected = opponentMoves.some(m => m === 'Nc7+' || m === 'Nc7#');
  
  // Detect queen tempo loss (queen moved more than once in first 12 plies)
  const earlyPlayerMoves = playerColor === 'white'
    ? moves.slice(0, 12).filter((_, i) => i % 2 === 0)
    : moves.slice(0, 12).filter((_, i) => i % 2 === 1);
  
  const queenMoveCount = earlyPlayerMoves.filter(m => m.startsWith('Q')).length;
  const queenTempoLoss = queenMoveCount >= 2;
  
  const totalMoves = Math.ceil(moves.length / 2);
  const isQuickLoss = result === 'loss' && totalMoves <= 15;
  const isQuickWin = result === 'win' && totalMoves <= 15;
  
  // Parse date
  let gameDate: string | null = null;
  if (headers['UTCDate']) {
    gameDate = headers['UTCDate'].replace(/\./g, '-') + 'T' + (headers['UTCTime'] || '00:00:00') + 'Z';
  } else if (headers['Date']) {
    gameDate = headers['Date'].replace(/\./g, '-') + 'T00:00:00Z';
  }
  
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    game_date: gameDate,
    time_control: timeControl,
    player_color: playerColor,
    result,
    opponent_name: playerColor === 'white' ? blackPlayer : whitePlayer,
    opponent_rating: parseInt(playerColor === 'white' ? headers['BlackElo'] : headers['WhiteElo']) || null,
    player_rating: parseInt(playerColor === 'white' ? headers['WhiteElo'] : headers['BlackElo']) || null,
    total_moves: totalMoves,
    moves,
    opening_bucket: openingBucket,
    pgn_raw: null,
    game_url: headers['Link'] || headers['Site'] || null,
    castled_at_ply: castledAtPly,
    queen_moves_first_10: queenMovesFirst10,
    is_quick_loss: isQuickLoss,
    is_quick_win: isQuickWin,
    early_checks_received: earlyChecksReceived,
    queen_tempo_loss: queenTempoLoss,
    nc7_fork_detected: nc7ForkDetected,
    created_at: new Date().toISOString(),
  };
};

export const parsePGNFile = (content: string, userId: string, playerUsername: string): Game[] => {
  const parsed = parsePGN(content);
  return parsed
    .map(p => convertPGNToGame(p, userId, playerUsername))
    .filter((g): g is Game => g !== null);
};
