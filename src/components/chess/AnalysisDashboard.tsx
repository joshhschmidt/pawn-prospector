import { useState } from 'react';
import { Game, FilterState, OpeningBucket, OPENING_LABELS } from '@/types/chess';
import { filterGames, calculateStats, calculateOpeningStats, generateStrengths, generateWeaknesses, generateRecommendations, generateTrainingPlan, calculateScoreOverTime } from '@/lib/analysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from './StatCard';
import { OpeningChart } from './OpeningChart';
import { ScoreChart } from './ScoreChart';
import { ResultsPie } from './ResultsPie';
import { FilterBar } from './FilterBar';
import { CoachingCard } from './CoachingCard';
import { OpeningTable } from './OpeningTable';
import { CoachChat } from './CoachChat';
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

  const whiteGames = filterGames(games, { ...filters, color: 'white' });
  const blackGames = filterGames(games, { ...filters, color: 'black' });
  const whiteStats = calculateStats(whiteGames);
  const blackStats = calculateStats(blackGames);
  const whiteOpeningStats = calculateOpeningStats(whiteGames);
  const blackOpeningStats = calculateOpeningStats(blackGames);

  const availableOpenings = [...new Set(games.map(g => g.opening_bucket).filter(Boolean))] as OpeningBucket[];

  // Prepare stats for AI coach
  const topOpenings = openingStats
    .filter(o => o.games >= 3)
    .sort((a, b) => b.scorePercent - a.scorePercent)
    .slice(0, 3)
    .map(o => `${OPENING_LABELS[o.bucket]} (${o.scorePercent.toFixed(0)}%)`);

  const weakestOpenings = openingStats
    .filter(o => o.games >= 3)
    .sort((a, b) => a.scorePercent - b.scorePercent)
    .slice(0, 3)
    .map(o => `${OPENING_LABELS[o.bucket]} (${o.scorePercent.toFixed(0)}%)`);

  const playerStats = {
    totalGames: stats.totalGames,
    wins: stats.wins,
    losses: stats.losses,
    draws: stats.draws,
    scorePercent: stats.scorePercent,
    avgGameLength: stats.avgGameLength,
    avgQueenMovesFirst10: stats.avgQueenMovesFirst10,
    avgCastlingPly: stats.avgCastlingPly,
    quickLosses: stats.quickLosses,
    quickWins: stats.quickWins,
    topOpenings,
    weakestOpenings,
  };

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

      {/* Tabs - simplified to Overview and Openings */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="openings">Openings</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Now includes White/Black stats and Coaching */}
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

          {/* Charts Row */}
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

          {/* As White / As Black Side by Side */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* As White */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Crown className="h-5 w-5 text-chess-white" />
                As White
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard
                  title="Games"
                  value={whiteStats.totalGames}
                  icon={<Target className="h-4 w-4" />}
                />
                <StatCard
                  title="Win Rate"
                  value={`${whiteStats.scorePercent.toFixed(1)}%`}
                  subtitle={`${whiteStats.wins}W / ${whiteStats.draws}D / ${whiteStats.losses}L`}
                  icon={<Trophy className="h-4 w-4" />}
                  variant={whiteStats.scorePercent >= 50 ? 'success' : 'danger'}
                />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Top White Openings</h4>
                <OpeningChart data={whiteOpeningStats.slice(0, 5)} type="performance" />
              </div>
            </div>

            {/* As Black */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Crown className="h-5 w-5" />
                As Black
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard
                  title="Games"
                  value={blackStats.totalGames}
                  icon={<Target className="h-4 w-4" />}
                />
                <StatCard
                  title="Win Rate"
                  value={`${blackStats.scorePercent.toFixed(1)}%`}
                  subtitle={`${blackStats.wins}W / ${blackStats.draws}D / ${blackStats.losses}L`}
                  icon={<Trophy className="h-4 w-4" />}
                  variant={blackStats.scorePercent >= 50 ? 'success' : 'danger'}
                />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Top Black Openings</h4>
                <OpeningChart data={blackOpeningStats.slice(0, 5)} type="performance" />
              </div>
            </div>
          </div>

          {/* Coaching Insights Row */}
          <div className="grid gap-6 lg:grid-cols-3">
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
              title="Quick Tips"
              items={recommendations.slice(0, 3)}
            />
          </div>

          {/* AI Coach Chatbot */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <CoachChat playerStats={playerStats} username={username} />
            </div>
          </div>
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
      </Tabs>
    </div>
  );
};
