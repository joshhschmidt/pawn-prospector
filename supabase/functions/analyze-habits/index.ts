import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patterns } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert chess coach analyzing a player's game patterns to identify decisive habits.
Based on the game statistics provided, identify exactly 3 winning habits and 3 losing habits.

For winning habits, focus on tactics and patterns that create decisive evaluation swings IN FAVOR of the player.
For losing habits, focus on mistakes and patterns that create decisive evaluation swings AGAINST the player.

Each insight should include:
- A clear, specific title (e.g., "Early Castling Dominance", "Knight Fork Vulnerability")
- A detailed explanation of how this pattern creates decisive evaluation swings
- A frequency indicator based on the data

Respond ONLY with valid JSON in this exact format:
{
  "winningHabits": [
    { "title": "...", "description": "...", "frequency": "Occurred in X% of wins" }
  ],
  "losingHabits": [
    { "title": "...", "description": "...", "frequency": "Occurred in X% of losses" }
  ]
}`;

    const userPrompt = `Analyze these game patterns and identify decisive habits:

Total Games: ${patterns.totalGames}
Wins: ${patterns.wins}
Losses: ${patterns.losses}

WINNING PATTERNS:
- Quick wins (under 15 moves): ${patterns.winPatterns.quickWins}
- Games with early castling (≤ply 10): ${patterns.winPatterns.earlyCastling}
- Games with minimal queen activity (≤1 moves in first 10): ${patterns.winPatterns.lowQueenMoves}
- Average queen moves in first 10: ${patterns.winPatterns.avgQueenMoves.toFixed(1)}
- Average castling ply in wins: ${patterns.winPatterns.avgCastlingPly.toFixed(1)}
- Best performing opening: ${patterns.openingPerformance.bestOpening || 'N/A'}

LOSING PATTERNS:
- Quick losses (under 15 moves): ${patterns.lossPatterns.quickLosses}
- Games with late castling (>ply 16): ${patterns.lossPatterns.lateCastling}
- Games where never castled: ${patterns.lossPatterns.neverCastled}
- Nc7 knight fork losses: ${patterns.lossPatterns.nc7Forks}
- Excessive queen moves (≥3 in first 10): ${patterns.lossPatterns.highQueenMoves}
- Games with 2+ early checks received: ${patterns.lossPatterns.earlyChecks}
- Queen tempo loss games: ${patterns.lossPatterns.tempoLoss}
- Average queen moves in first 10: ${patterns.lossPatterns.avgQueenMoves.toFixed(1)}
- Worst performing opening: ${patterns.openingPerformance.worstOpening || 'N/A'}

Provide exactly 3 winning habits and 3 losing habits based on this data.`;

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from AI response");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-habits error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
