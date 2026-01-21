import { Game, OpeningBucket, TimeControl, GameResult, PlayerColor } from '@/types/chess';

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
  const totalMoves = Math.floor(Math.random() * 40) + 15;
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
    moves: [],
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
