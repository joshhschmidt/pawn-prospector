import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  onImportClick?: () => void;
  onUploadClick?: () => void;
  onDemoClick?: () => void;
}

export const EmptyState = ({ onImportClick, onUploadClick, onDemoClick }: EmptyStateProps) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-6">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        
        <h2 className="text-xl font-bold text-foreground mb-2">
          Start Here
        </h2>
        <p className="text-muted-foreground mb-6">
          Import your games from Chess.com or upload PGN files to get personalized coaching insights.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onImportClick && (
            <Button onClick={onImportClick} className="gap-2">
              <Upload className="h-4 w-4" />
              Import from Chess.com
            </Button>
          )}
          {onUploadClick && (
            <Button variant="outline" onClick={onUploadClick} className="gap-2">
              <FileText className="h-4 w-4" />
              Upload PGN
            </Button>
          )}
        </div>
        
        {onDemoClick && (
          <Button variant="ghost" onClick={onDemoClick} className="mt-4 gap-2">
            <Sparkles className="h-4 w-4" />
            Try Demo Data
          </Button>
        )}
      </div>
    </div>
  );
};

export const LoadingState = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* KPI grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      
      {/* Charts skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    </div>
  );
};
