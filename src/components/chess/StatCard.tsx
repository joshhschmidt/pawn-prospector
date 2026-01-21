import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  className,
  variant = 'default',
}: StatCardProps) => {
  const variantStyles = {
    default: 'border-border',
    success: 'border-chess-win/30',
    warning: 'border-warning/30',
    danger: 'border-chess-loss/30',
    accent: 'border-accent/30',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-chess-win',
    warning: 'text-warning',
    danger: 'text-chess-loss',
    accent: 'text-accent',
  };

  return (
    <div
      className={cn(
        'stat-card group cursor-default',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn('text-3xl font-bold tracking-tight', valueStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-secondary p-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="mt-4 flex items-center gap-1 text-sm">
          <span
            className={cn(
              'font-medium',
              trend === 'up' && 'text-chess-win',
              trend === 'down' && 'text-chess-loss',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trendValue}
          </span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      )}
    </div>
  );
};
