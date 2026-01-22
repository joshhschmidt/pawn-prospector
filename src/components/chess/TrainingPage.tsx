import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Game, FilterState, OpeningBucket, OPENING_LABELS } from "@/types/chess";
import { filterGames, calculateStats, calculateOpeningStats, generateTrainingPlan } from "@/lib/analysis";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { StickyFilterBar } from "./StickyFilterBar";
import { TrainingPlanCard } from "./TrainingPlanCard";
import { CoachChat } from "./CoachChat";

interface TrainingPageProps {
  games: Game[];
  username: string;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const TrainingPage = ({ games, username, filters, onFiltersChange }: TrainingPageProps) => {
  const filteredGames = useMemo(() => filterGames(games, filters), [games, filters]);
  const stats = useMemo(() => calculateStats(filteredGames), [filteredGames]);
  const openingStats = useMemo(() => calculateOpeningStats(filteredGames), [filteredGames]);
  const trainingPlan = useMemo(() => generateTrainingPlan(openingStats), [openingStats]);

  const availableOpenings = useMemo(
    () => [...new Set(games.map((g) => g.opening_bucket).filter(Boolean))] as OpeningBucket[],
    [games],
  );

  const [chatOpen, setChatOpen] = useState(false);

  // Prepare stats for AI coach
  const topOpenings = useMemo(
    () =>
      openingStats
        .filter((o) => o.games >= 3)
        .sort((a, b) => b.scorePercent - a.scorePercent)
        .slice(0, 3)
        .map((o) => `${OPENING_LABELS[o.bucket]} (${o.scorePercent.toFixed(0)}%)`),
    [openingStats],
  );

  const weakestOpenings = useMemo(
    () =>
      openingStats
        .filter((o) => o.games >= 3)
        .sort((a, b) => a.scorePercent - b.scorePercent)
        .slice(0, 3)
        .map((o) => `${OPENING_LABELS[o.bucket]} (${o.scorePercent.toFixed(0)}%)`),
    [openingStats],
  );

  const playerStats = useMemo(
    () => ({
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
    }),
    [stats, topOpenings, weakestOpenings],
  );

  return (
    <PageContainer>
      <PageHeader title="Training Plan" subtitle="Personalized improvement roadmap based on your games" />

      <StickyFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableOpenings={availableOpenings}
        totalGames={games.length}
        filteredCount={filteredGames.length}
      />

      {/* 50-Game Training Plan Card */}
      <TrainingPlanCard plan={trainingPlan} openingStats={openingStats} />

      {/* AI Coach Chat (collapsible to reduce clutter) */}
      <div className="mt-6">
        <Collapsible open={chatOpen} onOpenChange={setChatOpen}>
          <SectionCard
            title="AI Coach"
            description="Ask questions about your openings, habits, and next steps based on the current filters."
            actions={
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {chatOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {chatOpen ? "Hide" : "Show"} chat
                </Button>
              </CollapsibleTrigger>
            }
          >
            <CollapsibleContent className="pt-2">
              <CoachChat playerStats={playerStats} username={username} />
            </CollapsibleContent>

            {!chatOpen && (
              <div className="text-sm text-muted-foreground">
                Keep this collapsed while you’re scanning the plan; open it when you want to ask “what should I focus on
                next?”.
              </div>
            )}
          </SectionCard>
        </Collapsible>
      </div>
    </PageContainer>
  );
};
