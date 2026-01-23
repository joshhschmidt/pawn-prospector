import { Game, OpeningBucket, TimeControl, GameResult, PlayerColor } from '@/types/chess';

// Sample move sequences for different openings
const SAMPLE_GAMES: Record<string, string[]> = {
  italian_game: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'O-O', 'O-O', 'c3', 'd6', 'Bb3', 'a6', 'h3', 'Ba7', 'Re1', 'Be6', 'Bxe6', 'fxe6', 'Be3', 'Bxe3', 'Rxe3', 'Qd7', 'Nbd2', 'Nh5', 'd4', 'exd4', 'cxd4', 'Nf4', 'e5', 'd5', 'Qb3', 'b5', 'a4', 'Rab8', 'axb5', 'axb5', 'Ra6', 'Qe7', 'Qc3', 'Nd5', 'Qc5', 'Ncb4', 'Ra7', 'Qxc5', 'dxc5'],
  ruy_lopez: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5', 'Bc2', 'c5', 'd4', 'Qc7', 'Nbd2', 'Bd7', 'Nf1', 'Rfe8', 'Ng3', 'g6', 'Bg5', 'Bf8', 'Qd2', 'Bg7', 'Rad1', 'h6', 'Be3', 'Rab8', 'Nh2', 'Nc4', 'Bxc4', 'bxc4', 'f4', 'exf4', 'Bxf4', 'Nh5'],
  london_system: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Nc6', 'c3', 'Qb6', 'Qb3', 'c4', 'Qc2', 'Bf5', 'Qc1', 'e6', 'Be2', 'Be7', 'O-O', 'O-O', 'Nbd2', 'Rfc8', 'h3', 'h6', 'Ne5', 'Nd7', 'Nxc6', 'Rxc6', 'Qc2', 'Bxc2', 'Rac1', 'Bf5', 'e4', 'dxe4', 'Nxe4', 'Bxe4'],
  queens_gambit: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2', 'Re8', 'Nge2', 'Nf8', 'O-O', 'c6', 'Rab1', 'Bd6', 'b4', 'Ng6', 'b5', 'Rc8', 'bxc6', 'bxc6', 'Na4', 'Qc7', 'Nc5', 'Ne4', 'Bxe4', 'dxe4', 'Qxe4', 'Bf5'],
  sicilian_najdorf: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6', 'f3', 'Be7', 'Qd2', 'O-O', 'O-O-O', 'Nbd7', 'g4', 'b5', 'g5', 'Nh5', 'Kb1', 'Nb6', 'Na5', 'Rc8', 'Bxb6', 'Qxb6', 'Nc6', 'Rxc6', 'Bxb5', 'axb5', 'Nxb5', 'Rfc8', 'Nxd6', 'Qxd6', 'Qxd6'],
  sicilian_dragon: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4', 'h5', 'Bg5', 'Rc5', 'Kb1', 'b5', 'g4', 'hxg4', 'h5', 'Nxh5', 'Rxh5', 'gxh5', 'Qh2', 'Bxd4'],
  french_defense: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7', 'Qg4', 'O-O', 'Bd3', 'Nbc6', 'Qh5', 'Ng6', 'Nf3', 'Qc7', 'Be3', 'c4', 'Bxg6', 'hxg6', 'Qg5', 'f6', 'exf6', 'Rxf6', 'h4', 'e5', 'Qg3', 'exd4', 'cxd4', 'Bf5', 'O-O'],
  caro_kann: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7', 'Bd3', 'Bxd3', 'Qxd3', 'e6', 'Bf4', 'Ngf6', 'O-O-O', 'Be7', 'Kb1', 'O-O', 'Ne5', 'c5', 'Nxd7', 'Qxd7', 'dxc5', 'Qxd3', 'Rxd3'],
  kings_indian: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7', 'Ne1', 'Nd7', 'Nd3', 'f5', 'Bd2', 'Nf6', 'f3', 'f4', 'c5', 'g5', 'Rc1', 'Ng6', 'Nb5', 'Rf7', 'cxd6', 'cxd6', 'Rxc8', 'Qxc8', 'Qc2', 'Qf8'],
  default: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Be2', 'h6', 'Nf3', 'e4', 'Ne5', 'Qd4', 'Ng4', 'Bxg4', 'Bxg4', 'Qxg4', 'Qxg4', 'Nxg4', 'd3', 'exd3', 'cxd3', 'Bd6', 'O-O', 'O-O', 'Nc3', 'Rfe8', 'Be3', 'Ne5', 'f4', 'Nd7'],
};

const getMoves = (opening: OpeningBucket): string[] => {
  const key = opening.replace(/_/g, '_');
  const baseMoves = SAMPLE_GAMES[key] || SAMPLE_GAMES.default;
  // Optionally truncate or extend to match total_moves
  return [...baseMoves];
};

