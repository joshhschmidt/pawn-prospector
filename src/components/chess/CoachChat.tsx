import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, GraduationCap, User, Loader2, Sparkles, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PracticeLine } from './PracticeBoard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  practiceLines?: ExtractedLine[];
}

interface ExtractedLine {
  name: string;
  moves: string[];
  keyIdea: string;
  startingFen?: string;
  playAs?: 'white' | 'black';
}

interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  scorePercent: number;
  avgGameLength: number;
  avgQueenMovesFirst10: number;
  avgCastlingPly: number;
  quickLosses: number;
  quickWins: number;
  topOpenings: string[];
  weakestOpenings: string[];
}

interface CoachChatProps {
  playerStats: PlayerStats;
  username: string;
  initialContext?: string | null;
  onContextConsumed?: () => void;
  onPracticeLineSelected?: (line: PracticeLine, color: 'white' | 'black') => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chess-coach`;

const SUGGESTED_QUESTIONS = [
  "What should I focus on to improve?",
  "Why am I losing games quickly?",
  "Suggest an opening line I can practice",
  "Teach me a tactical pattern like the Fried Liver",
  "Create a training plan for me",
];

export const CoachChat = ({ playerStats, username, initialContext, onContextConsumed, onPracticeLineSelected }: CoachChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextSent, setContextSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-send initial context when provided
  useEffect(() => {
    if (initialContext && !contextSent && messages.length === 0) {
      setContextSent(true);
      sendMessage(initialContext);
      onContextConsumed?.();
    }
  }, [initialContext, contextSent, messages.length]);

  // Common middle game tactical sequences with starting positions and which color executes
  const TACTICAL_SEQUENCES: Record<string, { fen: string; keyIdea: string; playAs: 'white' | 'black' }> = {
    'fried liver': {
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/5N2/PPPP1PPP/RNB1K2R w KQkq - 4 4',
      keyIdea: 'Sacrifice the knight on f7 to expose the king and launch a devastating attack',
      playAs: 'white'
    },
    'greek gift': {
      // Classic position: White has Bd3, Nf3, Queen ready; Black has castled with knight on f6
      fen: 'r1bq1rk1/pppn1ppp/4pn2/3p4/3P4/3BPN2/PPP2PPP/R1BQ1RK1 w - - 0 8',
      keyIdea: 'Sacrifice the bishop on h7 to open lines against the castled king, follow with Ng5+ and Qh5',
      playAs: 'white'
    },
    'légal trap': {
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3',
      keyIdea: 'Sacrifice the queen to deliver a smothered checkmate pattern',
      playAs: 'white'
    },
    'noah\'s ark trap': {
      fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
      keyIdea: 'Trap the bishop on b5 with a3 and b5, winning material',
      playAs: 'black'
    },
    'smothered mate': {
      fen: 'r4rk1/ppp2ppp/2n1b3/2bpP2q/3P4/2N2N2/PPP2PPP/R1BQR1K1 w - - 0 10',
      keyIdea: 'Deliver checkmate with a knight when the king is trapped by its own pieces',
      playAs: 'white'
    },
    'back rank mate': {
      fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
      keyIdea: 'Exploit the weak back rank when the king lacks escape squares',
      playAs: 'white'
    },
    'arabian mate': {
      fen: '5rk1/5ppp/8/8/8/8/5PPP/R4RK1 w - - 0 1',
      keyIdea: 'Coordinate rook and knight to deliver mate on the edge of the board',
      playAs: 'white'
    },
    'anastasia\'s mate': {
      fen: 'r4rk1/pppq1ppp/2n1b3/4N3/3P4/8/PPP2PPP/R2QR1K1 w - - 0 1',
      keyIdea: 'Use knight and rook to create a deadly mating net on the h-file',
      playAs: 'white'
    },
    // Opening patterns - White openings
    'italian game': { fen: '', keyIdea: 'Control the center and develop pieces actively', playAs: 'white' },
    'ruy lopez': { fen: '', keyIdea: 'Put pressure on the e5 pawn and prepare for a strong center', playAs: 'white' },
    'london system': { fen: '', keyIdea: 'Solid development with the dark-squared bishop on f4', playAs: 'white' },
    'queen\'s gambit': { fen: '', keyIdea: 'Fight for central control and open lines for pieces', playAs: 'white' },
    'scotch game': { fen: '', keyIdea: 'Open the center early and develop actively', playAs: 'white' },
    'vienna game': { fen: '', keyIdea: 'Prepare f4 to attack the center aggressively', playAs: 'white' },
    'king\'s gambit': { fen: '', keyIdea: 'Sacrifice a pawn for rapid development and attack', playAs: 'white' },
    // Opening patterns - Black defenses
    'sicilian': { fen: '', keyIdea: 'Create asymmetric positions with counterplay on the c-file', playAs: 'black' },
    'french defense': { fen: '', keyIdea: 'Build a solid pawn structure and counterattack the center', playAs: 'black' },
    'caro-kann': { fen: '', keyIdea: 'Develop solidly while maintaining a strong pawn structure', playAs: 'black' },
    'king\'s indian': { fen: '', keyIdea: 'Fianchetto the bishop and prepare a kingside attack', playAs: 'black' },
    'nimzo-indian': { fen: '', keyIdea: 'Control e4 and create doubled pawns on c3', playAs: 'black' },
    'dutch defense': { fen: '', keyIdea: 'Control e4 with f5 and prepare kingside play', playAs: 'black' },
    'scandinavian': { fen: '', keyIdea: 'Challenge the center immediately with d5', playAs: 'black' },
    'pirc defense': { fen: '', keyIdea: 'Allow White to build a center, then undermine it', playAs: 'black' },
    'alekhine': { fen: '', keyIdea: 'Provoke White\'s pawns forward then attack them', playAs: 'black' },
    'grünfeld': { fen: '', keyIdea: 'Let White build a big center, then destroy it', playAs: 'black' },
    'slav defense': { fen: '', keyIdea: 'Solid defense supporting d5 with c6', playAs: 'black' },
  };

  // Extract practice lines from AI response
  const extractPracticeLines = (content: string): ExtractedLine[] => {
    const lines: ExtractedLine[] = [];
    const seenNames = new Set<string>();
    
    // Helper to parse moves from a string like "1. e4 e5 2. Nf3 Nc6"
    const parseMoves = (moveString: string): string[] => {
      const moves: string[] = [];
      // Match each move number followed by white's move and optionally black's move
      const movePattern = /(\d+)\.\s*([A-Za-z][a-zA-Z0-9+#=xO\-]*)\s*([A-Za-z][a-zA-Z0-9+#=xO\-]*)?/g;
      let match;
      while ((match = movePattern.exec(moveString)) !== null) {
        if (match[2]) moves.push(match[2]);
        if (match[3]) moves.push(match[3]);
      }
      return moves;
    };

    // Check for known tactical/opening patterns in content
    const checkForPattern = (name: string): { fen: string; keyIdea: string; playAs: 'white' | 'black' } | null => {
      const lowerName = name.toLowerCase();
      for (const [key, value] of Object.entries(TACTICAL_SEQUENCES)) {
        if (lowerName.includes(key)) {
          return value;
        }
      }
      return null;
    };

    // Pattern for FEN positions: [FEN: ...]
    const fenPattern = /\[FEN:\s*([^\]]+)\]/gi;
    const fenMatches: Record<string, string> = {};
    let fenMatch;
    while ((fenMatch = fenPattern.exec(content)) !== null) {
      const fenPosition = fenMatch[1].trim();
      // Associate with nearby line name
      const contextAfter = content.slice(fenMatch.index, fenMatch.index + 200);
      const nameMatch = contextAfter.match(/\*\*([^*]+)\*\*/);
      if (nameMatch) {
        fenMatches[nameMatch[1].toLowerCase()] = fenPosition;
      }
    }
    
    // Pattern 1: **Opening/Tactic Name**: 1. e4 e5 2. Nf3... (bold name with colon)
    const boldColonPattern = /\*\*([^*]+)\*\*\s*:\s*((?:\d+\.\s*[A-Za-z][a-zA-Z0-9+#=xO\-]*\s*[A-Za-z]?[a-zA-Z0-9+#=xO\-]*\s*)+)/g;
    let match;
    while ((match = boldColonPattern.exec(content)) !== null) {
      const name = match[1].trim();
      const moves = parseMoves(match[2]);
      if (moves.length >= 4 && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        const pattern = checkForPattern(name);
        const explicitFen = fenMatches[name.toLowerCase()];
        lines.push({ 
          name, 
          moves, 
          keyIdea: pattern?.keyIdea || `Practice the ${name} sequence`,
          startingFen: explicitFen || (pattern?.fen || undefined),
          playAs: pattern?.playAs
        });
      }
    }
    
    // Pattern 2: Opening/Tactic Name: 1. e4 e5... (non-bold with colon)
    const colonPattern = /(?:^|\n)\s*([A-Z][a-zA-Z\s'-]+?):\s*((?:\d+\.\s*[A-Za-z][a-zA-Z0-9+#=xO\-]*\s*[A-Za-z]?[a-zA-Z0-9+#=xO\-]*\s*)+)/g;
    while ((match = colonPattern.exec(content)) !== null) {
      const name = match[1].trim();
      const moves = parseMoves(match[2]);
      if (moves.length >= 4 && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        const pattern = checkForPattern(name);
        const explicitFen = fenMatches[name.toLowerCase()];
        lines.push({ 
          name, 
          moves, 
          keyIdea: pattern?.keyIdea || `Practice the ${name} sequence`,
          startingFen: explicitFen || (pattern?.fen || undefined),
          playAs: pattern?.playAs
        });
      }
    }
    
    // Pattern 3: Look for standalone move sequences (at least 3 move pairs)
    const standalonePattern = /(?:^|\n)\s*((?:1\.\s*[A-Za-z][a-zA-Z0-9+#=xO\-]*\s*[A-Za-z][a-zA-Z0-9+#=xO\-]*\s*)(?:\d+\.\s*[A-Za-z][a-zA-Z0-9+#=xO\-]*\s*[A-Za-z]?[a-zA-Z0-9+#=xO\-]*\s*){2,})/g;
    while ((match = standalonePattern.exec(content)) !== null) {
      const moves = parseMoves(match[1]);
      if (moves.length >= 6 && lines.length < 3) {
        // Try to find a name from context (look for text before on same paragraph)
        const contextBefore = content.slice(Math.max(0, match.index - 100), match.index);
        const nameMatch = contextBefore.match(/(?:\*\*)?([A-Z][a-zA-Z\s'-]+?)(?:\*\*)?\s*(?::|-)?\s*$/);
        const name = nameMatch ? nameMatch[1].trim() : `Opening Line ${lines.length + 1}`;
        if (!seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase());
          const pattern = checkForPattern(name);
          lines.push({ 
            name, 
            moves, 
            keyIdea: pattern?.keyIdea || `Practice this sequence`,
            startingFen: pattern?.fen || undefined,
            playAs: pattern?.playAs
          });
        }
      }
    }
    
    return lines.slice(0, 3);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      const practiceLines = extractPracticeLines(assistantContent);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent, practiceLines } : m
          );
        }
        return [...prev, { role: 'assistant', content: assistantContent, practiceLines }];
      });
    };

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          playerStats,
          username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment.');
        } else if (response.status === 402) {
          toast.error('AI credits exhausted.');
        } else {
          toast.error(errorData.error || 'Failed to get response');
        }
        setIsLoading(false);
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch { /* ignore */ }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to connect to coach');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/30">
        <div className="rounded-lg bg-accent/20 p-2">
          <GraduationCap className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">AI Chess Coach</h3>
          <p className="text-xs text-muted-foreground">Ask questions about your games</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Sparkles className="h-10 w-10 text-accent mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                Hi! I'm your personal chess coach. Ask me anything about your games!
              </p>
            </div>
            <div className="grid gap-2">
              {SUGGESTED_QUESTIONS.map((question, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => sendMessage(question)}
                  disabled={isLoading}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="rounded-full bg-accent/20 p-2 h-8 w-8 flex items-center justify-center shrink-0">
                      <GraduationCap className="h-4 w-4 text-accent" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-lg px-4 py-3 max-w-[80%]',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Practice Line Buttons */}
                    {message.role === 'assistant' && message.practiceLines && message.practiceLines.length > 0 && onPracticeLineSelected && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Practice these lines:</p>
                        <div className="flex flex-wrap gap-2">
                          {message.practiceLines.map((line, lineIndex) => (
                            <Button
                              key={lineIndex}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 bg-background/50 hover:bg-primary/10"
                              onClick={() => onPracticeLineSelected(
                                { ...line, recommended: false, startingFen: line.startingFen },
                                line.playAs || 'white'
                              )}
                            >
                              <Play className="h-3 w-3" />
                              {line.name.length > 20 ? line.name.slice(0, 20) + '...' : line.name}
                              {line.playAs && (
                                <span className="ml-1 text-muted-foreground">
                                  ({line.playAs === 'white' ? '♔' : '♚'})
                                </span>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="rounded-full bg-primary/20 p-2 h-8 w-8 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="rounded-full bg-accent/20 p-2 h-8 w-8 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-accent animate-spin" />
                  </div>
                  <div className="bg-secondary rounded-lg px-4 py-3">
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-secondary/30">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach..."
            className="flex-1 bg-background border-border"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
