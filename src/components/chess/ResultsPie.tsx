import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ResultsPieProps {
  wins: number;
  losses: number;
  draws: number;
}

export const ResultsPie = ({ wins, losses, draws }: ResultsPieProps) => {
  const data = [
    { name: 'Wins', value: wins, color: 'hsl(var(--chess-win))' },
    { name: 'Losses', value: losses, color: 'hsl(var(--chess-loss))' },
    { name: 'Draws', value: draws, color: 'hsl(var(--chess-draw))' },
  ].filter(d => d.value > 0);

  const total = wins + losses + draws;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} games ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = () => (
    <div className="flex justify-center gap-6 mt-4">
      {data.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">
            {entry.name}: {entry.value}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {renderLegend()}
    </div>
  );
};
