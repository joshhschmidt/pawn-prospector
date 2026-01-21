import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, Table, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Game, AnalysisStats, OpeningStats, OPENING_LABELS } from '@/types/chess';
import { calculateStats, calculateOpeningStats } from '@/lib/analysis';

interface ExportPageProps {
  games: Game[];
  username: string;
}

export const ExportPage = ({ games, username }: ExportPageProps) => {
  const stats = calculateStats(games);
  const openingStats = calculateOpeningStats(games);

  const generateMarkdownReport = () => {
    const report = `
# Chess Analysis Report for ${username}

Generated on ${new Date().toLocaleDateString()}

## Summary

- **Total Games:** ${stats.totalGames}
- **Win Rate:** ${stats.scorePercent.toFixed(1)}%
- **Record:** ${stats.wins}W / ${stats.draws}D / ${stats.losses}L
- **Avg Game Length:** ${stats.avgGameLength} moves
- **Avg Castling Move:** ${stats.avgCastlingPly > 0 ? Math.round(stats.avgCastlingPly / 2) : 'N/A'}

## Opening Performance

| Opening | Games | Win Rate |
|---------|-------|----------|
${openingStats.slice(0, 10).map(o => 
  `| ${OPENING_LABELS[o.bucket]} | ${o.games} | ${o.scorePercent.toFixed(0)}% |`
).join('\n')}

## Habits

- **Quick Losses (< 15 moves):** ${stats.quickLosses}
- **Queen Moves in First 10:** ${stats.avgQueenMovesFirst10.toFixed(1)} avg
- **Tempo Loss Games:** ${stats.queenTempoLossGames}

## Tactical Flags

- **Nc7 Fork Patterns:** ${stats.nc7ForkGames}
- **Early Checks Received:** ${stats.earlyChecksReceived}
    `.trim();

    return report;
  };

  const handleExportMarkdown = () => {
    const report = generateMarkdownReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-report-${username}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report exported as Markdown!');
  };

  const handleExportCSV = () => {
    const headers = ['Opening', 'Games', 'Wins', 'Draws', 'Losses', 'Win Rate'];
    const rows = openingStats.map(o => [
      OPENING_LABELS[o.bucket],
      o.games,
      o.wins,
      o.draws,
      o.losses,
      `${o.scorePercent.toFixed(1)}%`
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openings-${username}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Opening stats exported as CSV!');
  };

  const handleCopySummary = () => {
    const summary = `
${username}'s Chess Stats
Win Rate: ${stats.scorePercent.toFixed(1)}% (${stats.wins}W/${stats.draws}D/${stats.losses}L)
Games: ${stats.totalGames}
Avg Game Length: ${stats.avgGameLength} moves
    `.trim();
    
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard!');
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Export"
        subtitle="Download your analysis data in various formats"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Markdown Report */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Full Report</h3>
              <p className="text-xs text-muted-foreground">Markdown format</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Complete analysis report including stats, openings, habits, and tactics.
          </p>
          <Button onClick={handleExportMarkdown} className="w-full gap-2">
            <FileDown className="h-4 w-4" />
            Export Markdown
          </Button>
        </div>

        {/* CSV Export */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-accent/10 p-2">
              <Table className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Opening Data</h3>
              <p className="text-xs text-muted-foreground">CSV spreadsheet</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Opening statistics in CSV format for spreadsheet analysis.
          </p>
          <Button variant="outline" onClick={handleExportCSV} className="w-full gap-2">
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Copy Summary */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-secondary p-2">
              <Copy className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Quick Summary</h3>
              <p className="text-xs text-muted-foreground">Copy to clipboard</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Copy a quick summary of your stats to share with others.
          </p>
          <Button variant="secondary" onClick={handleCopySummary} className="w-full gap-2">
            <Copy className="h-4 w-4" />
            Copy Summary
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Report Preview</h3>
        <pre className="text-xs text-muted-foreground bg-background rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
          {generateMarkdownReport()}
        </pre>
      </div>
    </PageContainer>
  );
};
