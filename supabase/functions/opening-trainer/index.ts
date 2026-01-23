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
    const { openingStats, playerColor } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert chess coach helping a player improve their opening repertoire.
Based on their game statistics, recommend specific opening lines they should practice.

For each recommendation, provide:
1. The opening name
2. A brief reason why they should practice it
3. The main line moves in standard algebraic notation (SAN)
4. 2-3 key ideas or plans in the opening

Respond ONLY with valid JSON in this exact format:
{
  "recommendations": [
    {
      "name": "Italian Game - Giuoco Piano",
      "reason": "Your most played opening with room for improvement",
      "mainLine": ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4"],
      "keyIdeas": [
        "Control the center with d4",
        "Develop pieces toward the kingside",
        "Castle early for king safety"
      ],
      "color": "white",
      "difficulty": "beginner"
    }
  ]
}

Provide exactly 3 opening recommendations based on the player's statistics.`;

    const colorContext = playerColor === 'white' ? 'as White' : playerColor === 'black' ? 'as Black' : 'for both colors';
    
    const userPrompt = `Analyze this player's opening statistics and recommend 3 openings to practice ${colorContext}:

Opening Statistics (sorted by games played):
${openingStats.slice(0, 10).map((o: any) => 
  `- ${o.label || o.bucket}: ${o.games} games, ${o.scorePercent.toFixed(0)}% score (${o.wins}W/${o.losses}L/${o.draws}D)`
).join('\n')}

Focus on:
1. Openings where they're underperforming (low win rate with decent sample size)
2. Their most played openings that could use refinement
3. A new opening that complements their style

For each opening, provide the full main line moves and practical ideas.`;

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

    const recommendations = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("opening-trainer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
