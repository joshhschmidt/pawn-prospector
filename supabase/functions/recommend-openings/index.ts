import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Full list of openings to choose from
const ALL_OPENINGS = [
  { bucket: 'italian_game', name: 'Italian Game', color: 'white' },
  { bucket: 'ruy_lopez', name: 'Ruy López', color: 'white' },
  { bucket: 'scotch_game', name: 'Scotch Game', color: 'white' },
  { bucket: 'kings_gambit', name: "King's Gambit", color: 'white' },
  { bucket: 'vienna_game', name: 'Vienna Game', color: 'white' },
  { bucket: 'london_system', name: 'London System', color: 'white' },
  { bucket: 'queens_gambit', name: "Queen's Gambit", color: 'white' },
  { bucket: 'catalan', name: 'Catalan Opening', color: 'white' },
  { bucket: 'english_opening', name: 'English Opening', color: 'white' },
  { bucket: 'reti_opening', name: 'Réti Opening', color: 'white' },
  { bucket: 'sicilian_najdorf', name: 'Sicilian Najdorf', color: 'black' },
  { bucket: 'sicilian_dragon', name: 'Sicilian Dragon', color: 'black' },
  { bucket: 'french_defense', name: 'French Defense', color: 'black' },
  { bucket: 'caro_kann', name: 'Caro-Kann Defense', color: 'black' },
  { bucket: 'kings_indian', name: "King's Indian", color: 'black' },
  { bucket: 'grunfeld', name: 'Grünfeld Defense', color: 'black' },
  { bucket: 'nimzo_indian', name: 'Nimzo-Indian', color: 'black' },
  { bucket: 'slav_defense', name: 'Slav Defense', color: 'black' },
  { bucket: 'queens_gambit_declined', name: "Queen's Gambit Declined", color: 'black' },
  { bucket: 'dutch_defense', name: 'Dutch Defense', color: 'black' },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerStats, playedOpenings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Find openings the player hasn't tried
    const playedSet = new Set(playedOpenings || []);
    const newOpenings = ALL_OPENINGS.filter(o => !playedSet.has(o.bucket));
    
    if (newOpenings.length === 0) {
      return new Response(JSON.stringify({ openings: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert chess coach recommending new openings for a player to learn.
Based on the player's statistics and playing style, recommend 3 openings they haven't tried yet.
For each opening, provide:
1. A personalized reason why this opening would suit them
2. 2-3 key starting lines to learn

Respond ONLY with valid JSON in this exact format:
{
  "openings": [
    {
      "bucket": "italian_game",
      "name": "Italian Game",
      "reason": "Your aggressive style would thrive with the tactical possibilities in the Italian Game",
      "lines": [
        {
          "name": "Giuoco Piano Main Line",
          "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4"],
          "keyIdea": "Control the center with d4 and develop pieces harmoniously"
        },
        {
          "name": "Evans Gambit",
          "moves": ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4"],
          "keyIdea": "Sacrifice a pawn for rapid development and attack"
        }
      ]
    }
  ]
}

Keep reasons concise (under 20 words). Each line should have 6-10 moves.`;

    const userPrompt = `Here are the player's statistics:
- Total games: ${playerStats.totalGames}
- Win rate: ${playerStats.scorePercent}%
- Average game length: ${playerStats.avgGameLength} moves
- Quick losses: ${playerStats.quickLosses}
- Their top openings: ${playerStats.topOpenings?.join(', ') || 'Unknown'}
- Their weakest openings: ${playerStats.weakestOpenings?.join(', ') || 'Unknown'}

Available new openings to recommend (pick 3):
${newOpenings.slice(0, 10).map(o => `- ${o.name} (${o.bucket}) - plays as ${o.color}`).join('\n')}

Choose 3 openings that would complement their playing style and help them improve.`;

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
    console.error("recommend-openings error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
