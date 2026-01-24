import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface PlayerStats {
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
  topOpenings: string[];
  weakestOpenings: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, playerStats, username } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a context-aware system prompt with player stats
    const statsContext = playerStats ? `
Player Statistics for ${username || 'this player'}:
- Total Games Analyzed: ${playerStats.totalGames}
- Win/Draw/Loss: ${playerStats.wins}/${playerStats.draws}/${playerStats.losses}
- Overall Score: ${playerStats.scorePercent?.toFixed(1)}%
- Average Game Length: ${playerStats.avgGameLength} moves
- Average Castling Move: ${playerStats.avgCastlingPly > 0 ? `Move ${Math.round(playerStats.avgCastlingPly / 2)}` : 'Often doesn\'t castle'}
- Early Queen Moves (first 10 moves): ${playerStats.avgQueenMovesFirst10?.toFixed(1)} per game
- Quick Losses (under 15 moves): ${playerStats.quickLosses}
- Quick Wins (under 15 moves): ${playerStats.quickWins}
- Strongest Openings: ${playerStats.topOpenings?.join(', ') || 'Not enough data'}
- Weakest Openings: ${playerStats.weakestOpenings?.join(', ') || 'Not enough data'}
` : 'No player statistics available yet.';

    const systemPrompt = `You are an expert chess coach providing personalized advice. You have access to the player's game statistics and should give specific, actionable coaching advice.

${statsContext}

Guidelines:
- Be encouraging but honest about areas for improvement
- Give specific, practical advice they can apply in their next game
- Reference their actual statistics when making recommendations
- Keep responses concise but helpful (2-4 paragraphs max)
- Focus on pattern-based coaching, not engine analysis
- Suggest specific opening choices based on their performance data
- Address common amateur mistakes like early queen moves, delayed castling, etc.

IMPORTANT - When suggesting opening lines to practice:
- Always format the moves clearly with move numbers like: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5
- Include the opening name before the moves, like: **Italian Game Main Line**: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4
- Provide at least 4-5 moves (8-10 half-moves) for each line
- The player can practice these lines on the chessboard next to the chat

IMPORTANT - When discussing middle game tactical patterns:
- You can suggest famous tactical motifs like the Fried Liver Attack, Greek Gift Sacrifice, Légal Trap, Noah's Ark Trap, smothered mate, back rank mate, etc.
- Format tactical sequences the same way as openings: **Fried Liver Attack**: 1. Nxf7 Kxf7 2. Qf3+ Ke6 3. Nc3
- The system will automatically load the correct starting position for known tactical patterns
- Explain the key idea behind each tactic so the player understands WHY it works

If asked about their openings, reference their actual performance data. If asked for a training plan, create one based on their weaknesses.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chess coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
