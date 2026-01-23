import { useState } from 'react';
import { FilterState, TimeControl, PlayerColor, OpeningBucket, TIME_CONTROL_LABELS, OPENING_LABELS } from '@/types/chess';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Filter, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface StickyFilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableOpenings: OpeningBucket[];
  totalGames: number;
  filteredCount: number;
}

export const StickyFilterBar = ({ 
  filters, 
  onFiltersChange, 
  availableOpenings,
  totalGames,
  filteredCount
}: StickyFilterBarProps) => {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleReset = () => {
    onFiltersChange({
      dateRange: { start: null, end: null },
      timeControl: 'all',
      color: 'all',
      openingBucket: 'all',
    });
  };

  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];
  
  if (filters.timeControl !== 'all') {
    activeFilters.push({
      key: 'timeControl',
      label: TIME_CONTROL_LABELS[filters.timeControl],
      onRemove: () => onFiltersChange({ ...filters, timeControl: 'all' }),
    });
  }
  
  
  if (filters.openingBucket !== 'all') {
    activeFilters.push({
      key: 'opening',
      label: OPENING_LABELS[filters.openingBucket],
      onRemove: () => onFiltersChange({ ...filters, openingBucket: 'all' }),
    });
  }
  
  if (filters.dateRange.start) {
    const days = filters.dateRange.start 
      ? Math.round((new Date().getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    activeFilters.push({
      key: 'date',
      label: `Last ${days} days`,
      onRemove: () => onFiltersChange({ ...filters, dateRange: { start: null, end: null } }),
    });
  }

  const hasActiveFilters = activeFilters.length > 0;

  const FilterControls = () => (
    <div className="flex flex-col gap-4">
      {/* Time Control */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Time Control</label>
        <Select
          value={filters.timeControl}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, timeControl: value as TimeControl | 'all' })
          }
        >
          <SelectTrigger className="w-full bg-background border-border">
            <SelectValue placeholder="All Time Controls" />
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
      </div>


      {/* Opening */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Opening</label>
        <Select
          value={filters.openingBucket}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, openingBucket: value as OpeningBucket | 'all' })
          }
        >
          <SelectTrigger className="w-full bg-background border-border">
            <SelectValue placeholder="All Openings" />
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
      </div>

      {/* Date Range Quick Filters */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Date Range</label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.dateRange.start && 
              Math.round((new Date().getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) === 30 
                ? 'secondary' 
                : 'outline'
            }
            size="sm"
            onClick={() => {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              onFiltersChange({
                ...filters,
                dateRange: { start: thirtyDaysAgo, end: new Date() },
              });
            }}
          >
            Last 30 days
          </Button>
          <Button
            variant={filters.dateRange.start && 
              Math.round((new Date().getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) === 90 
                ? 'secondary' 
                : 'outline'
            }
            size="sm"
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFiltersChange({
              ...filters,
              dateRange: { start: null, end: null },
            })}
          >
            All Time
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile: Drawer
  if (isMobile) {
    return (
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border -mx-6 px-6 py-3 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{filteredCount}</span> of {totalGames} games
          </div>
          
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Filters</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-4">
                <FilterControls />
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline" onClick={() => setDrawerOpen(false)}>Done</Button>
                </DrawerClose>
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={handleReset}>
                    Clear All
                  </Button>
                )}
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            {activeFilters.map(filter => (
              <button
                key={filter.key}
                onClick={filter.onRemove}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
              >
                {filter.label}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop: Inline bar
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-medium text-foreground">{filteredCount}</span>
          <span>of {totalGames} games</span>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Time Control */}
        <Select
          value={filters.timeControl}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, timeControl: value as TimeControl | 'all' })
          }
        >
          <SelectTrigger className="w-[140px] bg-background border-border h-9">
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


        {/* Opening */}
        <Select
          value={filters.openingBucket}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, openingBucket: value as OpeningBucket | 'all' })
          }
        >
          <SelectTrigger className="w-[180px] bg-background border-border h-9">
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
            variant={filters.dateRange.start && 
              Math.round((new Date().getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) <= 31 
                ? 'secondary' 
                : 'ghost'
            }
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              onFiltersChange({
                ...filters,
                dateRange: { start: thirtyDaysAgo, end: new Date() },
              });
            }}
          >
            30 days
          </Button>
          <Button
            variant={filters.dateRange.start && 
              Math.round((new Date().getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) > 31 
                ? 'secondary' 
                : 'ghost'
            }
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              const ninetyDaysAgo = new Date();
              ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
              onFiltersChange({
                ...filters,
                dateRange: { start: ninetyDaysAgo, end: new Date() },
              });
            }}
          >
            90 days
          </Button>
        </div>

        {hasActiveFilters && (
          <>
            <div className="h-6 w-px bg-border" />
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-9">
              Clear All
            </Button>
          </>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {activeFilters.map(filter => (
            <button
              key={filter.key}
              onClick={filter.onRemove}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
            >
              {filter.label}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
