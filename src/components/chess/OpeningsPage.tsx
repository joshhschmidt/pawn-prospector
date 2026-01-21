import { Game, FilterState, OpeningBucket } from '@/types/chess';
import { filterGames, calculateOpeningStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { OpeningChart } from './OpeningChart';
import { OpeningTable } from './OpeningTable';

interface OpeningsPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const OpeningsPage = ({ games, filters, onFiltersChange }: OpeningsPageProps) => {
  const filteredGames = filterGames(games, filters);
  const openingStats = calculateOpeningStats(filteredGames);
  
  const whiteGames = filterGames(games, { ...filters, color: 'white' });
  const blackGames = filterGames(games, { ...filters, color: 'black' });
  const whiteOpeningStats = calculateOpeningStats(whiteGames);
  const blackOpeningStats = calculateOpeningStats(blackGames);
  
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  return (
    <PageContainer>
      <PageHeader 
        title="Openings"
        subtitle="Analyze your opening repertoire and performance"
      />

      <StickyFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableOpenings={availableOpenings}
        totalGames={games.length}
        filteredCount={filteredGames.length}
      />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Opening Frequency</h3>
          <div className="h-[300px]">
            <OpeningChart data={openingStats.slice(0, 10)} type="frequency" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Opening Success Rate</h3>
          <div className="h-[300px]">
            <OpeningChart data={openingStats.slice(0, 10)} type="performance" />
          </div>
        </div>
      </div>

      {/* By Color */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">As White</h3>
          <div className="h-[250px]">
            <OpeningChart data={whiteOpeningStats.slice(0, 6)} type="performance" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">As Black</h3>
          <div className="h-[250px]">
            <OpeningChart data={blackOpeningStats.slice(0, 6)} type="performance" />
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="mt-6">
        <OpeningTable data={openingStats} />
      </div>
    </PageContainer>
  );
};
