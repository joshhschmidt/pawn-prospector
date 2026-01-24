import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { OpeningStats, OPENING_LABELS } from '@/types/chess';

interface OpeningChartProps {
  data: OpeningStats[];
  type: 'frequency' | 'performance';
}

export const OpeningChart = ({ data, type }: OpeningChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sort data from greatest to least based on chart type
  const sortedData = [...data].sort((a, b) => {
    if (type === 'frequency') {
      return b.games - a.games;
    }
    return b.winPercent - a.winPercent;
  });

  const chartData = sortedData.map(item => ({
    name: OPENING_LABELS[item.bucket],
    value: type === 'frequency' ? item.games : item.winPercent,
    games: item.games,
    winPercent: item.winPercent,
    scorePercent: item.scorePercent,
  }));

  // Custom tick component to render each word on a separate line
  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const words = payload.value.split(' ');
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize={12}
          fontWeight={500}
        >
          {words.map((word: string, index: number) => (
            <tspan key={index} x={0} dy={index === 0 ? 12 : 14}>
              {word}
            </tspan>
          ))}
        </text>
      </g>
    );
  };

  const getBarColor = (winPercent: number) => {
    if (winPercent >= 55) return 'hsl(var(--chess-win))';
    if (winPercent >= 45) return 'hsl(var(--accent))';
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
            tick={<CustomXAxisTick />}
            axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            tickLine={false}
            height={80}
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
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill="hsl(var(--primary))"
                style={{
                  filter: hoveredIndex === index ? 'brightness(1.3)' : 'brightness(1)',
                  transition: 'filter 0.2s ease-out',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredIndex(index)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
