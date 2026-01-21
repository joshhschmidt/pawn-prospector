import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

interface ScoreChartProps {
  data: { date: string; score: number; games: number }[];
}

export const ScoreChart = ({ data }: ScoreChartProps) => {
  const chartData = data.map(item => ({
    ...item,
    formattedDate: format(new Date(item.date), 'MMM d'),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
          <p className="font-medium text-foreground">
            Week of {format(new Date(data.date), 'MMM d, yyyy')}
          </p>
          <p className="text-sm text-muted-foreground">
            Score: <span className="font-medium text-foreground">{data.score.toFixed(1)}%</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Games: <span className="font-medium text-foreground">{data.games}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
        >
          <XAxis
            dataKey="formattedDate"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            label={{
              value: 'Score %',
              angle: -90,
              position: 'insideLeft',
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 12,
            }}
          />
          <ReferenceLine
            y={50}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
            activeDot={{ fill: 'hsl(var(--accent))', strokeWidth: 0, r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
