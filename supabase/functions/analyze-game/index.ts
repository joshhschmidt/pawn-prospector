import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CriticalMoment {
  moveNumber: number;
  move: string;
  playerColor: 'white' | 'black';
  classification: 'blunder' | 'missed_tactic' | 'turning_point' | 'winning_move' | 'defensive_resource';
  explanation: string;
  alternative: string;
  alternativeExplanation: string;
}

interface AnalysisResult {
  summary: string;
  moments: CriticalMoment[];
}

async function callAIWithRetry(apiKey: string, body: object, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok || response.status < 500) {
        return response;
      }
      
      lastError = new Error(`AI gateway returned ${response.status}`);
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { moves, playerColor, result, opening, opponentName } = await req.json();

    if (!moves || !Array.isArray(moves) || moves.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No moves provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format moves with move numbers for the AI
    const formattedMoves = moves.map((move: string, index: number) => {
      const moveNumber = Math.floor(index / 2) + 1;
      const isWhite = index % 2 === 0;
      return isWhite ? `${moveNumber}. ${move}` : move;
    }).join(' ');

    const systemPrompt = `You are an expert chess analyst. Your task is to analyze a chess game and identify 3-4 decisive moments that shaped the outcome. Focus on:

1. **Blunders**: Moves that significantly worsen the position
2. **Missed Tactics**: Opportunities to win material or deliver checkmate that were missed
3. **Turning Points**: Moves where the advantage shifted from one player to another
4. **Winning Moves**: Brilliant or precise moves that secured the advantage
5. **Defensive Resources**: Critical defensive moves that saved a difficult position

For each moment, provide:
- The exact move number and the move played
- Whether it was White's or Black's move
- A classification of the moment type
- A clear explanation of why this was decisive (2-3 sentences)
- An alternative move that could have been played
- Why that alternative would have been better

Consider the flow of the game and how each moment connects to the final result.`;

    const userPrompt = `Analyze this chess game and identify 3-4 decisive moments:

**Opening**: ${opening || 'Unknown'}
**Player Color**: ${playerColor}
**Result**: ${result} ${result === 'win' ? '(player won)' : result === 'loss' ? '(player lost)' : '(draw)'}
**Opponent**: ${opponentName || 'Unknown'}

**Moves**:
${formattedMoves}

Identify the 3-4 most critical moments that determined the game's outcome.`;

    const response = await callAIWithRetry(LOVABLE_API_KEY, {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'report_analysis',
            description: 'Report the analysis of decisive moments in the chess game',
            parameters: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'A 2-3 sentence summary of the game and what decided it'
                },
                moments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      moveNumber: {
                        type: 'number',
                        description: 'The move number where this occurred (e.g., 15 for move 15)'
                      },
                      move: {
                        type: 'string',
                        description: 'The move that was played in algebraic notation (e.g., Bxh7+)'
                      },
                      playerColor: {
                        type: 'string',
                        enum: ['white', 'black'],
                        description: 'Which player made this move'
                      },
                      classification: {
                        type: 'string',
                        enum: ['blunder', 'missed_tactic', 'turning_point', 'winning_move', 'defensive_resource'],
                        description: 'The type of decisive moment'
                      },
                      explanation: {
                        type: 'string',
                        description: 'Why this moment was decisive (2-3 sentences)'
                      },
                      alternative: {
                        type: 'string',
                        description: 'An alternative move that could have been played'
                      },
                      alternativeExplanation: {
                        type: 'string',
                        description: 'Why the alternative would have been better'
                      }
                    },
                    required: ['moveNumber', 'move', 'playerColor', 'classification', 'explanation', 'alternative', 'alternativeExplanation'],
                    additionalProperties: false
                  },
                  description: 'The 3-4 decisive moments in the game'
                }
              },
              required: ['summary', 'moments'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'report_analysis' } }
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'report_analysis') {
      throw new Error('Unexpected AI response format');
    }

    const analysis: AnalysisResult = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-game:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
