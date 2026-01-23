import { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, AlertCircle, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  onChatNavigate?: () => void;
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
  const [insight, setInsight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasGeneratedRef = useRef(false);
  const lastChartTypeRef = useRef(chartType);

  const generateInsights = async () => {
    if (openingStats.length === 0) {
      setError('No opening data available to analyze');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInsight('');

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
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
          setError('Rate limit exceeded. Please try again later.');
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
              setInsight(fullText);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      hasGeneratedRef.current = true;
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError('Failed to generate insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate on mount and when chart type changes
  useEffect(() => {
    if (openingStats.length > 0 && totalGames > 0) {
      // Reset and regenerate if chart type changed
      if (lastChartTypeRef.current !== chartType) {
        hasGeneratedRef.current = false;
        lastChartTypeRef.current = chartType;
        setInsight('');
        setError(null);
        setIsExpanded(false);
      }
      
      if (!hasGeneratedRef.current && !isLoading) {
        generateInsights();
      }
    }
  }, [chartType, openingStats.length, totalGames]);

  // Get preview text (first ~100 characters)
  const previewText = insight.length > 120 
    ? insight.slice(0, 120).trim() + '...' 
    : insight;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-base">{error}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateInsights}
          className="mt-2"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-base font-medium text-foreground">AI Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            {onChatNavigate && insight && !isLoading && (
              <Button
                variant="outline"
                size="sm"
                onClick={onChatNavigate}
                className="h-8 px-3 gap-1"
              >
                <MessageCircle className="h-3 w-3" />
                Discuss
              </Button>
            )}
            {insight && !isLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={generateInsights}
                className="h-8 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-base">Analyzing your data...</span>
          </div>
        ) : (
          <>
            {/* Preview (collapsed state) */}
            {!isExpanded && insight && (
              <div className="text-base text-foreground/90 leading-relaxed">
                {previewText}
              </div>
            )}

            {/* Full content (expanded state) */}
            <CollapsibleContent>
              <div className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {insight}
              </div>
            </CollapsibleContent>

            {/* More/Less button */}
            {insight && insight.length > 120 && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 px-3 gap-1 text-primary hover:text-primary"
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
              </CollapsibleTrigger>
            )}
          </>
        )}
      </Collapsible>
    </div>
  );
};
