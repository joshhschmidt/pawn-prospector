import { Game, FilterState, OpeningBucket } from '@/types/chess';
import { filterGames, calculateStats } from '@/lib/analysis';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { StickyFilterBar } from './StickyFilterBar';
import { KPIGrid, KPICard } from './KPICard';
import { Shield, Crown, Repeat, Zap, Clock, AlertTriangle } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface HabitsPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

interface HabitSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const HabitsPage = ({ games, filters, onFiltersChange }: HabitsPageProps) => {
  const [openSections, setOpenSections] = useState<string[]>(['castling']);
  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  
  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  // Calculate detailed habit metrics
  const gamesWithCastling = filteredGames.filter(g => g.castled_at_ply !== null);
  const earlycastlers = gamesWithCastling.filter(g => (g.castled_at_ply || 0) <= 10).length;
  const lateCastlers = gamesWithCastling.filter(g => (g.castled_at_ply || 0) > 16).length;
  const neverCastled = filteredGames.length - gamesWithCastling.length;

  const gamesWithQueen = filteredGames.filter(g => g.queen_moves_first_10 !== null);
  const noQueenMoves = gamesWithQueen.filter(g => (g.queen_moves_first_10 || 0) === 0).length;
  const manyQueenMoves = gamesWithQueen.filter(g => (g.queen_moves_first_10 || 0) >= 3).length;

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const habits: HabitSection[] = [
    {
      id: 'castling',
      title: 'Castling Habits',
      description: 'When and how often you castle',
      icon: <Shield className="h-5 w-5" />,
      content: (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Early (≤move 5)</p>
            <p className="text-2xl font-bold text-chess-win">{earlycastlers}</p>
            <p className="text-xs text-muted-foreground">
              {gamesWithCastling.length > 0 
                ? `${((earlycastlers / gamesWithCastling.length) * 100).toFixed(0)}%` 
                : '0%'}
            </p>
          </div>
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Late (move 9+)</p>
            <p className="text-2xl font-bold text-warning">{lateCastlers}</p>
            <p className="text-xs text-muted-foreground">
              {gamesWithCastling.length > 0 
                ? `${((lateCastlers / gamesWithCastling.length) * 100).toFixed(0)}%` 
                : '0%'}
            </p>
          </div>
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Never Castled</p>
            <p className="text-2xl font-bold text-chess-loss">{neverCastled}</p>
            <p className="text-xs text-muted-foreground">
              {filteredGames.length > 0 
                ? `${((neverCastled / filteredGames.length) * 100).toFixed(0)}%` 
                : '0%'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'queen',
      title: 'Queen Development',
      description: 'How you use your queen in the opening',
      icon: <Crown className="h-5 w-5" />,
      content: (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">No Early Queen</p>
            <p className="text-2xl font-bold text-chess-win">{noQueenMoves}</p>
            <p className="text-xs text-muted-foreground">Good discipline</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Queen Moves (10)</p>
            <p className="text-2xl font-bold text-foreground">{stats.avgQueenMovesFirst10.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">First 10 moves</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">3+ Queen Moves</p>
            <p className="text-2xl font-bold text-chess-loss">{manyQueenMoves}</p>
            <p className="text-xs text-muted-foreground">Too aggressive</p>
          </div>
        </div>
      ),
    },
    {
      id: 'tempo',
      title: 'Tempo Management',
      description: 'Efficiency in the opening phase',
      icon: <Clock className="h-5 w-5" />,
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Queen Tempo Loss</p>
            <p className="text-2xl font-bold text-warning">{stats.queenTempoLossGames}</p>
            <p className="text-xs text-muted-foreground">Moving queen multiple times early</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Game Length</p>
            <p className="text-2xl font-bold text-foreground">{stats.avgGameLength}</p>
            <p className="text-xs text-muted-foreground">moves per game</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Habits"
        subtitle="Analyze your playing patterns and tendencies"
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
          title="Avg Castling Move"
          value={stats.avgCastlingPly > 0 ? `Move ${Math.round(stats.avgCastlingPly / 2)}` : 'N/A'}
          variant={stats.avgCastlingPly <= 12 ? 'success' : stats.avgCastlingPly <= 16 ? 'warning' : 'danger'}
          icon={<Shield className="h-5 w-5" />}
        />
        <KPICard
          title="Avg Queen Moves"
          value={stats.avgQueenMovesFirst10.toFixed(1)}
          subtitle="In first 10 moves"
          variant={stats.avgQueenMovesFirst10 < 1.5 ? 'success' : stats.avgQueenMovesFirst10 < 2.5 ? 'warning' : 'danger'}
          icon={<Crown className="h-5 w-5" />}
        />
        <KPICard
          title="Tempo Loss Games"
          value={stats.queenTempoLossGames}
          variant={stats.queenTempoLossGames > stats.totalGames * 0.2 ? 'danger' : 'default'}
          icon={<Repeat className="h-5 w-5" />}
        />
      </KPIGrid>

      {/* Collapsible Habit Sections */}
      <div className="space-y-4 mt-6">
        {habits.map((habit) => (
          <Collapsible
            key={habit.id}
            open={openSections.includes(habit.id)}
            onOpenChange={() => toggleSection(habit.id)}
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <CollapsibleTrigger className="w-full p-5 flex items-center justify-between hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-primary">{habit.icon}</div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">{habit.title}</h3>
                    <p className="text-xs text-muted-foreground">{habit.description}</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${
                  openSections.includes(habit.id) ? 'rotate-180' : ''
                }`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-5 pt-2 border-t border-border">
                  {habit.content}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    </PageContainer>
  );
};
