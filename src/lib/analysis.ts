import { Game, AnalysisStats, OpeningStats, OpeningBucket, PlayerColor, FilterState, Recommendation, TrainingPlan, OPENING_LABELS } from '@/types/chess';

export const filterGames = (games: Game[], filters: FilterState): Game[] => {
  return games.filter(game => {
    // Date range filter
    if (filters.dateRange.start && game.game_date) {
      if (new Date(game.game_date) < filters.dateRange.start) return false;
    }
    if (filters.dateRange.end && game.game_date) {
      if (new Date(game.game_date) > filters.dateRange.end) return false;
    }
    
    // Time control filter
    if (filters.timeControl !== 'all' && game.time_control !== filters.timeControl) {
      return false;
    }
    
    // Color filter
    if (filters.color !== 'all' && game.player_color !== filters.color) {
      return false;
    }
    
    // Opening bucket filter
    if (filters.openingBucket !== 'all' && game.opening_bucket !== filters.openingBucket) {
      return false;
    }
    
    return true;
  });
};

export const calculateStats = (games: Game[]): AnalysisStats => {
  if (games.length === 0) {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      scorePercent: 0,
      avgGameLength: 0,
      avgQueenMovesFirst10: 0,
      avgCastlingPly: 0,
      quickLosses: 0,
      quickWins: 0,
      earlyChecksReceived: 0,
      queenTempoLossGames: 0,
      nc7ForkGames: 0,
    };
  }

  const wins = games.filter(g => g.result === 'win').length;
  const losses = games.filter(g => g.result === 'loss').length;
  const draws = games.filter(g => g.result === 'draw').length;
  
  const gamesWithMoves = games.filter(g => g.total_moves !== null);
  const avgGameLength = gamesWithMoves.length > 0
    ? gamesWithMoves.reduce((sum, g) => sum + (g.total_moves || 0), 0) / gamesWithMoves.length
    : 0;

  const gamesWithQueenMoves = games.filter(g => g.queen_moves_first_10 !== null);
  const avgQueenMovesFirst10 = gamesWithQueenMoves.length > 0
    ? gamesWithQueenMoves.reduce((sum, g) => sum + (g.queen_moves_first_10 || 0), 0) / gamesWithQueenMoves.length
    : 0;

  const gamesWithCastling = games.filter(g => g.castled_at_ply !== null);
  const avgCastlingPly = gamesWithCastling.length > 0
    ? gamesWithCastling.reduce((sum, g) => sum + (g.castled_at_ply || 0), 0) / gamesWithCastling.length
    : 0;

  return {
    totalGames: games.length,
    wins,
    losses,
    draws,
    scorePercent: ((wins + draws * 0.5) / games.length) * 100,
    avgGameLength: Math.round(avgGameLength * 10) / 10,
    avgQueenMovesFirst10: Math.round(avgQueenMovesFirst10 * 100) / 100,
    avgCastlingPly: Math.round(avgCastlingPly * 10) / 10,
    quickLosses: games.filter(g => g.is_quick_loss).length,
    quickWins: games.filter(g => g.is_quick_win).length,
    earlyChecksReceived: games.reduce((sum, g) => sum + (g.early_checks_received || 0), 0),
    queenTempoLossGames: games.filter(g => g.queen_tempo_loss).length,
    nc7ForkGames: games.filter(g => g.nc7_fork_detected).length,
  };
};

export const calculateOpeningStats = (games: Game[]): OpeningStats[] => {
  // Dynamic bucket creation based on games
  const buckets: Record<string, Game[]> = {};

  games.forEach(game => {
    if (game.opening_bucket) {
      if (!buckets[game.opening_bucket]) {
        buckets[game.opening_bucket] = [];
      }
      buckets[game.opening_bucket].push(game);
    }
  });

  return Object.entries(buckets)
    .filter(([_, gamesInBucket]) => gamesInBucket.length > 0)
    .map(([bucket, gamesInBucket]) => {
      const stats = calculateStats(gamesInBucket);
      const decisiveGames = stats.wins + stats.losses;
      const winPercent = decisiveGames > 0 ? (stats.wins / decisiveGames) * 100 : 0;
      return {
        bucket: bucket as OpeningBucket,
        games: gamesInBucket.length,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        scorePercent: stats.scorePercent,
        winPercent,
      };
    })
    .sort((a, b) => b.games - a.games);
};

export const generateStrengths = (stats: AnalysisStats, openingStats: OpeningStats[]): string[] => {
  const strengths: string[] = [];
  
  if (stats.scorePercent >= 55) {
    strengths.push('Strong overall winning rate above 55%');
  }
  
  if (stats.avgCastlingPly <= 10 && stats.avgCastlingPly > 0) {
    strengths.push('Excellent king safety - castling early on average');
  }
  
  if (stats.avgQueenMovesFirst10 < 1) {
    strengths.push('Good opening discipline - avoiding early queen moves');
  }
  
  if (stats.quickWins > stats.quickLosses) {
    strengths.push('Capitalizing on opponent mistakes with quick wins');
  }
  
  // Best opening
  const bestOpening = openingStats.find(o => o.scorePercent >= 55 && o.games >= 5);
  if (bestOpening) {
    strengths.push(`Strong performance in ${OPENING_LABELS[bestOpening.bucket]} (${bestOpening.scorePercent.toFixed(0)}%)`);
  }
  
  return strengths.slice(0, 3);
};

