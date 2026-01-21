-- Drop the old enum and create an expanded one
ALTER TABLE public.games DROP COLUMN IF EXISTS opening_bucket;

DROP TYPE IF EXISTS public.opening_bucket;

CREATE TYPE public.opening_bucket AS ENUM (
  -- White 1.e4 openings
  'italian_game',
  'ruy_lopez',
  'scotch_game',
  'kings_gambit',
  'vienna_game',
  'bishops_opening',
  'four_knights',
  'petrov_defense',
  'center_game',
  'danish_gambit',
  'ponziani',
  
  -- White 1.d4 openings
  'london_system',
  'queens_gambit',
  'catalan',
  'trompowsky',
  'colle_system',
  'torre_attack',
  'veresov',
  'blackmar_diemer',
  'richter_veresov',
  
  -- White 1.c4 / 1.Nf3 / other
  'english_opening',
  'reti_opening',
  'kings_indian_attack',
  'birds_opening',
  'larsen_opening',
  'grob_attack',
  'other_white',
  
  -- Black vs 1.e4
  'sicilian_najdorf',
  'sicilian_dragon',
  'sicilian_scheveningen',
  'sicilian_sveshnikov',
  'sicilian_classical',
  'sicilian_kan',
  'sicilian_taimanov',
  'sicilian_accelerated_dragon',
  'sicilian_alapin',
  'sicilian_closed',
  'sicilian_other',
  'french_defense',
  'caro_kann',
  'scandinavian',
  'alekhine_defense',
  'pirc_defense',
  'modern_defense',
  'philidor_defense',
  'owen_defense',
  'kings_pawn_other',
  
  -- Black vs 1.d4
  'kings_indian',
  'grunfeld',
  'nimzo_indian',
  'queens_indian',
  'bogo_indian',
  'benoni',
  'dutch_defense',
  'slav_defense',
  'semi_slav',
  'queens_gambit_declined',
  'queens_gambit_accepted',
  'tarrasch_defense',
  'chigorin_defense',
  'budapest_gambit',
  'benko_gambit',
  'd4_other',
  
  -- Black vs other
  'english_symmetrical',
  'anglo_indian',
  'other_black'
);

-- Re-add the column
ALTER TABLE public.games ADD COLUMN opening_bucket public.opening_bucket;

-- Re-create the index
CREATE INDEX IF NOT EXISTS idx_games_opening_bucket ON public.games(opening_bucket);