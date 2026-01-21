import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  time_class: string;
  rules: string;
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
}

interface ArchiveResponse {
  games: ChessComGame[];
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ChessCoachAnalyzer/1.0',
        },
      });
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited, waiting ${waitTime}ms before retry`);
        await delay(waitTime);
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000);
    }
  }
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, dateRangeDays, maxGames } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching games for ${username}, last ${dateRangeDays} days, max ${maxGames} games`);

    // Get list of archives
    const archivesUrl = `https://api.chess.com/pub/player/${username}/games/archives`;
    const archivesResponse = await fetchWithRetry(archivesUrl);
    
    if (!archivesResponse.ok) {
      if (archivesResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Player not found on Chess.com' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Failed to fetch archives: ${archivesResponse.status}`);
    }

    const archivesData = await archivesResponse.json();
    const archives: string[] = archivesData.archives || [];

    // Filter archives by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
    
    const relevantArchives = archives.filter(url => {
      const match = url.match(/\/(\d{4})\/(\d{2})$/);
      if (!match) return false;
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const archiveDate = new Date(year, month - 1, 1);
      return archiveDate >= new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), 1);
    }).reverse(); // Most recent first

    console.log(`Found ${relevantArchives.length} relevant archives`);

    // Fetch games from archives
    const allGames: ChessComGame[] = [];
    
    for (const archiveUrl of relevantArchives) {
      if (allGames.length >= maxGames) break;

      console.log(`Fetching archive: ${archiveUrl}`);
      await delay(500); // Rate limiting

      const gamesResponse = await fetchWithRetry(archiveUrl);
      if (!gamesResponse.ok) {
        console.warn(`Failed to fetch archive ${archiveUrl}: ${gamesResponse.status}`);
        continue;
      }

      const gamesData: ArchiveResponse = await gamesResponse.json();
      const games = gamesData.games || [];

      // Filter games by date and add to collection
      for (const game of games.reverse()) { // Most recent first
        if (allGames.length >= maxGames) break;
        
        const gameDate = new Date(game.end_time * 1000);
        if (gameDate >= cutoffDate) {
          allGames.push(game);
        }
      }
    }

    console.log(`Fetched ${allGames.length} games`);

    // Convert to our format
    const processedGames = allGames.map(game => {
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const playerResult = isWhite ? game.white.result : game.black.result;
      
      let result: 'win' | 'loss' | 'draw';
      if (playerResult === 'win') {
        result = 'win';
      } else if (['checkmated', 'timeout', 'resigned', 'lose', 'abandoned'].includes(playerResult)) {
        result = 'loss';
      } else {
        result = 'draw';
      }

      return {
        pgn: game.pgn,
        url: game.url,
        time_control: game.time_control,
        time_class: game.time_class,
        end_time: game.end_time,
        player_color: isWhite ? 'white' : 'black',
        result,
        opponent_name: isWhite ? game.black.username : game.white.username,
        opponent_rating: isWhite ? game.black.rating : game.white.rating,
        player_rating: isWhite ? game.white.rating : game.black.rating,
      };
    });

    return new Response(
      JSON.stringify({ games: processedGames, total: processedGames.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching chess games:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch games';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