export const generateWeaknesses = (stats: AnalysisStats, openingStats: OpeningStats[]): string[] => {
  const weaknesses: string[] = [];
  
  if (stats.quickLosses > 5) {
    weaknesses.push(`Too many quick losses (${stats.quickLosses} games under 15 moves)`);
  }
  
  if (stats.avgQueenMovesFirst10 >= 2) {
    weaknesses.push('Moving queen too early (avg ' + stats.avgQueenMovesFirst10.toFixed(1) + ' times in first 10 moves)');
  }
  
  if (stats.avgCastlingPly > 14) {
    weaknesses.push('Delayed castling - king often exposed too long');
  }
  
  if (stats.nc7ForkGames > 3) {
    weaknesses.push('Falling for Nc7+ knight fork pattern too often');
  }
  
  if (stats.queenTempoLossGames > stats.totalGames * 0.2) {
    weaknesses.push('Losing tempo by moving queen multiple times early');
  }
  
  // Worst opening
  const worstOpening = openingStats.find(o => o.scorePercent < 40 && o.games >= 5);
  if (worstOpening) {
    weaknesses.push(`Struggling in ${OPENING_LABELS[worstOpening.bucket]} (${worstOpening.scorePercent.toFixed(0)}%)`);
  }
  
  return weaknesses.slice(0, 3);
};

export const generateRecommendations = (stats: AnalysisStats, openingStats: OpeningStats[]): Recommendation[] => {
  const recommendations: Recommendation[] = [];
  
  if (stats.avgQueenMovesFirst10 >= 1.5) {
    recommendations.push({
      type: 'stop',
      text: "Don't move your queen before castling unless absolutely forced",
      priority: 'high',
    });
  }
  
  if (stats.avgCastlingPly > 12) {
    recommendations.push({
      type: 'start',
      text: 'Prioritize castling by move 8-10 to ensure king safety',
      priority: 'high',
    });
  }
  
  if (stats.nc7ForkGames > 2) {
    recommendations.push({
      type: 'stop',
      text: 'Avoid early Qa5/Qb5 in Sicilian if it leads to Nc7+ motifs',
      priority: 'medium',
    });
  }
  
  if (stats.quickLosses > 3) {
    recommendations.push({
      type: 'start',
      text: 'Spend more time on opening moves - check for basic tactics before moving',
      priority: 'high',
    });
  }
  
  recommendations.push({
    type: 'start',
    text: 'Focus on piece development before attacking',
    priority: 'medium',
  });
  
  recommendations.push({
    type: 'stop',
    text: 'Avoid moving the same piece twice in the opening without good reason',
    priority: 'medium',
  });
  
  return recommendations.slice(0, 6);
};

export const generateTrainingPlan = (openingStats: OpeningStats[], color?: PlayerColor): TrainingPlan => {
  const whiteOpenings = openingStats.filter(o => 
    ['london', 'queens_gambit', 'other_d4', 'non_d4_white'].includes(o.bucket)
  );
  const blackOpenings = openingStats.filter(o => 
    ['sicilian', 'sicilian_dragon', 'pirc_modern', 'other_e4_black', 'other_black'].includes(o.bucket)
  );
  
  const bestWhite = whiteOpenings.sort((a, b) => b.scorePercent - a.scorePercent)[0];
  const bestBlack = blackOpenings.sort((a, b) => b.scorePercent - a.scorePercent)[0];
  
  return {
    white_opening: bestWhite ? OPENING_LABELS[bestWhite.bucket] : 'London System',
    black_opening: bestBlack ? OPENING_LABELS[bestBlack.bucket] : 'Sicilian Defense',
    rules: [
      'Castle before move 10',
      'Develop all minor pieces before moving the queen',
      'Control the center with pawns and pieces',
      'Check for opponent threats before each move',
      'Avoid moving a piece twice in the opening',
    ],
    checklist: [
      'Did I castle early?',
      'Did I develop all my pieces?',
      'Did I fall for any simple tactics?',
      'Did I maintain control of the center?',
      'What was my best move? Worst move?',
    ],
  };
};

export const calculateScoreOverTime = (games: Game[]): { date: string; score: number; games: number }[] => {
  // Group games by week
  const weeklyData: Record<string, { wins: number; draws: number; total: number }> = {};
  
  games.forEach(game => {
    if (!game.game_date) return;
    const date = new Date(game.game_date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { wins: 0, draws: 0, total: 0 };
    }
    
    weeklyData[weekKey].total++;
    if (game.result === 'win') weeklyData[weekKey].wins++;
    if (game.result === 'draw') weeklyData[weekKey].draws++;
  });
  
  return Object.entries(weeklyData)
    .map(([date, data]) => ({
      date,
      score: ((data.wins + data.draws * 0.5) / data.total) * 100,
      games: data.total,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};
