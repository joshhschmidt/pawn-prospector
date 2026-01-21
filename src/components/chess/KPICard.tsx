import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface KPIGridProps {
  children: ReactNode;
}

export const KPIGrid = ({ children }: KPIGridProps) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {children}
    </div>
  );
};

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const KPICard = ({ title, value, subtitle, icon, variant = 'default' }: KPICardProps) => {
  const variantStyles = {
    default: 'border-border',
    success: 'border-chess-win/30 bg-chess-win/5',
    warning: 'border-warning/30 bg-warning/5',
    danger: 'border-chess-loss/30 bg-chess-loss/5',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-chess-win',
    warning: 'text-warning',
    danger: 'text-chess-loss',
  };

  return (
    <div className={`rounded-xl border bg-card p-4 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <p className={`text-2xl font-bold ${valueStyles[variant]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export const KPICardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);
