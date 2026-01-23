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
    const { topOpenings, playerColor } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert chess coach helping a player practice their best openings.
For each opening provided, generate 6-8 different practice lines (variations) that the player should know.
Mark 2-3 of the most important lines as "recommended" based on:
- Frequency in master games
- Strategic importance
- How well it fits the player's winning style

Respond ONLY with valid JSON in this exact format:
{
  "openings": [
    {
      "bucket": "italian_game",
      "name": "Italian Game",
      "lines": [
        {
          "name": "Giuoco Piano - Main Line",
          "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4"],
          "keyIdea": "Control the center with d4 and develop pieces harmoniously",
          "recommended": true
        },
        {
          "name": "Evans Gambit",
          "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4", "Bxb4", "c3"],
          "keyIdea": "Sacrifice a pawn for rapid development and attack",
          "recommended": true
        },
        {
          "name": "Giuoco Pianissimo",
          "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "d3", "Nf6", "O-O"],
          "keyIdea": "Slow, positional setup with a solid pawn structure",
          "recommended": false
        },
        {
          "name": "Italian Game - Knight Attack",
          "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "Ng5", "d5", "exd5"],
          "keyIdea": "Aggressive knight jump targeting f7",
          "recommended": false
        }
      ]
    }
  ]
}

Each line should:
- Have a descriptive name
- Include 8-14 moves in standard algebraic notation
- Have one key strategic idea
- Have a "recommended" boolean (true for 2-3 most important lines per opening)`;

    const colorContext = playerColor === 'white' ? 'as White' : 'as Black';
    
    const userPrompt = `Generate 6-8 practice lines for each of these top openings the player uses ${colorContext}:

${topOpenings.map((o: any, i: number) => 
  `${i + 1}. ${o.label} (bucket: ${o.bucket}) - ${o.games} games, ${o.winRate.toFixed(0)}% win rate`
).join('\n')}

For each opening:
1. Provide 6-8 different variations or lines commonly played
2. Mark 2-3 as "recommended" - these should be the most important lines to know
3. Include both main lines and popular sidelines
4. Make sure the lines are appropriate for ${playerColor}

Sort the lines within each opening with recommended ones first.`;

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

    const result = JSON.parse(jsonMatch[0]);
    
    // Ensure recommended lines are sorted to the top within each opening
    if (result.openings) {
      result.openings = result.openings.map((opening: any) => ({
        ...opening,
        lines: opening.lines.sort((a: any, b: any) => {
          if (a.recommended && !b.recommended) return -1;
          if (!a.recommended && b.recommended) return 1;
          return 0;
        })
      }));
    }

    return new Response(JSON.stringify(result), {
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
