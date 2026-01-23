import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { OpeningStats, OPENING_LABELS } from '@/types/chess';

interface OpeningChartProps {
  data: OpeningStats[];
  type: 'frequency' | 'performance';
}

export const OpeningChart = ({ data, type }: OpeningChartProps) => {
  const chartData = data.map(item => ({
    name: OPENING_LABELS[item.bucket],
    shortName: OPENING_LABELS[item.bucket].split(' ')[0],
    value: type === 'frequency' ? item.games : item.scorePercent,
    games: item.games,
    score: item.scorePercent,
  }));

  const getBarColor = (score: number) => {
    if (score >= 55) return 'hsl(var(--chess-win))';
    if (score >= 45) return 'hsl(var(--accent))';
    return 'hsl(var(--chess-loss))';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Games: <span className="font-medium text-foreground">{data.games}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Score: <span className="font-medium text-foreground">{data.score.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 30, bottom: 100 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 500 }}
            axisLine={{ stroke: 'white', strokeWidth: 1.5 }}
            tickLine={{ stroke: 'white', strokeWidth: 1 }}
            angle={-35}
            textAnchor="end"
            height={110}
            interval={0}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 500 }}
            axisLine={{ stroke: 'white', strokeWidth: 1.5 }}
            tickLine={{ stroke: 'white', strokeWidth: 1 }}
            label={{
              value: type === 'frequency' ? 'Games' : 'Score %',
              angle: -90,
              position: 'insideLeft',
              fill: 'hsl(var(--foreground))',
              fontSize: 14,
              fontWeight: 600,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={type === 'frequency' ? 'hsl(var(--primary))' : getBarColor(entry.score)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
