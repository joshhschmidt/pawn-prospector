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
For each opening provided, generate exactly 3 different practice lines (variations) that the player should know.

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
          "keyIdea": "Control the center with d4 and develop pieces harmoniously"
        },
        {
          "name": "Evans Gambit",
          "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4", "Bxb4", "c3"],
          "keyIdea": "Sacrifice a pawn for rapid development and attack"
        },
        {
          "name": "Giuoco Pianissimo",
          "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "d3", "Nf6", "O-O"],
          "keyIdea": "Slow, positional setup with a solid pawn structure"
        }
      ]
    }
  ]
}

Each line should:
- Have a descriptive name
- Include 8-12 moves in standard algebraic notation
- Have one key strategic idea`;

    const colorContext = playerColor === 'white' ? 'as White' : 'as Black';
    
    const userPrompt = `Generate 3 practice lines for each of these top openings the player uses ${colorContext}:

${topOpenings.map((o: any, i: number) => 
  `${i + 1}. ${o.label} (bucket: ${o.bucket}) - ${o.games} games, ${o.winRate.toFixed(0)}% win rate`
).join('\n')}

For each opening, provide 3 different variations or lines that are commonly played and important to know.
Make sure the lines are appropriate for the color (${playerColor}).`;

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
