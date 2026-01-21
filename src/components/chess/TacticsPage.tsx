import { Game, FilterState, OpeningBucket } from '@/types/chess';
import { filterGames, calculateStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { KPIGrid, KPICard } from './KPICard';
import { Flag, Zap, AlertTriangle, Target, Swords } from 'lucide-react';

interface TacticsPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const TacticsPage = ({ games, filters, onFiltersChange }: TacticsPageProps) => {
  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  const tactics = [
    {
      name: 'Quick Losses',
      description: 'Games lost in under 15 moves, often due to tactical blunders',
      count: stats.quickLosses,
      severity: stats.quickLosses > 5 ? 'danger' : stats.quickLosses > 2 ? 'warning' : 'success',
      advice: stats.quickLosses > 5 
        ? 'Slow down! Check for basic tactics before each move.' 
        : 'Good job avoiding quick defeats.',
    },
    {
      name: 'Quick Wins',
      description: 'Games won in under 15 moves by capitalizing on opponent mistakes',
      count: stats.quickWins,
      severity: 'success' as const,
      advice: 'You\'re good at punishing early blunders.',
    },
    {
      name: 'Nc7 Fork Pattern',
      description: 'Games where you fell for the Nc7 knight fork on king and rook',
      count: stats.nc7ForkGames,
      severity: stats.nc7ForkGames > 3 ? 'danger' : stats.nc7ForkGames > 1 ? 'warning' : 'success',
      advice: stats.nc7ForkGames > 2 
        ? 'Watch out for knight forks! Especially in Sicilian positions.' 
        : 'Good awareness of knight fork patterns.',
    },
    {
      name: 'Early Checks Received',
      description: 'Total checks received in the first 15 moves across all games',
      count: stats.earlyChecksReceived,
      severity: stats.earlyChecksReceived > stats.totalGames * 0.5 ? 'warning' : 'success',
      advice: stats.earlyChecksReceived > stats.totalGames 
        ? 'You\'re getting checked early often. Prioritize king safety.' 
        : 'Good king safety in the opening.',
    },
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Tactics Flags"
        subtitle="Identify tactical patterns and blunders in your games"
      />

      <StickyFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableOpenings={availableOpenings}
        totalGames={games.length}
        filteredCount={filteredGames.length}
      />

      {/* Summary KPIs */}
      <KPIGrid>
        <KPICard
          title="Quick Losses"
          value={stats.quickLosses}
          subtitle="Under 15 moves"
          variant={stats.quickLosses > 5 ? 'danger' : 'default'}
          icon={<Zap className="h-5 w-5" />}
        />
        <KPICard
          title="Quick Wins"
          value={stats.quickWins}
          subtitle="Under 15 moves"
          variant="success"
          icon={<Target className="h-5 w-5" />}
        />
        <KPICard
          title="Nc7 Forks"
          value={stats.nc7ForkGames}
          variant={stats.nc7ForkGames > 3 ? 'danger' : 'default'}
          icon={<Swords className="h-5 w-5" />}
        />
      </KPIGrid>

      {/* Tactical Flags Grid */}
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        {tactics.map((tactic, index) => {
          const severityColors = {
            success: 'border-chess-win/30 bg-chess-win/5',
            warning: 'border-warning/30 bg-warning/5',
            danger: 'border-chess-loss/30 bg-chess-loss/5',
          };
          
          const iconColors = {
            success: 'text-chess-win',
            warning: 'text-warning',
            danger: 'text-chess-loss',
          };

          return (
            <div 
              key={index}
              className={`rounded-xl border p-5 ${severityColors[tactic.severity]}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Flag className={`h-5 w-5 ${iconColors[tactic.severity]}`} />
                  <div>
                    <h3 className="font-semibold text-foreground">{tactic.name}</h3>
                    <p className="text-xs text-muted-foreground">{tactic.description}</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{tactic.count}</span>
              </div>
              
              <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-background/50 border border-border">
                <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{tactic.advice}</p>
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};
