import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, RefreshCw, AlertCircle, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OpeningData {
  bucket: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  scorePercent: number;
}

interface ChartInsightsProps {
  chartType: 'frequency' | 'success' | 'color';
  openingStats: OpeningData[];
  whiteStats?: OpeningData[];
  blackStats?: OpeningData[];
  totalGames: number;
  onChatNavigate?: (context: string) => void;
}

const OPENING_LABELS: Record<string, string> = {
  italian_game: "Italian Game",
  ruy_lopez: "Ruy Lopez",
  scotch_game: "Scotch Game",
  kings_gambit: "King's Gambit",
  vienna_game: "Vienna Game",
  london_system: "London System",
  queens_gambit: "Queen's Gambit",
  sicilian_najdorf: "Sicilian Najdorf",
  sicilian_dragon: "Sicilian Dragon",
  french_defense: "French Defense",
  caro_kann: "Caro-Kann",
  kings_indian: "King's Indian",
};

export const ChartInsights = ({ 
  chartType, 
  openingStats, 
  whiteStats, 
  blackStats, 
  totalGames,
  onChatNavigate
}: ChartInsightsProps) => {
  const [briefInsight, setBriefInsight] = useState('');
  const [fullInsight, setFullInsight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const hasGeneratedBriefRef = useRef(false);
  const hasGeneratedFullRef = useRef(false);
  const lastChartTypeRef = useRef(chartType);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const generateInsights = async (detail: 'brief' | 'full') => {
    if (openingStats.length === 0) {
      setError('No opening data available to analyze');
      return;
    }

    if (detail === 'brief') {
      setIsLoading(true);
      setBriefInsight('');
    } else {
      setIsLoadingFull(true);
      setFullInsight('');
    }
    setError(null);

    try {
      const statsWithLabels = openingStats.map(o => ({
        ...o,
        label: OPENING_LABELS[o.bucket] || o.bucket.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }));

      const whiteWithLabels = whiteStats?.map(o => ({
        ...o,
        label: OPENING_LABELS[o.bucket] || o.bucket.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }));

      const blackWithLabels = blackStats?.map(o => ({
        ...o,
        label: OPENING_LABELS[o.bucket] || o.bucket.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chart-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            chartType,
            openingStats: statsWithLabels,
            whiteStats: whiteWithLabels,
            blackStats: blackWithLabels,
            totalGames,
            detail,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = 10; // Wait 10 seconds before retry
          setRetryCountdown(retryAfter);
          setError(`Rate limited. Auto-retrying in ${retryAfter}s...`);
          
          // Start countdown
          const countdownInterval = setInterval(() => {
            setRetryCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                return 0;
              }
              setError(`Rate limited. Auto-retrying in ${prev - 1}s...`);
              return prev - 1;
            });
          }, 1000);
          
          // Auto-retry after delay
          retryTimerRef.current = setTimeout(() => {
            clearInterval(countdownInterval);
            setError(null);
            setRetryCountdown(0);
            generateInsights(detail);
          }, retryAfter * 1000);
          
          return;
        }
        if (response.status === 402) {
          toast.error('AI credits exhausted. Please add credits to continue.');
          setError('AI credits exhausted.');
          return;
        }
        throw new Error('Failed to generate insights');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              if (detail === 'brief') {
                setBriefInsight(fullText);
              } else {
                setFullInsight(fullText);
              }
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (detail === 'brief') {
        hasGeneratedBriefRef.current = true;
      } else {
        hasGeneratedFullRef.current = true;
      }
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError('Failed to generate insights. Please try again.');
    } finally {
      if (detail === 'brief') {
        setIsLoading(false);
      } else {
        setIsLoadingFull(false);
      }
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Auto-generate brief overview on mount and when chart type changes (debounced)
  useEffect(() => {
    if (openingStats.length > 0 && totalGames > 0) {
      // Reset if chart type changed
      if (lastChartTypeRef.current !== chartType) {
        hasGeneratedBriefRef.current = false;
        hasGeneratedFullRef.current = false;
        lastChartTypeRef.current = chartType;
        setBriefInsight('');
        setFullInsight('');
        setError(null);
        setIsExpanded(false);
        setRetryCountdown(0);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      }
      
      if (!hasGeneratedBriefRef.current && !isLoading) {
        // Debounce to prevent rapid API calls when switching tabs quickly
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          generateInsights('brief');
        }, 500);
      }
    }
  }, [chartType, openingStats.length, totalGames]);

  // Generate full analysis when expanded
  const handleExpand = () => {
    if (!isExpanded && !hasGeneratedFullRef.current && !isLoadingFull) {
      generateInsights('full');
    }
    setIsExpanded(!isExpanded);
  };

  if (error && retryCountdown === 0) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-base">{error}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateInsights('brief')}
          className="mt-2"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (retryCountdown > 0) {
    return (
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 mb-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-base">Rate limited. Auto-retrying in {retryCountdown}s...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-base font-medium text-foreground">AI Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          {onChatNavigate && briefInsight && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const chartLabel = chartType === 'frequency' ? 'opening frequency' : chartType === 'success' ? 'win rate by opening' : 'color performance';
                const context = `I want to discuss my ${chartLabel} analysis. Here's what the AI found: ${briefInsight}`;
                onChatNavigate(context);
              }}
              className="h-8 px-3 gap-1"
            >
              <MessageCircle className="h-3 w-3" />
              Discuss
            </Button>
          )}
          {briefInsight && !isLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                hasGeneratedBriefRef.current = false;
                hasGeneratedFullRef.current = false;
                setFullInsight('');
                generateInsights('brief');
              }}
              className="h-8 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Brief overview */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-base">Analyzing your data...</span>
        </div>
      ) : (
        <div className="text-base text-foreground/90 leading-relaxed">
          {briefInsight}
        </div>
      )}

      {/* Expanded full analysis */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-primary/20">
          {isLoadingFull ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-base">Generating detailed analysis...</span>
            </div>
          ) : (
            <div className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {fullInsight}
            </div>
          )}
        </div>
      )}

      {/* More/Less button */}
      {briefInsight && !isLoading && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExpand}
          className="mt-3 h-8 px-3 gap-1 text-primary hover:text-primary"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              More
            </>
          )}
        </Button>
      )}
    </div>
  );
};
