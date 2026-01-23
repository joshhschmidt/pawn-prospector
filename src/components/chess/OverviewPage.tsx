import { Game, FilterState, OpeningBucket, OPENING_LABELS } from '@/types/chess';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { KPIGrid, KPICard } from './KPICard';
import { OpeningChart } from './OpeningChart';
import { TopInsights } from './TopInsights';
import { Trophy, Target, Clock, Shield, Crown, Percent } from 'lucide-react';

interface OverviewPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onNavigate?: (view: string) => void;
}

export const OverviewPage = ({ games, filters, onFiltersChange, onNavigate }: OverviewPageProps) => {
  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  const openingStats = calculateOpeningStats(filteredGames);
  
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  // Calculate queen before castle percentage
  const gamesWithData = filteredGames.filter(g => g.queen_moves_first_10 !== null && g.castled_at_ply !== null);
  const queenBeforeCastle = gamesWithData.filter(g => 
    (g.queen_moves_first_10 || 0) > 0 && (g.castled_at_ply || 999) > 10
  ).length;
  const queenBeforeCastlePercent = gamesWithData.length > 0 
    ? (queenBeforeCastle / gamesWithData.length) * 100 
    : 0;

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
          {/* Opening Frequency Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Opening Frequency</h3>
            <div className="h-[280px]">
              <OpeningChart data={openingStats.slice(0, 8)} type="frequency" />
            </div>
          </div>
        </div>

        {/* Insights Panel - 1 column */}
        <div className="space-y-6">
          <TopInsights 
            stats={stats} 
            openingStats={openingStats}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </PageContainer>
  );
};
