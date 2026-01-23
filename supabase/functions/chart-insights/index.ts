import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OpeningData {
  bucket: string;
  label: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  scorePercent: number;
}

interface ChartInsightsRequest {
  chartType: "frequency" | "success" | "color";
  openingStats: OpeningData[];
  whiteStats?: OpeningData[];
  blackStats?: OpeningData[];
  totalGames: number;
  detail?: "brief" | "full";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chartType, openingStats, whiteStats, blackStats, totalGames, detail = "brief" }: ChartInsightsRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let dataContext = "";
    let promptFocus = "";

    if (chartType === "frequency") {
      const topOpenings = openingStats.slice(0, 8).map(o => 
        `${o.label}: ${o.games} games (${((o.games / totalGames) * 100).toFixed(1)}%)`
      ).join("\n");
      
      dataContext = `Opening Frequency Data (${totalGames} total games):\n${topOpenings}`;
      promptFocus = detail === "brief" 
        ? `Give a 2-sentence summary of this player's opening repertoire. Focus on the most important insight.`
        : `Provide a detailed analysis of this player's opening repertoire diversity:
- Are they too concentrated on few openings or well-diversified?
- Which openings might they be avoiding that could benefit them?
- What does their opening choice pattern suggest about their playing style?
- Specific recommendations for expanding or refining their repertoire.`;
    } 
    else if (chartType === "success") {
      const sortedByScore = [...openingStats].sort((a, b) => b.scorePercent - a.scorePercent);
      const best = sortedByScore.slice(0, 3).map(o => 
        `${o.label}: ${o.scorePercent.toFixed(1)}% score (${o.games} games)`
      ).join("\n");
      const worst = sortedByScore.slice(-3).reverse().map(o => 
        `${o.label}: ${o.scorePercent.toFixed(1)}% score (${o.games} games)`
      ).join("\n");
      
      dataContext = `Opening Success Rates:\n\nBest performing:\n${best}\n\nLowest performing:\n${worst}`;
      promptFocus = detail === "brief"
        ? `Give a 2-sentence summary of this player's opening performance. Highlight the key strength or weakness.`
        : `Provide a detailed analysis of this player's opening performance patterns:
- What do their best openings have in common?
- Why might they be struggling with certain openings?
- Should they double down on strengths or work on weaknesses?
- Specific actionable steps to improve their weaker openings.`;
    }
    else if (chartType === "color") {
      const whiteTop = (whiteStats || []).slice(0, 5).map(o => 
        `${o.label}: ${o.scorePercent.toFixed(1)}% (${o.games} games)`
      ).join("\n");
      const blackTop = (blackStats || []).slice(0, 5).map(o => 
        `${o.label}: ${o.scorePercent.toFixed(1)}% (${o.games} games)`
      ).join("\n");
      
      dataContext = `Performance by Color:\n\nAs White:\n${whiteTop}\n\nAs Black:\n${blackTop}`;
      promptFocus = detail === "brief"
        ? `Give a 2-sentence summary comparing this player's White vs Black performance. Note the most significant difference.`
        : `Provide a detailed comparison of this player's performance as White vs Black:
- Do they perform better with one color? Why might that be?
- Are their opening choices appropriate for each color?
- What adjustments could balance their performance?
- Specific opening recommendations for each color.`;
    }

    const systemPrompt = detail === "brief" 
      ? `You are an expert chess coach. Analyze the data and provide exactly 2 sentences - one key observation and one brief recommendation. Be direct and specific.

${dataContext}

${promptFocus}`
      : `You are an expert chess coach providing in-depth, data-driven insights. Give a thorough analysis with specific, actionable recommendations.

${dataContext}

${promptFocus}

Guidelines:
- Write 3-4 detailed paragraphs
- Be specific and reference the actual data
- Provide multiple actionable recommendations
- Use encouraging but honest language
- Include specific opening suggestions where relevant`;

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
          { role: "user", content: detail === "brief" 
            ? "Give me a quick 2-sentence overview of this data." 
            : "Please provide a detailed analysis of this chart data and explain what it means for my chess improvement." 
          },
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
    console.error("Chart insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
