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
  
  // Generate 150 games with realistic distribution
  const distributions = [
    // White games
    { color: 'white' as PlayerColor, opening: 'london' as OpeningBucket, count: 25, winRate: 0.55 },
    { color: 'white' as PlayerColor, opening: 'queens_gambit' as OpeningBucket, count: 18, winRate: 0.45 },
    { color: 'white' as PlayerColor, opening: 'other_d4' as OpeningBucket, count: 12, winRate: 0.50 },
    { color: 'white' as PlayerColor, opening: 'non_d4_white' as OpeningBucket, count: 20, winRate: 0.48 },
    // Black games
    { color: 'black' as PlayerColor, opening: 'sicilian' as OpeningBucket, count: 30, winRate: 0.42 },
    { color: 'black' as PlayerColor, opening: 'sicilian_dragon' as OpeningBucket, count: 15, winRate: 0.38 },
    { color: 'black' as PlayerColor, opening: 'pirc_modern' as OpeningBucket, count: 10, winRate: 0.35 },
    { color: 'black' as PlayerColor, opening: 'other_e4_black' as OpeningBucket, count: 12, winRate: 0.40 },
    { color: 'black' as PlayerColor, opening: 'other_black' as OpeningBucket, count: 8, winRate: 0.45 },
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
