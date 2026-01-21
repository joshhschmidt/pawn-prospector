export type GameResult = 'win' | 'loss' | 'draw';
export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence';
export type PlayerColor = 'white' | 'black';

export type OpeningBucket = 
  | 'london'
  | 'queens_gambit'
  | 'other_d4'
  | 'non_d4_white'
  | 'sicilian'
  | 'sicilian_dragon'
  | 'pirc_modern'
  | 'other_e4_black'
  | 'other_black';

export interface Game {
  id: string;
  user_id: string;
  game_date: string | null;
  time_control: TimeControl | null;
  player_color: PlayerColor;
  result: GameResult;
  opponent_name: string | null;
  opponent_rating: number | null;
  player_rating: number | null;
  total_moves: number | null;
  moves: string[] | null;
  opening_bucket: OpeningBucket | null;
  pgn_raw: string | null;
  game_url: string | null;
  castled_at_ply: number | null;
  queen_moves_first_10: number | null;
  is_quick_loss: boolean;
  is_quick_win: boolean;
  early_checks_received: number | null;
  queen_tempo_loss: boolean;
  nc7_fork_detected: boolean;
  created_at: string;
}

export interface User {
  id: string;
  chess_com_username: string;
  created_at: string;
  updated_at: string;
}

export interface CoachingReport {
  id: string;
  user_id: string;
  report_date: string;
  total_games: number | null;
  date_range_start: string | null;
  date_range_end: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  recommendations: Recommendation[] | null;
  training_plan: TrainingPlan | null;
  created_at: string;
}

export interface Recommendation {
  type: 'stop' | 'start';
  text: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TrainingPlan {
  white_opening: string;
  black_opening: string;
  rules: string[];
  checklist: string[];
}

export interface OpeningStats {
  bucket: OpeningBucket;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  scorePercent: number;
}

export interface AnalysisStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  scorePercent: number;
  avgGameLength: number;
  avgQueenMovesFirst10: number;
  avgCastlingPly: number;
  quickLosses: number;
  quickWins: number;
  earlyChecksReceived: number;
  queenTempoLossGames: number;
  nc7ForkGames: number;
}

export interface FilterState {
  dateRange: { start: Date | null; end: Date | null };
  timeControl: TimeControl | 'all';
  color: PlayerColor | 'all';
  openingBucket: OpeningBucket | 'all';
}

export const OPENING_LABELS: Record<OpeningBucket, string> = {
  london: 'London System',
  queens_gambit: "Queen's Gambit",
  other_d4: 'Other 1.d4',
  non_d4_white: 'Non-1.d4 (White)',
  sicilian: 'Sicilian Defense',
  sicilian_dragon: 'Sicilian Dragon',
  pirc_modern: 'Pirc/Modern',
  other_e4_black: 'Other vs 1.e4',
  other_black: 'Other (Black)',
};

export const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
  correspondence: 'Correspondence',
};
