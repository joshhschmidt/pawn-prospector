import { useState, useEffect, useCallback } from 'react';
import { Game } from '@/types/chess';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useGames = () => {
  const { user, isAuthenticated } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSavedGames, setHasSavedGames] = useState(false);

  // Load games from database on auth change
  useEffect(() => {
    if (isAuthenticated && user) {
      loadGamesFromDatabase();
    } else {
      setGames([]);
      setHasSavedGames(false);
    }
  }, [isAuthenticated, user?.id]);

  const loadGamesFromDatabase = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('game_date', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Map database rows to Game type
        const mappedGames: Game[] = data.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          game_date: row.game_date,
          time_control: row.time_control,
          player_color: row.player_color as 'white' | 'black',
          result: row.result,
          opponent_name: row.opponent_name,
          opponent_rating: row.opponent_rating,
          player_rating: row.player_rating,
          total_moves: row.total_moves,
          moves: row.moves,
          opening_bucket: row.opening_bucket,
          pgn_raw: row.pgn_raw,
          game_url: row.game_url,
          castled_at_ply: row.castled_at_ply,
          queen_moves_first_10: row.queen_moves_first_10,
          is_quick_loss: row.is_quick_loss ?? false,
          is_quick_win: row.is_quick_win ?? false,
          early_checks_received: row.early_checks_received,
          queen_tempo_loss: row.queen_tempo_loss ?? false,
          nc7_fork_detected: row.nc7_fork_detected ?? false,
          created_at: row.created_at,
        }));
        setGames(mappedGames);
        setHasSavedGames(true);
      } else {
        setHasSavedGames(false);
      }
    } catch (error) {
      console.error('Failed to load games from database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGamesToDatabase = async (gamesToSave: Game[]): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to save games');
      return false;
    }

    setIsLoading(true);
    try {
      // Delete existing games for this user first
      const { error: deleteError } = await supabase
        .from('games')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Insert new games with user_id
      const gamesWithUserId = gamesToSave.map((game) => ({
        ...game,
        user_id: user.id,
        // Ensure boolean fields have defaults
        is_quick_loss: game.is_quick_loss ?? false,
        is_quick_win: game.is_quick_win ?? false,
        queen_tempo_loss: game.queen_tempo_loss ?? false,
        nc7_fork_detected: game.nc7_fork_detected ?? false,
      }));

      const { error: insertError } = await supabase
        .from('games')
        .insert(gamesWithUserId);

      if (insertError) throw insertError;

      setGames(gamesToSave);
      setHasSavedGames(true);
      toast.success(`Saved ${gamesToSave.length} games to your account`);
      return true;
    } catch (error) {
      console.error('Failed to save games:', error);
      toast.error('Failed to save games to database');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearGames = useCallback(() => {
    setGames([]);
    setHasSavedGames(false);
  }, []);

  return {
    games,
    setGames,
    isLoading,
    hasSavedGames,
    loadGamesFromDatabase,
    saveGamesToDatabase,
    clearGames,
  };
};
