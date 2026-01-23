import { OpeningStats, OPENING_LABELS } from '@/types/chess';
import { cn } from '@/lib/utils';

interface OpeningTableProps {
  data: OpeningStats[];
}

export const OpeningTable = ({ data }: OpeningTableProps) => {
  const getScoreColor = (winPercent: number) => {
    if (winPercent >= 55) return 'text-chess-win';
    if (winPercent >= 45) return 'text-foreground';
    return 'text-chess-loss';
  };

  const getScoreBg = (winPercent: number) => {
    if (winPercent >= 55) return 'bg-chess-win/20';
    if (winPercent >= 45) return 'bg-muted';
    return 'bg-chess-loss/20';
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Opening</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Games</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">W/D/L</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Win %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.bucket}
                className={cn(
                  'border-b border-border/50 transition-colors hover:bg-secondary/30',
                  index === data.length - 1 && 'border-b-0'
                )}
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">
                    {OPENING_LABELS[row.bucket]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {row.games}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-chess-win">{row.wins}</span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-chess-draw">{row.draws}</span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-chess-loss">{row.losses}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium',
                      getScoreBg(row.winPercent),
                      getScoreColor(row.winPercent)
                    )}
                  >
                    {row.winPercent.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
