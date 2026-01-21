import { FilterState, TimeControl, PlayerColor, OpeningBucket, TIME_CONTROL_LABELS, OPENING_LABELS } from '@/types/chess';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableOpenings: OpeningBucket[];
}

export const FilterBar = ({ filters, onFiltersChange, availableOpenings }: FilterBarProps) => {
  const handleReset = () => {
    onFiltersChange({
      dateRange: { start: null, end: null },
      timeControl: 'all',
      color: 'all',
      openingBucket: 'all',
    });
  };

  const hasActiveFilters = 
    filters.timeControl !== 'all' ||
    filters.color !== 'all' ||
    filters.openingBucket !== 'all' ||
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filters</span>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Time Control */}
      <Select
        value={filters.timeControl}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, timeControl: value as TimeControl | 'all' })
        }
      >
        <SelectTrigger className="w-[130px] bg-secondary border-border">
          <SelectValue placeholder="Time Control" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time Controls</SelectItem>
          {Object.entries(TIME_CONTROL_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Color */}
      <Select
        value={filters.color}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, color: value as PlayerColor | 'all' })
        }
      >
        <SelectTrigger className="w-[120px] bg-secondary border-border">
          <SelectValue placeholder="Color" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Both Colors</SelectItem>
          <SelectItem value="white">White</SelectItem>
          <SelectItem value="black">Black</SelectItem>
        </SelectContent>
      </Select>

      {/* Opening */}
      <Select
        value={filters.openingBucket}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, openingBucket: value as OpeningBucket | 'all' })
        }
      >
        <SelectTrigger className="w-[160px] bg-secondary border-border">
          <SelectValue placeholder="Opening" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Openings</SelectItem>
          {availableOpenings.map((bucket) => (
            <SelectItem key={bucket} value={bucket}>
              {OPENING_LABELS[bucket]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Quick Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filters.dateRange.start ? 'secondary' : 'ghost'}
          size="sm"
          className="text-xs"
          onClick={() => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            onFiltersChange({
              ...filters,
              dateRange: { start: thirtyDaysAgo, end: new Date() },
            });
          }}
        >
          <Calendar className="mr-1 h-3 w-3" />
          Last 30 days
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            onFiltersChange({
              ...filters,
              dateRange: { start: ninetyDaysAgo, end: new Date() },
            });
          }}
        >
          Last 90 days
        </Button>
      </div>

      {hasActiveFilters && (
        <>
          <div className="h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </>
      )}
    </div>
  );
};
