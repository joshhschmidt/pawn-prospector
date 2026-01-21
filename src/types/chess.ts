export type GameResult = 'win' | 'loss' | 'draw';
export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence';
export type PlayerColor = 'white' | 'black';

export type OpeningBucket = 
  // White 1.e4 openings
  | 'italian_game'
  | 'ruy_lopez'
  | 'scotch_game'
  | 'kings_gambit'
  | 'vienna_game'
  | 'bishops_opening'
  | 'four_knights'
  | 'petrov_defense'
  | 'center_game'
  | 'danish_gambit'
  | 'ponziani'
  
  // White 1.d4 openings
  | 'london_system'
  | 'queens_gambit'
  | 'catalan'
  | 'trompowsky'
  | 'colle_system'
  | 'torre_attack'
  | 'veresov'
  | 'blackmar_diemer'
  | 'richter_veresov'
  
  // White 1.c4 / 1.Nf3 / other
  | 'english_opening'
  | 'reti_opening'
  | 'kings_indian_attack'
  | 'birds_opening'
  | 'larsen_opening'
  | 'grob_attack'
  | 'other_white'
  
  // Black vs 1.e4
  | 'sicilian_najdorf'
  | 'sicilian_dragon'
  | 'sicilian_scheveningen'
  | 'sicilian_sveshnikov'
  | 'sicilian_classical'
  | 'sicilian_kan'
  | 'sicilian_taimanov'
  | 'sicilian_accelerated_dragon'
  | 'sicilian_alapin'
  | 'sicilian_closed'
  | 'sicilian_other'
  | 'french_defense'
  | 'caro_kann'
  | 'scandinavian'
  | 'alekhine_defense'
  | 'pirc_defense'
  | 'modern_defense'
  | 'philidor_defense'
  | 'owen_defense'
  | 'kings_pawn_other'
  
  // Black vs 1.d4
  | 'kings_indian'
  | 'grunfeld'
  | 'nimzo_indian'
  | 'queens_indian'
  | 'bogo_indian'
  | 'benoni'
  | 'dutch_defense'
  | 'slav_defense'
  | 'semi_slav'
  | 'queens_gambit_declined'
  | 'queens_gambit_accepted'
  | 'tarrasch_defense'
  | 'chigorin_defense'
  | 'budapest_gambit'
  | 'benko_gambit'
  | 'd4_other'
  
  // Black vs other
  | 'english_symmetrical'
  | 'anglo_indian'
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
  // White 1.e4 openings
  italian_game: 'Italian Game',
  ruy_lopez: 'Ruy López',
  scotch_game: 'Scotch Game',
  kings_gambit: "King's Gambit",
  vienna_game: 'Vienna Game',
  bishops_opening: "Bishop's Opening",
  four_knights: 'Four Knights',
  petrov_defense: 'Petrov Defense',
  center_game: 'Center Game',
  danish_gambit: 'Danish Gambit',
  ponziani: 'Ponziani Opening',
  
  // White 1.d4 openings
  london_system: 'London System',
  queens_gambit: "Queen's Gambit",
  catalan: 'Catalan Opening',
  trompowsky: 'Trompowsky Attack',
  colle_system: 'Colle System',
  torre_attack: 'Torre Attack',
  veresov: 'Veresov Attack',
  blackmar_diemer: 'Blackmar-Diemer Gambit',
  richter_veresov: 'Richter-Veresov Attack',
  
  // White other
  english_opening: 'English Opening',
  reti_opening: 'Réti Opening',
  kings_indian_attack: "King's Indian Attack",
  birds_opening: "Bird's Opening",
  larsen_opening: "Larsen's Opening",
  grob_attack: 'Grob Attack',
  other_white: 'Other (White)',
  
  // Black vs 1.e4 - Sicilian variations
  sicilian_najdorf: 'Sicilian Najdorf',
  sicilian_dragon: 'Sicilian Dragon',
  sicilian_scheveningen: 'Sicilian Scheveningen',
  sicilian_sveshnikov: 'Sicilian Sveshnikov',
  sicilian_classical: 'Sicilian Classical',
  sicilian_kan: 'Sicilian Kan',
  sicilian_taimanov: 'Sicilian Taimanov',
  sicilian_accelerated_dragon: 'Sicilian Accelerated Dragon',
  sicilian_alapin: 'Sicilian Alapin',
  sicilian_closed: 'Sicilian Closed',
  sicilian_other: 'Sicilian Defense',
  
  // Black vs 1.e4 - other
  french_defense: 'French Defense',
  caro_kann: 'Caro-Kann Defense',
  scandinavian: 'Scandinavian Defense',
  alekhine_defense: "Alekhine's Defense",
  pirc_defense: 'Pirc Defense',
  modern_defense: 'Modern Defense',
  philidor_defense: 'Philidor Defense',
  owen_defense: "Owen's Defense",
  kings_pawn_other: 'Other vs 1.e4',
  
  // Black vs 1.d4
  kings_indian: "King's Indian",
  grunfeld: 'Grünfeld Defense',
  nimzo_indian: 'Nimzo-Indian',
  queens_indian: "Queen's Indian",
  bogo_indian: 'Bogo-Indian',
  benoni: 'Benoni Defense',
  dutch_defense: 'Dutch Defense',
  slav_defense: 'Slav Defense',
  semi_slav: 'Semi-Slav',
  queens_gambit_declined: 'QGD',
  queens_gambit_accepted: 'QGA',
  tarrasch_defense: 'Tarrasch Defense',
  chigorin_defense: 'Chigorin Defense',
  budapest_gambit: 'Budapest Gambit',
  benko_gambit: 'Benko Gambit',
  d4_other: 'Other vs 1.d4',
  
  // Black vs other
  english_symmetrical: 'Symmetrical English',
  anglo_indian: 'Anglo-Indian',
  other_black: 'Other (Black)',
};

