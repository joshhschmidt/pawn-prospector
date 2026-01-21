import { AnalysisStats, OpeningStats, OPENING_LABELS } from '@/types/chess';
import { ArrowRight, TrendingUp, TrendingDown, Target, Zap, BookOpen, Shield } from 'lucide-react';

interface TopInsightsProps {
  stats: AnalysisStats;
  openingStats: OpeningStats[];
  onNavigate?: (view: string) => void;
}

interface Insight {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  linkTo?: string;
}

export const TopInsights = ({ stats, openingStats, onNavigate }: TopInsightsProps) => {
  const insights: Insight[] = [];

  // Win rate insight
  if (stats.scorePercent >= 55) {
    insights.push({
      icon: <TrendingUp className="h-4 w-4" />,
      title: 'Strong Win Rate',
      description: `You're winning ${stats.scorePercent.toFixed(0)}% of your games. Keep it up!`,
      type: 'positive',
    });
  } else if (stats.scorePercent < 45) {
    insights.push({
      icon: <TrendingDown className="h-4 w-4" />,
      title: 'Win Rate Needs Work',
      description: `Your ${stats.scorePercent.toFixed(0)}% win rate has room for improvement.`,
      type: 'negative',
      linkTo: 'training',
    });
  }

  // Castling insight
  if (stats.avgCastlingPly > 14) {
    insights.push({
      icon: <Shield className="h-4 w-4" />,
      title: 'Late Castling',
      description: `You castle on move ${Math.round(stats.avgCastlingPly / 2)} on average. Try castling by move 8.`,
      type: 'negative',
      linkTo: 'habits',
    });
  } else if (stats.avgCastlingPly > 0 && stats.avgCastlingPly <= 10) {
    insights.push({
      icon: <Shield className="h-4 w-4" />,
      title: 'Early Castling',
      description: `Great king safety! You castle by move ${Math.round(stats.avgCastlingPly / 2)}.`,
      type: 'positive',
    });
  }

  // Quick losses insight
  if (stats.quickLosses > 5) {
    insights.push({
      icon: <Zap className="h-4 w-4" />,
      title: 'Quick Losses',
      description: `${stats.quickLosses} games lost in under 15 moves. Check opening tactics.`,
      type: 'negative',
      linkTo: 'tactics',
    });
  }

  // Queen moves insight
  if (stats.avgQueenMovesFirst10 >= 2) {
    insights.push({
      icon: <Target className="h-4 w-4" />,
      title: 'Early Queen Moves',
      description: `You move your queen ${stats.avgQueenMovesFirst10.toFixed(1)}x in the first 10 moves.`,
      type: 'negative',
      linkTo: 'habits',
    });
  }

  // Best opening insight
  const bestOpening = openingStats.find(o => o.scorePercent >= 55 && o.games >= 3);
  if (bestOpening) {
    insights.push({
      icon: <BookOpen className="h-4 w-4" />,
      title: `Strong in ${OPENING_LABELS[bestOpening.bucket]}`,
      description: `${bestOpening.scorePercent.toFixed(0)}% win rate in ${bestOpening.games} games.`,
      type: 'positive',
      linkTo: 'openings',
    });
  }

  // Weakest opening insight
  const worstOpening = openingStats.find(o => o.scorePercent < 40 && o.games >= 3);
  if (worstOpening) {
    insights.push({
      icon: <BookOpen className="h-4 w-4" />,
      title: `Struggling in ${OPENING_LABELS[worstOpening.bucket]}`,
      description: `Only ${worstOpening.scorePercent.toFixed(0)}% win rate. Consider studying this.`,
      type: 'negative',
      linkTo: 'openings',
    });
  }

  const displayInsights = insights.slice(0, 5);

  const typeStyles = {
    positive: 'border-chess-win/20 bg-chess-win/5',
    negative: 'border-warning/20 bg-warning/5',
    neutral: 'border-border bg-card',
  };

  const iconStyles = {
    positive: 'text-chess-win',
    negative: 'text-warning',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Top Insights</h3>
      
      {displayInsights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Play more games to see insights.</p>
      ) : (
        <div className="space-y-3">
          {displayInsights.map((insight, index) => (
            <button
              key={index}
              onClick={() => insight.linkTo && onNavigate?.(insight.linkTo)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${typeStyles[insight.type]} ${
                insight.linkTo ? 'hover:bg-accent/10 cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={iconStyles[insight.type]}>
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                </div>
                {insight.linkTo && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
