-- Create enum for game results
CREATE TYPE public.game_result AS ENUM ('win', 'loss', 'draw');

-- Create enum for time control
CREATE TYPE public.time_control AS ENUM ('bullet', 'blitz', 'rapid', 'classical', 'correspondence');

-- Create enum for opening bucket
CREATE TYPE public.opening_bucket AS ENUM (
  'london',
  'queens_gambit',
  'other_d4',
  'non_d4_white',
  'sicilian',
  'sicilian_dragon',
  'pirc_modern',
  'other_e4_black',
  'other_black'
);

-- Users table for storing chess.com usernames
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chess_com_username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Games table for storing parsed games
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_date TIMESTAMP WITH TIME ZONE,
  time_control public.time_control,
  player_color TEXT NOT NULL CHECK (player_color IN ('white', 'black')),
  result public.game_result NOT NULL,
  opponent_name TEXT,
  opponent_rating INTEGER,
  player_rating INTEGER,
  total_moves INTEGER,
  moves TEXT[], -- Array of SAN moves
  opening_bucket public.opening_bucket,
  pgn_raw TEXT,
  game_url TEXT,
  -- Computed metrics
  castled_at_ply INTEGER,
  queen_moves_first_10 INTEGER DEFAULT 0,
  is_quick_loss BOOLEAN DEFAULT false,
  is_quick_win BOOLEAN DEFAULT false,
  early_checks_received INTEGER DEFAULT 0,
  queen_tempo_loss BOOLEAN DEFAULT false,
  nc7_fork_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint to prevent duplicates
  UNIQUE (user_id, game_date, opponent_name, player_color)
);

-- Game features table for additional derived metrics
CREATE TABLE public.game_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  feature_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Coaching reports table
CREATE TABLE public.coaching_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_games INTEGER,
  date_range_start TIMESTAMP WITH TIME ZONE,
  date_range_end TIMESTAMP WITH TIME ZONE,
  strengths JSONB,
  weaknesses JSONB,
  recommendations JSONB,
  training_plan JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_games_user_id ON public.games(user_id);
CREATE INDEX idx_games_player_color ON public.games(player_color);
CREATE INDEX idx_games_opening_bucket ON public.games(opening_bucket);
CREATE INDEX idx_games_game_date ON public.games(game_date);
CREATE INDEX idx_games_time_control ON public.games(time_control);
CREATE INDEX idx_game_features_game_id ON public.game_features(game_id);
CREATE INDEX idx_coaching_reports_user_id ON public.coaching_reports(user_id);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_reports ENABLE ROW LEVEL SECURITY;

-- Public access policies (for MVP without auth - users identified by session/username)
CREATE POLICY "Anyone can create users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Anyone can update users" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Anyone can create games" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Anyone can update games" ON public.games FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete games" ON public.games FOR DELETE USING (true);

CREATE POLICY "Anyone can create game_features" ON public.game_features FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view game_features" ON public.game_features FOR SELECT USING (true);

CREATE POLICY "Anyone can create coaching_reports" ON public.coaching_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view coaching_reports" ON public.coaching_reports FOR SELECT USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();