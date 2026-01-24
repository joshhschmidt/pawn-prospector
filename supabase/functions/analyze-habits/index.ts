import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to call AI gateway with retry logic for transient errors
async function callAIWithRetry(
  apiKey: string,
  body: object,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      // If successful or a client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // For 5xx errors, retry after a delay
      const errorText = await response.text();
      console.error(`AI gateway error (attempt ${attempt + 1}):`, response.status, errorText);
      lastError = new Error(`AI gateway returned ${response.status}`);
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } catch (err) {
      console.error(`Network error (attempt ${attempt + 1}):`, err);
      lastError = err instanceof Error ? err : new Error("Network error");
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError || new Error("AI gateway unavailable after retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { patterns, detailRequest, habitTitle, habitDescription, habitType } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle detailed explanation request
    if (detailRequest) {
      const detailPrompt = `You are an expert chess coach. Provide a detailed, educational explanation for this chess habit:

Title: ${habitTitle}
Brief Description: ${habitDescription}
Type: ${habitType === 'winning' ? 'This is a winning habit that creates decisive advantages' : 'This is a losing habit that leads to decisive disadvantages'}

Provide a comprehensive explanation (200-300 words) that includes:
1. Why this pattern creates decisive evaluation swings
2. The underlying chess principles involved
3. Specific examples of how this manifests in games
4. Practical advice for the player

CRITICAL RULES:
- Write in second person (you/your) to make it personal and actionable
- NEVER refer to yourself as an AI, assistant, coach, or any similar term
- NEVER use phrases like "I recommend", "As your coach", "I suggest" - just state the advice directly
- Write in plain text only - do NOT use any markdown formatting like **, ##, #, *, or bullet points
- Use natural flowing paragraphs instead of lists
- Always use the word "moves" instead of "ply" or "plies" when referring to chess moves`;

      const detailResponse = await callAIWithRetry(LOVABLE_API_KEY, {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: detailPrompt }
        ],
      });

      if (!detailResponse.ok) {
        if (detailResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (detailResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "API credits exhausted." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error("AI gateway error for detail request");
      }

      const detailData = await detailResponse.json();
      const detailedExplanation = detailData.choices?.[0]?.message?.content || 'Unable to generate explanation.';

      return new Response(JSON.stringify({ detailedExplanation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert chess coach analyzing a player's game patterns to identify decisive habits.
Based on the game statistics provided, identify exactly 3 winning habits and 3 losing habits.

For winning habits, focus on tactics and patterns that create decisive evaluation swings IN FAVOR of the player.
For losing habits, focus on mistakes and patterns that create decisive evaluation swings AGAINST the player.

Each insight should include:
- A clear, specific title (e.g., "Early Castling Dominance", "Knight Fork Vulnerability")
- A detailed explanation of how this pattern creates decisive evaluation swings
- A frequency indicator based on the data

IMPORTANT: Always use the word "moves" instead of "ply" or "plies" when referring to chess moves.

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

    const response = await callAIWithRetry(LOVABLE_API_KEY, {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
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
      throw new Error("AI service temporarily unavailable. Please try again.");
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
