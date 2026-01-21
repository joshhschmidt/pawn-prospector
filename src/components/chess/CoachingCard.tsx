import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { Recommendation } from '@/types/chess';

interface CoachingCardProps {
  type: 'strength' | 'weakness' | 'recommendation';
  items: string[] | Recommendation[];
  title: string;
}

export const CoachingCard = ({ type, items, title }: CoachingCardProps) => {
  const getIcon = (item: string | Recommendation) => {
    if (type === 'strength') {
      return <CheckCircle2 className="h-5 w-5 text-chess-win shrink-0" />;
    }
    if (type === 'weakness') {
      return <AlertTriangle className="h-5 w-5 text-warning shrink-0" />;
    }
    if (type === 'recommendation') {
      const rec = item as Recommendation;
      return rec.type === 'start' ? (
        <CheckCircle2 className="h-5 w-5 text-chess-win shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-chess-loss shrink-0" />
      );
    }
    return <Lightbulb className="h-5 w-5 text-accent shrink-0" />;
  };

  const getHeaderStyle = () => {
    if (type === 'strength') return 'text-chess-win';
    if (type === 'weakness') return 'text-warning';
    return 'text-accent';
  };

  const getItemText = (item: string | Recommendation): string => {
    if (typeof item === 'string') return item;
    return item.text;
  };

  const getPriorityBadge = (item: string | Recommendation) => {
    if (typeof item !== 'object' || !item.priority) return null;
    
    const colors = {
      high: 'bg-chess-loss/20 text-chess-loss',
      medium: 'bg-warning/20 text-warning',
      low: 'bg-muted text-muted-foreground',
    };

    return (
      <span className={cn('text-xs px-2 py-0.5 rounded-full', colors[item.priority])}>
        {item.priority}
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className={cn('text-lg font-semibold mb-4', getHeaderStyle())}>
        {title}
      </h3>
      
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No data available yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              {getIcon(item)}
              <div className="flex-1">
                <p className="text-sm text-foreground">{getItemText(item)}</p>
              </div>
              {getPriorityBadge(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
