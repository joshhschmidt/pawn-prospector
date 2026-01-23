import { useMemo, useState } from 'react';
import { Trophy, Target, XCircle, Minus } from 'lucide-react';
import { Game, FilterState, OpeningBucket } from '@/types/chess';
import { filterGames, calculateStats, calculateOpeningStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/layout/SectionCard';
import { StickyFilterBar } from './StickyFilterBar';
import { KPIGrid, KPICard } from './KPICard';
import { OpeningChart } from './OpeningChart';
import { OpeningTable } from './OpeningTable';
import { ChartInsights } from './ChartInsights';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OverviewPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onNavigate?: (view: string, context?: string) => void;
}

type ColorFilter = 'all' | 'white' | 'black';

export const OverviewPage = ({ games, filters, onFiltersChange, onNavigate }: OverviewPageProps) => {
  const [frequencyColor, setFrequencyColor] = useState<ColorFilter>('white');
  const [successColor, setSuccessColor] = useState<ColorFilter>('white');
  const [tableColor, setTableColor] = useState<ColorFilter>('white');

  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  const openingStats = useMemo(() => calculateOpeningStats(filteredGames), [filteredGames]);
  
  const whiteGames = useMemo(() => filterGames(games, { ...filters, color: 'white' }), [games, filters]);
  const blackGames = useMemo(() => filterGames(games, { ...filters, color: 'black' }), [games, filters]);
  
  const whiteOpeningStats = useMemo(() => calculateOpeningStats(whiteGames), [whiteGames]);
  const blackOpeningStats = useMemo(() => calculateOpeningStats(blackGames), [blackGames]);
  
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];


  // Helper to get stats based on color filter
  const getStatsForColor = (color: ColorFilter) => {
    switch (color) {
      case 'white': return whiteOpeningStats;
      case 'black': return blackOpeningStats;
      default: return openingStats;
    }
  };

  const ColorSubTabs = ({ 
    value, 
    onChange 
  }: { 
    value: ColorFilter; 
    onChange: (v: ColorFilter) => void;
  }) => (
    <div className="grid grid-cols-2 gap-1 mb-4">
      <button
        onClick={() => onChange('white')}
        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          value === 'white' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        As White
      </button>
      <button
        onClick={() => onChange('black')}
        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          value === 'black' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        As Black
      </button>
    </div>
  );

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
          title="Wins"
          value={stats.wins}
          variant="success"
          icon={<Trophy className="h-5 w-5" />}
        />
        <KPICard
          title="Losses"
          value={stats.losses}
          variant="danger"
          icon={<XCircle className="h-5 w-5" />}
        />
        <KPICard
          title="Draws"
          value={stats.draws}
          icon={<Minus className="h-5 w-5" />}
        />
      </KPIGrid>

      {/* Tabbed Charts Section */}
      <div className="mt-6">
        <Tabs defaultValue="frequency" className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-3">
            <TabsTrigger value="frequency">Frequency</TabsTrigger>
            <TabsTrigger value="winrate">Win Rate</TabsTrigger>
            <TabsTrigger value="table">All Openings</TabsTrigger>
          </TabsList>

          <TabsContent value="frequency" className="mt-0">
            <SectionCard title="Opening Frequency" description="Your most played openings">
              <ColorSubTabs value={frequencyColor} onChange={setFrequencyColor} />
              <ChartInsights
                chartType="frequency"
                openingStats={getStatsForColor(frequencyColor)}
                totalGames={stats.totalGames}
                onChatNavigate={(context) => onNavigate?.('coaching', context)}
              />
              <div className="h-[400px]">
                <OpeningChart data={getStatsForColor(frequencyColor).slice(0, 10)} type="frequency" />
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="winrate" className="mt-0">
            <SectionCard title="Opening Win Rate" description="Win % by opening (excluding draws)">
              <ColorSubTabs value={successColor} onChange={setSuccessColor} />
              <ChartInsights
                chartType="success"
                openingStats={getStatsForColor(successColor)}
                totalGames={stats.totalGames}
                onChatNavigate={(context) => onNavigate?.('coaching', context)}
              />
              <div className="h-[400px]">
                <OpeningChart data={getStatsForColor(successColor).slice(0, 10)} type="performance" />
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="table" className="mt-0">
            <SectionCard title="All Openings" description="Full breakdown of your opening buckets">
              <ColorSubTabs value={tableColor} onChange={setTableColor} />
              <OpeningTable data={getStatsForColor(tableColor)} />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
};
