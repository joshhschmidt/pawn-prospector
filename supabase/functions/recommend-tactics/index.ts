import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  scorePercent: number;
  avgGameLength: number;
  quickLosses: number;
  quickWins: number;
  topOpenings: string[];
  weakestOpenings: string[];
}

interface TacticalPattern {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  fen: string;
  moves: string[];
  key_idea: string;
  play_as: string;
  tags: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerStats, patterns } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const stats = playerStats as PlayerStats;
    const allPatterns = patterns as TacticalPattern[];

    // Build a prompt for AI to select the best patterns
    const patternSummary = allPatterns.map((p, i) => 
      `${i + 1}. ${p.name} (${p.category}, ${p.difficulty}) - ${p.key_idea.slice(0, 80)}...`
    ).join('\n');

    const systemPrompt = `You are a chess coach analyzing a player's game statistics to recommend tactical patterns they should practice.

Based on the player's statistics and common weaknesses, select exactly 3 tactical patterns that would benefit them most.

RULES:
- Return ONLY a JSON object with this exact format: {"recommendations": [{"index": 1, "reason": "brief reason"}, ...]}
- The "index" should be the pattern number from the list (1-indexed)
- Keep reasons under 20 words
- Consider the player's quick losses (need defense), quick wins (reinforce attacking), and overall score
- Match difficulty to skill level (lower score = more beginner patterns)`;

    const userPrompt = `PLAYER STATISTICS:
- Total Games: ${stats.totalGames}
- Win Rate: ${stats.scorePercent.toFixed(1)}%
- Wins: ${stats.wins}, Losses: ${stats.losses}, Draws: ${stats.draws}
- Quick Losses (under 20 moves): ${stats.quickLosses}
- Quick Wins: ${stats.quickWins}
- Average Game Length: ${stats.avgGameLength.toFixed(0)} moves
- Strongest Openings: ${stats.topOpenings.join(', ') || 'Unknown'}
- Weakest Openings: ${stats.weakestOpenings.join(', ') || 'Unknown'}

AVAILABLE PATTERNS:
${patternSummary}

Select the 3 best patterns for this player to practice. Return only JSON.`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the AI response to extract recommendations
    let recommendations: { index: number; reason: string }[] = [];
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        recommendations = parsed.recommendations || [];
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      // Fallback: return first 3 patterns based on difficulty matching
      const scorePercent = stats.scorePercent;
      let targetDifficulty = 'intermediate';
      if (scorePercent < 40) targetDifficulty = 'beginner';
      else if (scorePercent > 65) targetDifficulty = 'advanced';
      
      const fallbackPatterns = allPatterns
        .filter(p => p.difficulty === targetDifficulty)
        .slice(0, 3)
        .map((p, i) => ({ 
          index: allPatterns.indexOf(p) + 1, 
          reason: `Matches your skill level (${targetDifficulty})`
        }));
      
      recommendations = fallbackPatterns;
    }

    // Map indices to actual patterns
    const recommendedPatterns = recommendations.slice(0, 3).map(rec => {
      const pattern = allPatterns[rec.index - 1];
      if (!pattern) return null;
      return {
        ...pattern,
        recommendation_reason: rec.reason
      };
    }).filter(Boolean);

    return new Response(JSON.stringify({ recommendations: recommendedPatterns }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("recommend-tactics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
