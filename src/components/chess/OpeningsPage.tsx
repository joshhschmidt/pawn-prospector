import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Game, FilterState, OpeningBucket, OPENING_LABELS } from "@/types/chess";
import { filterGames, calculateOpeningStats } from "@/lib/analysis";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { StickyFilterBar } from "./StickyFilterBar";
import { OpeningChart } from "./OpeningChart";
import { OpeningTable } from "./OpeningTable";

interface OpeningsPageProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const OpeningsPage = ({ games, filters, onFiltersChange }: OpeningsPageProps) => {
  const filteredGames = filterGames(games, filters);

  const openingStats = useMemo(() => calculateOpeningStats(filteredGames), [filteredGames]);

  const whiteGames = useMemo(() => filterGames(games, { ...filters, color: "white" }), [games, filters]);
  const blackGames = useMemo(() => filterGames(games, { ...filters, color: "black" }), [games, filters]);

  const whiteOpeningStats = useMemo(() => calculateOpeningStats(whiteGames), [whiteGames]);
  const blackOpeningStats = useMemo(() => calculateOpeningStats(blackGames), [blackGames]);

  const availableOpenings = useMemo(
    () => [...new Set(games.map((g) => g.opening_bucket).filter(Boolean))] as OpeningBucket[],
    [games],
  );

  const [showTable, setShowTable] = useState(false);

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
      <PageHeader title="Openings" subtitle="Analyze your opening repertoire and performance" />

      <StickyFilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableOpenings={availableOpenings}
        totalGames={games.length}
        filteredCount={filteredGames.length}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: charts + breakdowns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Opening Frequency" description="Your most played openings (filtered)">
              <div className="h-[300px]">
                <OpeningChart data={openingStats.slice(0, 10)} type="frequency" />
              </div>
            </SectionCard>

            <SectionCard title="Opening Success Rate" description="Score % by opening (filtered)">
              <div className="h-[300px]">
                <OpeningChart data={openingStats.slice(0, 10)} type="performance" />
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Performance by Color" description="Which openings work best for you as White vs Black">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">AS WHITE</h4>
                <div className="h-[250px]">
                  <OpeningChart data={whiteOpeningStats.slice(0, 6)} type="performance" />
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">AS BLACK</h4>
                <div className="h-[250px]">
                  <OpeningChart data={blackOpeningStats.slice(0, 6)} type="performance" />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right: insights */}
        <div className="space-y-6">
          <SectionCard
            title="What to focus on"
            description="Quick takeaways from your filtered games"
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
                  Pick <span className="font-semibold">one White</span> and{" "}
                  <span className="font-semibold">one Black</span> opening to repeat for your next 20 games. Consistency
                  makes patterns obvious.
                </p>
              </div>
            </div>
          </SectionCard>

          <Collapsible open={showTable} onOpenChange={setShowTable}>
            <SectionCard
              title="All openings"
              description="Full breakdown of your opening buckets"
              actions={
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {showTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showTable ? "Hide" : "Show"} table
                  </Button>
                </CollapsibleTrigger>
              }
            >
              <CollapsibleContent className="pt-2">
                <OpeningTable data={openingStats} />
              </CollapsibleContent>

              {!showTable && (
                <p className="text-sm text-muted-foreground">
                  Tip: keep this collapsed most of the time—use it when you want to drill into a specific opening
                  bucket.
                </p>
              )}
            </SectionCard>
          </Collapsible>
        </div>
      </div>
    </PageContainer>
  );
};