export const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
  correspondence: 'Correspondence',
};

// Opening categories for grouping in UI
export const OPENING_CATEGORIES: Record<string, OpeningBucket[]> = {
  'White 1.e4': [
    'italian_game', 'ruy_lopez', 'scotch_game', 'kings_gambit', 'vienna_game',
    'bishops_opening', 'four_knights', 'petrov_defense', 'center_game',
    'danish_gambit', 'ponziani'
  ],
  'White 1.d4': [
    'london_system', 'queens_gambit', 'catalan', 'trompowsky', 'colle_system',
    'torre_attack', 'veresov', 'blackmar_diemer', 'richter_veresov'
  ],
  'White Other': [
    'english_opening', 'reti_opening', 'kings_indian_attack', 'birds_opening',
    'larsen_opening', 'grob_attack', 'other_white'
  ],
  'Sicilian Variations': [
    'sicilian_najdorf', 'sicilian_dragon', 'sicilian_scheveningen',
    'sicilian_sveshnikov', 'sicilian_classical', 'sicilian_kan', 'sicilian_taimanov',
    'sicilian_accelerated_dragon', 'sicilian_alapin', 'sicilian_closed', 'sicilian_other'
  ],
  'Other vs 1.e4': [
    'french_defense', 'caro_kann', 'scandinavian', 'alekhine_defense',
    'pirc_defense', 'modern_defense', 'philidor_defense', 'owen_defense', 'kings_pawn_other'
  ],
  'Indian Defenses': [
    'kings_indian', 'grunfeld', 'nimzo_indian', 'queens_indian', 'bogo_indian'
  ],
  "Queen's Gambit Responses": [
    'queens_gambit_declined', 'queens_gambit_accepted', 'slav_defense',
    'semi_slav', 'tarrasch_defense', 'chigorin_defense'
  ],
  'Other vs 1.d4': [
    'benoni', 'dutch_defense', 'budapest_gambit', 'benko_gambit', 'd4_other'
  ],
  'Other Black': [
    'english_symmetrical', 'anglo_indian', 'other_black'
  ],
};
