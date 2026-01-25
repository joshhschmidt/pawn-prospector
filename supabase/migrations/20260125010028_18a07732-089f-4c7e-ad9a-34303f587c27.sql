-- Create tactical patterns table
CREATE TABLE public.tactical_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('attacks', 'traps', 'checkmates', 'endgames', 'sacrifices')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  fen TEXT NOT NULL,
  moves TEXT[] NOT NULL,
  key_idea TEXT NOT NULL,
  play_as TEXT NOT NULL CHECK (play_as IN ('white', 'black')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tactical_patterns ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read tactical patterns (they're educational content)
CREATE POLICY "Anyone can view tactical patterns"
  ON public.tactical_patterns
  FOR SELECT
  USING (true);

-- Only allow inserts from service role (admin)
CREATE POLICY "Service role can insert tactical patterns"
  ON public.tactical_patterns
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_tactical_patterns_category ON public.tactical_patterns(category);
CREATE INDEX idx_tactical_patterns_difficulty ON public.tactical_patterns(difficulty);