import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { OpeningStats, OPENING_LABELS } from '@/types/chess';

interface OpeningChartProps {
  data: OpeningStats[];
  type: 'frequency' | 'performance';
}

export const OpeningChart = ({ data, type }: OpeningChartProps) => {
  // Sort data from greatest to least based on chart type
  const sortedData = [...data].sort((a, b) => {
    if (type === 'frequency') {
      return b.games - a.games;
    }
    return b.winPercent - a.winPercent;
  });

  const chartData = sortedData.map(item => ({
    name: OPENING_LABELS[item.bucket],
    shortName: OPENING_LABELS[item.bucket].split(' ')[0],
    value: type === 'frequency' ? item.games : item.winPercent,
    games: item.games,
    winPercent: item.winPercent,
    scorePercent: item.scorePercent,
  }));

  const getBarColor = (winPercent: number) => {
    if (winPercent >= 55) return 'hsl(var(--chess-win))';
    if (winPercent >= 45) return 'hsl(var(--accent))';
    return 'hsl(var(--chess-loss))';
  };

  const CustomCursor = (props: any) => {
    const { x, y, width } = props;
    const chartBottom = 320; // 420px container height - 100px bottom margin
    const barHeight = chartBottom - y;
    
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(0, barHeight)}
        fill="hsl(var(--accent))"
        fillOpacity={0.15}
      />
    );
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
            Win %: <span className="font-medium text-foreground">{data.winPercent.toFixed(1)}%</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Score %: <span className="font-medium text-foreground">{data.scorePercent.toFixed(1)}%</span>
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
              value: type === 'frequency' ? 'Games' : 'Win %',
              angle: -90,
              position: 'insideLeft',
              fill: 'hsl(var(--foreground))',
              fontSize: 14,
              fontWeight: 600,
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={type === 'frequency' ? 'hsl(var(--primary))' : getBarColor(entry.winPercent)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