// Generate realistic demo data for showcasing the analysis
const generateDemoGame = (
  index: number,
  userId: string,
  color: PlayerColor,
  result: GameResult,
  opening: OpeningBucket,
  timeControl: TimeControl,
  daysAgo: number
): Game => {
  const isWin = result === 'win';
  const isLoss = result === 'loss';
  const moves = getMoves(opening);
  const totalMoves = Math.ceil(moves.length / 2);
  const quickGame = totalMoves <= 15;
  
  return {
    id: `demo-${index}`,
    user_id: userId,
    game_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    time_control: timeControl,
    player_color: color,
    result,
    opponent_name: `Opponent${Math.floor(Math.random() * 1000)}`,
    opponent_rating: 1200 + Math.floor(Math.random() * 600),
    player_rating: 1400 + Math.floor(Math.random() * 200),
    total_moves: totalMoves,
    moves,
    opening_bucket: opening,
    pgn_raw: null,
    game_url: `https://chess.com/game/${index}`,
    castled_at_ply: color === 'white' 
      ? Math.floor(Math.random() * 12) + 6 
      : Math.floor(Math.random() * 14) + 7,
    queen_moves_first_10: Math.floor(Math.random() * 3),
    is_quick_loss: isLoss && quickGame,
    is_quick_win: isWin && quickGame,
    early_checks_received: Math.floor(Math.random() * 2),
    queen_tempo_loss: Math.random() > 0.7,
    nc7_fork_detected: isLoss && Math.random() > 0.8,
    created_at: new Date().toISOString(),
  };
};

export const generateDemoGames = (userId: string): Game[] => {
  const games: Game[] = [];
  
  // Generate 180 games with realistic distribution across many openings
  const distributions: { color: PlayerColor; opening: OpeningBucket; count: number; winRate: number }[] = [
    // White 1.e4 openings
    { color: 'white', opening: 'italian_game', count: 15, winRate: 0.58 },
    { color: 'white', opening: 'ruy_lopez', count: 10, winRate: 0.52 },
    { color: 'white', opening: 'scotch_game', count: 6, winRate: 0.55 },
    { color: 'white', opening: 'vienna_game', count: 4, winRate: 0.50 },
    { color: 'white', opening: 'kings_gambit', count: 3, winRate: 0.45 },
    
    // White 1.d4 openings
    { color: 'white', opening: 'london_system', count: 20, winRate: 0.56 },
    { color: 'white', opening: 'queens_gambit', count: 12, winRate: 0.54 },
    { color: 'white', opening: 'catalan', count: 5, winRate: 0.48 },
    { color: 'white', opening: 'trompowsky', count: 4, winRate: 0.52 },
    
    // White other
    { color: 'white', opening: 'english_opening', count: 6, winRate: 0.50 },
    { color: 'white', opening: 'reti_opening', count: 4, winRate: 0.47 },
    
    // Black vs 1.e4 - Sicilian variations
    { color: 'black', opening: 'sicilian_najdorf', count: 12, winRate: 0.45 },
    { color: 'black', opening: 'sicilian_dragon', count: 8, winRate: 0.42 },
    { color: 'black', opening: 'sicilian_classical', count: 5, winRate: 0.40 },
    { color: 'black', opening: 'sicilian_sveshnikov', count: 4, winRate: 0.48 },
    { color: 'black', opening: 'sicilian_other', count: 6, winRate: 0.38 },
    
    // Black vs 1.e4 - other
    { color: 'black', opening: 'french_defense', count: 10, winRate: 0.44 },
    { color: 'black', opening: 'caro_kann', count: 8, winRate: 0.46 },
    { color: 'black', opening: 'scandinavian', count: 4, winRate: 0.35 },
    { color: 'black', opening: 'pirc_defense', count: 5, winRate: 0.38 },
    { color: 'black', opening: 'alekhine_defense', count: 3, winRate: 0.40 },
    
    // Black vs 1.d4 - Indian defenses
    { color: 'black', opening: 'kings_indian', count: 10, winRate: 0.42 },
    { color: 'black', opening: 'nimzo_indian', count: 6, winRate: 0.50 },
    { color: 'black', opening: 'grunfeld', count: 4, winRate: 0.45 },
    { color: 'black', opening: 'queens_indian', count: 4, winRate: 0.43 },
    
    // Black vs 1.d4 - QG responses
    { color: 'black', opening: 'queens_gambit_declined', count: 8, winRate: 0.40 },
    { color: 'black', opening: 'slav_defense', count: 6, winRate: 0.44 },
    { color: 'black', opening: 'semi_slav', count: 4, winRate: 0.46 },
    
    // Other
    { color: 'black', opening: 'dutch_defense', count: 3, winRate: 0.38 },
    { color: 'black', opening: 'benoni', count: 3, winRate: 0.35 },
  ];

  const timeControls: TimeControl[] = ['bullet', 'blitz', 'rapid'];
  let gameIndex = 0;

  distributions.forEach(dist => {
    for (let i = 0; i < dist.count; i++) {
      const rand = Math.random();
      let result: GameResult;
      if (rand < dist.winRate) {
        result = 'win';
      } else if (rand < dist.winRate + 0.1) {
        result = 'draw';
      } else {
        result = 'loss';
      }
      
      const timeControl = timeControls[Math.floor(Math.random() * timeControls.length)];
      const daysAgo = Math.floor(Math.random() * 90);
      
      games.push(generateDemoGame(
        gameIndex++,
        userId,
        dist.color,
        result,
        dist.opening,
        timeControl,
        daysAgo
      ));
    }
  });

  return games.sort((a, b) => 
    new Date(b.game_date!).getTime() - new Date(a.game_date!).getTime()
  );
};

export const DEMO_USER_ID = 'demo-user-123';
export const DEMO_USERNAME = 'ChessEnthusiast';
