import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Trophy, Target, Clock, Shield, Crown, Percent } from 'lucide-react';
import { Game, FilterState, OpeningBucket, OPENING_LABELS } from '@/types/chess';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/layout/SectionCard';
import { StickyFilterBar } from './StickyFilterBar';
import { KPIGrid, KPICard } from './KPICard';
import { OpeningChart } from './OpeningChart';
import { OpeningTable } from './OpeningTable';
import { TopInsights } from './TopInsights';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface OverviewPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onNavigate?: (view: string) => void;
}

export const OverviewPage = ({ games, filters, onFiltersChange, onNavigate }: OverviewPageProps) => {
  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  const openingStats = useMemo(() => calculateOpeningStats(filteredGames), [filteredGames]);
  
  const whiteGames = useMemo(() => filterGames(games, { ...filters, color: 'white' }), [games, filters]);
  const blackGames = useMemo(() => filterGames(games, { ...filters, color: 'black' }), [games, filters]);
  
  const whiteOpeningStats = useMemo(() => calculateOpeningStats(whiteGames), [whiteGames]);
  const blackOpeningStats = useMemo(() => calculateOpeningStats(blackGames), [blackGames]);
  
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  const [showTable, setShowTable] = useState(false);

  // Calculate queen before castle percentage
  const gamesWithData = filteredGames.filter(g => g.queen_moves_first_10 !== null && g.castled_at_ply !== null);
  const queenBeforeCastle = gamesWithData.filter(g => 
    (g.queen_moves_first_10 || 0) > 0 && (g.castled_at_ply || 999) > 10
  ).length;
  const queenBeforeCastlePercent = gamesWithData.length > 0 
    ? (queenBeforeCastle / gamesWithData.length) * 100 
    : 0;

  // Opening insights
  const insights = useMemo(() => {
    const minGames = 3;
    const mostPlayed = [...openingStats].sort((a, b) => b.games - a.games).slice(0, 3);
    const candidates = openingStats.filter((o) => o.games >= minGames);
    const best = [...candidates].sort((a, b) => b.scorePercent - a.scorePercent).slice(0, 3);
    const worst = [...candidates].sort((a, b) => a.scorePercent - b.scorePercent).slice(0, 3);
    return { mostPlayed, best, worst, minGames };
  }, [openingStats]);

  return (
    <PageContainer>
      <PageHeader 
        title="Overview"
        subtitle="Your chess performance at a glance"
      />

      <StickyFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableOpenings={availableOpenings}
        totalGames={games.length}
        filteredCount={filteredGames.length}
      />

      {/* KPI Row */}
      <KPIGrid>
        <KPICard
          title="Games Analyzed"
          value={stats.totalGames}
          icon={<Target className="h-5 w-5" />}
        />
        <KPICard
          title="Score %"
          value={`${stats.scorePercent.toFixed(1)}%`}
          variant={stats.scorePercent >= 50 ? 'success' : stats.scorePercent >= 40 ? 'warning' : 'danger'}
          icon={<Percent className="h-5 w-5" />}
        />
        <KPICard
          title="Wins"
          value={stats.wins}
          subtitle={`${stats.draws} draws, ${stats.losses} losses`}
          variant="success"
          icon={<Trophy className="h-5 w-5" />}
        />
        <KPICard
          title="Avg Game Length"
          value={`${stats.avgGameLength} moves`}
          icon={<Clock className="h-5 w-5" />}
        />
        <KPICard
          title="Queen Before Castle"
          value={`${queenBeforeCastlePercent.toFixed(0)}%`}
          variant={queenBeforeCastlePercent > 30 ? 'warning' : 'default'}
          icon={<Crown className="h-5 w-5" />}
        />
        <KPICard
          title="Avg Castle Move"
          value={stats.avgCastlingPly > 0 ? `Move ${Math.round(stats.avgCastlingPly / 2)}` : 'N/A'}
          variant={stats.avgCastlingPly <= 12 ? 'success' : stats.avgCastlingPly <= 16 ? 'warning' : 'danger'}
          icon={<Shield className="h-5 w-5" />}
        />
      </KPIGrid>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Charts - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Opening Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Opening Frequency" description="Your most played openings">
              <div className="h-[280px]">
                <OpeningChart data={openingStats.slice(0, 8)} type="frequency" />
              </div>
            </SectionCard>

            <SectionCard title="Opening Success Rate" description="Score % by opening">
              <div className="h-[280px]">
                <OpeningChart data={openingStats.slice(0, 8)} type="performance" />
              </div>
            </SectionCard>
          </div>
          
          {/* Performance by Color */}
          <SectionCard title="Performance by Color" description="Which openings work best for you as White vs Black">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">AS WHITE</h4>
                <div className="h-[220px]">
                  <OpeningChart data={whiteOpeningStats.slice(0, 6)} type="performance" />
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">AS BLACK</h4>
                <div className="h-[220px]">
                  <OpeningChart data={blackOpeningStats.slice(0, 6)} type="performance" />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* All Openings Table */}
          <Collapsible open={showTable} onOpenChange={setShowTable}>
            <SectionCard
              title="All Openings"
              description="Full breakdown of your opening buckets"
              actions={
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {showTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showTable ? 'Hide' : 'Show'} table
                  </Button>
                </CollapsibleTrigger>
              }
            >
              <CollapsibleContent className="pt-2">
                <OpeningTable data={openingStats} />
              </CollapsibleContent>

              {!showTable && (
                <p className="text-sm text-muted-foreground">
                  Tip: keep this collapsed most of the time—use it when you want to drill into a specific opening bucket.
                </p>
              )}
            </SectionCard>
          </Collapsible>
        </div>

        {/* Insights Panel - 1 column */}
        <div className="space-y-6">
          <TopInsights 
            stats={stats} 
            openingStats={openingStats}
            onNavigate={onNavigate}
          />

          {/* Opening Insights */}
          <SectionCard
            title="Opening Focus"
            description="Quick takeaways from your games"
            actions={<Sparkles className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">MOST PLAYED</h4>
                <ul className="mt-2 space-y-1">
                  {insights.mostPlayed.map((o) => (
                    <li key={o.bucket} className="text-sm text-foreground flex items-center justify-between gap-3">
                      <span className="truncate">{OPENING_LABELS[o.bucket]}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{o.games}g</span>
                    </li>
                  ))}
                  {insights.mostPlayed.length === 0 && (
                    <li className="text-sm text-muted-foreground">No games in the current filter.</li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">
                  BEST SCORING (min {insights.minGames} games)
                </h4>
                <ul className="mt-2 space-y-1">
                  {insights.best.map((o) => (
                    <li key={o.bucket} className="text-sm text-foreground flex items-center justify-between gap-3">
                      <span className="truncate">{OPENING_LABELS[o.bucket]}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{o.scorePercent.toFixed(0)}%</span>
                    </li>
                  ))}
                  {insights.best.length === 0 && (
                    <li className="text-sm text-muted-foreground">Play a few more games to surface trends.</li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">
                  NEEDS WORK (min {insights.minGames} games)
                </h4>
                <ul className="mt-2 space-y-1">
                  {insights.worst.map((o) => (
                    <li key={o.bucket} className="text-sm text-foreground flex items-center justify-between gap-3">
                      <span className="truncate">{OPENING_LABELS[o.bucket]}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{o.scorePercent.toFixed(0)}%</span>
                    </li>
                  ))}
                  {insights.worst.length === 0 && (
                    <li className="text-sm text-muted-foreground">Nothing stands out as weak yet.</li>
                  )}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm text-foreground">
                  Pick <span className="font-semibold">one White</span> and{' '}
                  <span className="font-semibold">one Black</span> opening to repeat for your next 20 games. Consistency
                  makes patterns obvious.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
};
