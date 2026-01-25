import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Full list of openings to choose from (expanded to include more options)
const ALL_OPENINGS = [
  // White 1.e4 openings
  { bucket: 'italian_game', name: 'Italian Game', color: 'white' },
  { bucket: 'ruy_lopez', name: 'Ruy López', color: 'white' },
  { bucket: 'scotch_game', name: 'Scotch Game', color: 'white' },
  { bucket: 'kings_gambit', name: "King's Gambit", color: 'white' },
  { bucket: 'vienna_game', name: 'Vienna Game', color: 'white' },
  { bucket: 'bishops_opening', name: "Bishop's Opening", color: 'white' },
  { bucket: 'four_knights', name: 'Four Knights Game', color: 'white' },
  { bucket: 'center_game', name: 'Center Game', color: 'white' },
  { bucket: 'danish_gambit', name: 'Danish Gambit', color: 'white' },
  { bucket: 'ponziani', name: 'Ponziani Opening', color: 'white' },
  // White 1.d4 openings
  { bucket: 'london_system', name: 'London System', color: 'white' },
  { bucket: 'queens_gambit', name: "Queen's Gambit", color: 'white' },
  { bucket: 'catalan', name: 'Catalan Opening', color: 'white' },
  { bucket: 'trompowsky', name: 'Trompowsky Attack', color: 'white' },
  { bucket: 'colle_system', name: 'Colle System', color: 'white' },
  { bucket: 'torre_attack', name: 'Torre Attack', color: 'white' },
  { bucket: 'veresov', name: 'Veresov Attack', color: 'white' },
  { bucket: 'blackmar_diemer', name: 'Blackmar-Diemer Gambit', color: 'white' },
  // White flank openings
  { bucket: 'english_opening', name: 'English Opening', color: 'white' },
  { bucket: 'reti_opening', name: 'Réti Opening', color: 'white' },
  { bucket: 'kings_indian_attack', name: "King's Indian Attack", color: 'white' },
  { bucket: 'birds_opening', name: "Bird's Opening", color: 'white' },
  { bucket: 'larsen_opening', name: "Larsen's Opening", color: 'white' },
  // Black vs 1.e4 - Sicilian
  { bucket: 'sicilian_najdorf', name: 'Sicilian Najdorf', color: 'black' },
  { bucket: 'sicilian_dragon', name: 'Sicilian Dragon', color: 'black' },
  { bucket: 'sicilian_scheveningen', name: 'Sicilian Scheveningen', color: 'black' },
  { bucket: 'sicilian_sveshnikov', name: 'Sicilian Sveshnikov', color: 'black' },
  { bucket: 'sicilian_classical', name: 'Sicilian Classical', color: 'black' },
  { bucket: 'sicilian_kan', name: 'Sicilian Kan', color: 'black' },
  { bucket: 'sicilian_taimanov', name: 'Sicilian Taimanov', color: 'black' },
  { bucket: 'sicilian_accelerated_dragon', name: 'Accelerated Dragon', color: 'black' },
  // Black vs 1.e4 - other
  { bucket: 'french_defense', name: 'French Defense', color: 'black' },
  { bucket: 'caro_kann', name: 'Caro-Kann Defense', color: 'black' },
  { bucket: 'scandinavian', name: 'Scandinavian Defense', color: 'black' },
  { bucket: 'alekhine_defense', name: "Alekhine's Defense", color: 'black' },
  { bucket: 'pirc_defense', name: 'Pirc Defense', color: 'black' },
  { bucket: 'modern_defense', name: 'Modern Defense', color: 'black' },
  { bucket: 'philidor_defense', name: 'Philidor Defense', color: 'black' },
  { bucket: 'petrov_defense', name: 'Petrov Defense', color: 'black' },
  // Black vs 1.d4 - Indian systems
  { bucket: 'kings_indian', name: "King's Indian", color: 'black' },
  { bucket: 'grunfeld', name: 'Grünfeld Defense', color: 'black' },
  { bucket: 'nimzo_indian', name: 'Nimzo-Indian', color: 'black' },
  { bucket: 'queens_indian', name: "Queen's Indian", color: 'black' },
  { bucket: 'bogo_indian', name: 'Bogo-Indian', color: 'black' },
  // Black vs 1.d4 - QG responses
  { bucket: 'slav_defense', name: 'Slav Defense', color: 'black' },
  { bucket: 'semi_slav', name: 'Semi-Slav Defense', color: 'black' },
  { bucket: 'queens_gambit_declined', name: "Queen's Gambit Declined", color: 'black' },
  { bucket: 'queens_gambit_accepted', name: "Queen's Gambit Accepted", color: 'black' },
  { bucket: 'tarrasch_defense', name: 'Tarrasch Defense', color: 'black' },
  { bucket: 'chigorin_defense', name: 'Chigorin Defense', color: 'black' },
  // Black vs 1.d4 - other
  { bucket: 'dutch_defense', name: 'Dutch Defense', color: 'black' },
  { bucket: 'benoni', name: 'Benoni Defense', color: 'black' },
  { bucket: 'benko_gambit', name: 'Benko Gambit', color: 'black' },
  { bucket: 'budapest_gambit', name: 'Budapest Gambit', color: 'black' },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerStats, playedOpenings, desiredColor } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Find openings the player hasn't tried
    const playedSet = new Set(playedOpenings || []);
    const newOpenings = ALL_OPENINGS.filter(o => !playedSet.has(o.bucket));

    // If the client asks for a specific side, prefer recommending openings for that side.
    const preferredOpenings =
      desiredColor === 'white' || desiredColor === 'black'
        ? newOpenings.filter((o) => o.color === desiredColor)
        : newOpenings;

    const candidateOpenings = preferredOpenings.length > 0 ? preferredOpenings : newOpenings;
    
     if (newOpenings.length === 0) {
      return new Response(JSON.stringify({ openings: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert chess coach recommending new openings for a player to learn.
 Based on the player's statistics and playing style, recommend 3 openings they haven't tried yet.
 If possible, include at least one opening the player would play as White and at least one they would play as Black.
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
 ${candidateOpenings.slice(0, 10).map(o => `- ${o.name} (${o.bucket}) - plays as ${o.color}`).join('\n')}

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

    const openings = Array.isArray(result?.openings) ? result.openings : [];
    const enriched = openings
      .slice(0, 3)
      .map((o: any) => {
        const meta = ALL_OPENINGS.find((x) => x.bucket === o.bucket);
        return {
          ...o,
          color: meta?.color ?? o.color,
        };
      });

    return new Response(JSON.stringify({ openings: enriched }), {
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
