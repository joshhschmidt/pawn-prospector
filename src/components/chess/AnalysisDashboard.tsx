import { useState } from 'react';
import { Game, FilterState, OpeningBucket } from '@/types/chess';
import { filterGames, calculateStats, calculateOpeningStats, generateStrengths, generateWeaknesses, generateRecommendations, generateTrainingPlan, calculateScoreOverTime } from '@/lib/analysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from './StatCard';
import { OpeningChart } from './OpeningChart';
import { ScoreChart } from './ScoreChart';
import { ResultsPie } from './ResultsPie';
import { FilterBar } from './FilterBar';
import { CoachingCard } from './CoachingCard';
import { TrainingPlanCard } from './TrainingPlanCard';
import { OpeningTable } from './OpeningTable';
import { motion } from 'framer-motion';
import { Trophy, Target, TrendingUp, Clock, Zap, Shield, Crown, Swords } from 'lucide-react';

interface AnalysisDashboardProps {
  games: Game[];
  username: string;
}

export const AnalysisDashboard = ({ games, username }: AnalysisDashboardProps) => {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: null, end: null },
    timeControl: 'all',
    color: 'all',
    openingBucket: 'all',
  });

  const filteredGames = filterGames(games, filters);
  const stats = calculateStats(filteredGames);
  const openingStats = calculateOpeningStats(filteredGames);
  const scoreOverTime = calculateScoreOverTime(filteredGames);
  
  const strengths = generateStrengths(stats, openingStats);
  const weaknesses = generateWeaknesses(stats, openingStats);
  const recommendations = generateRecommendations(stats, openingStats);
  const trainingPlan = generateTrainingPlan(openingStats);

  const whiteGames = filterGames(games, { ...filters, color: 'white' });
  const blackGames = filterGames(games, { ...filters, color: 'black' });
  const whiteStats = calculateStats(whiteGames);
  const blackStats = calculateStats(blackGames);
  const whiteOpeningStats = calculateOpeningStats(whiteGames);
  const blackOpeningStats = calculateOpeningStats(blackGames);

  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Analysis for <span className="text-primary">{username}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredGames.length} games analyzed
            {filters.timeControl !== 'all' || filters.color !== 'all' || filters.openingBucket !== 'all'
              ? ' (filtered)'
              : ''}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        availableOpenings={availableOpenings}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="white">As White</TabsTrigger>
          <TabsTrigger value="black">As Black</TabsTrigger>
          <TabsTrigger value="openings">Openings</TabsTrigger>
          <TabsTrigger value="coaching">Coaching Plan</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Games"
              value={stats.totalGames}
              icon={<Target className="h-5 w-5" />}
            />
            <StatCard
              title="Win Rate"
              value={`${stats.scorePercent.toFixed(1)}%`}
              subtitle={`${stats.wins}W / ${stats.draws}D / ${stats.losses}L`}
              icon={<Trophy className="h-5 w-5" />}
              variant={stats.scorePercent >= 50 ? 'success' : 'danger'}
            />
            <StatCard
              title="Avg Game Length"
              value={`${stats.avgGameLength} moves`}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              title="Avg Castling Ply"
              value={stats.avgCastlingPly > 0 ? `Move ${Math.round(stats.avgCastlingPly / 2)}` : 'N/A'}
              icon={<Shield className="h-5 w-5" />}
              variant={stats.avgCastlingPly <= 12 ? 'success' : stats.avgCastlingPly <= 16 ? 'warning' : 'danger'}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Quick Wins"
              value={stats.quickWins}
              subtitle="≤15 moves"
              icon={<Zap className="h-5 w-5" />}
              variant="success"
            />
            <StatCard
              title="Quick Losses"
              value={stats.quickLosses}
              subtitle="≤15 moves"
              icon={<Zap className="h-5 w-5" />}
              variant="danger"
            />
            <StatCard
              title="Queen Moves (First 10)"
              value={stats.avgQueenMovesFirst10.toFixed(1)}
              subtitle="avg per game"
              icon={<Crown className="h-5 w-5" />}
              variant={stats.avgQueenMovesFirst10 < 1 ? 'success' : stats.avgQueenMovesFirst10 < 2 ? 'warning' : 'danger'}
            />
            <StatCard
              title="Nc7+ Forks"
              value={stats.nc7ForkGames}
              subtitle="games with this motif"
              icon={<Swords className="h-5 w-5" />}
              variant={stats.nc7ForkGames === 0 ? 'success' : 'warning'}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Results Distribution</h3>
              <ResultsPie wins={stats.wins} losses={stats.losses} draws={stats.draws} />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Score Over Time</h3>
              {scoreOverTime.length > 1 ? (
                <ScoreChart data={scoreOverTime} />
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  Not enough data for timeline
                </div>
              )}
            </div>
          </div>

          {/* Opening Performance */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Opening Performance</h3>
            <OpeningChart data={openingStats} type="performance" />
          </div>
        </TabsContent>

        {/* As White Tab */}
        <TabsContent value="white" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Games as White"
              value={whiteStats.totalGames}
              icon={<Crown className="h-5 w-5" />}
            />
            <StatCard
              title="Win Rate"
              value={`${whiteStats.scorePercent.toFixed(1)}%`}
              subtitle={`${whiteStats.wins}W / ${whiteStats.draws}D / ${whiteStats.losses}L`}
              icon={<Trophy className="h-5 w-5" />}
              variant={whiteStats.scorePercent >= 50 ? 'success' : 'danger'}
            />
            <StatCard
              title="Avg Castling"
              value={whiteStats.avgCastlingPly > 0 ? `Move ${Math.round(whiteStats.avgCastlingPly / 2)}` : 'N/A'}
              icon={<Shield className="h-5 w-5" />}
            />
            <StatCard
              title="Queen Moves First 10"
              value={whiteStats.avgQueenMovesFirst10.toFixed(1)}
              icon={<Crown className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">White Openings</h3>
              <OpeningChart data={whiteOpeningStats} type="frequency" />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Performance by Opening</h3>
              <OpeningChart data={whiteOpeningStats} type="performance" />
            </div>
          </div>

          <OpeningTable data={whiteOpeningStats} />
        </TabsContent>

        {/* As Black Tab */}
        <TabsContent value="black" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Games as Black"
              value={blackStats.totalGames}
              icon={<Crown className="h-5 w-5" />}
            />
            <StatCard
              title="Win Rate"
              value={`${blackStats.scorePercent.toFixed(1)}%`}
              subtitle={`${blackStats.wins}W / ${blackStats.draws}D / ${blackStats.losses}L`}
              icon={<Trophy className="h-5 w-5" />}
              variant={blackStats.scorePercent >= 50 ? 'success' : 'danger'}
            />
            <StatCard
              title="Avg Castling"
              value={blackStats.avgCastlingPly > 0 ? `Move ${Math.round(blackStats.avgCastlingPly / 2)}` : 'N/A'}
              icon={<Shield className="h-5 w-5" />}
            />
            <StatCard
              title="Nc7+ Forks Received"
              value={blackStats.nc7ForkGames}
              icon={<Swords className="h-5 w-5" />}
              variant={blackStats.nc7ForkGames === 0 ? 'success' : 'warning'}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Black Openings</h3>
              <OpeningChart data={blackOpeningStats} type="frequency" />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Performance by Opening</h3>
              <OpeningChart data={blackOpeningStats} type="performance" />
            </div>
          </div>

          <OpeningTable data={blackOpeningStats} />
        </TabsContent>

        {/* Openings Tab */}
        <TabsContent value="openings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Opening Frequency</h3>
              <OpeningChart data={openingStats} type="frequency" />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Opening Success Rate</h3>
              <OpeningChart data={openingStats} type="performance" />
            </div>
          </div>

          <OpeningTable data={openingStats} />
        </TabsContent>

        {/* Coaching Tab */}
        <TabsContent value="coaching" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <CoachingCard
              type="strength"
              title="Your Strengths"
              items={strengths}
            />
            <CoachingCard
              type="weakness"
              title="Areas to Improve"
              items={weaknesses}
            />
            <CoachingCard
              type="recommendation"
              title="Recommendations"
              items={recommendations}
            />
          </div>

          <TrainingPlanCard plan={trainingPlan} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
