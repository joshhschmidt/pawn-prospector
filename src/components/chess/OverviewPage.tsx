import { useMemo } from 'react';
import { Trophy, Target, Clock, Shield, Crown, Percent } from 'lucide-react';
import { Game, FilterState, OpeningBucket } from '@/types/chess';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/layout/SectionCard';
import { StickyFilterBar } from './StickyFilterBar';
import { KPIGrid, KPICard } from './KPICard';
import { OpeningChart } from './OpeningChart';
import { OpeningTable } from './OpeningTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OverviewPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const OverviewPage = ({ games, filters, onFiltersChange }: OverviewPageProps) => {
  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  const openingStats = useMemo(() => calculateOpeningStats(filteredGames), [filteredGames]);
  
  const whiteGames = useMemo(() => filterGames(games, { ...filters, color: 'white' }), [games, filters]);
  const blackGames = useMemo(() => filterGames(games, { ...filters, color: 'black' }), [games, filters]);
  
  const whiteOpeningStats = useMemo(() => calculateOpeningStats(whiteGames), [whiteGames]);
  const blackOpeningStats = useMemo(() => calculateOpeningStats(blackGames), [blackGames]);
  
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

      {/* Tabbed Charts Section */}
      <div className="mt-6">
        <Tabs defaultValue="frequency" className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-4">
            <TabsTrigger value="frequency">Frequency</TabsTrigger>
            <TabsTrigger value="success">Success Rate</TabsTrigger>
            <TabsTrigger value="color">By Color</TabsTrigger>
            <TabsTrigger value="table">All Openings</TabsTrigger>
          </TabsList>

          <TabsContent value="frequency" className="mt-0">
            <SectionCard title="Opening Frequency" description="Your most played openings">
              <div className="h-[400px]">
                <OpeningChart data={openingStats.slice(0, 10)} type="frequency" />
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="success" className="mt-0">
            <SectionCard title="Opening Success Rate" description="Score % by opening">
              <div className="h-[400px]">
                <OpeningChart data={openingStats.slice(0, 10)} type="performance" />
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="color" className="mt-0">
            <SectionCard title="Performance by Color" description="Which openings work best for you as White vs Black">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">AS WHITE</h4>
                  <div className="h-[320px]">
                    <OpeningChart data={whiteOpeningStats.slice(0, 6)} type="performance" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">AS BLACK</h4>
                  <div className="h-[320px]">
                    <OpeningChart data={blackOpeningStats.slice(0, 6)} type="performance" />
                  </div>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="table" className="mt-0">
            <SectionCard title="All Openings" description="Full breakdown of your opening buckets">
              <OpeningTable data={openingStats} />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
};
