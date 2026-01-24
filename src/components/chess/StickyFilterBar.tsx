import { useState } from 'react';
import { FilterState, TimeControl, PlayerColor, OpeningBucket, TIME_CONTROL_LABELS, OPENING_LABELS } from '@/types/chess';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Filter, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

type DateRangeOption = 'all' | '7' | '30' | '90' | '180' | '365';

const DATE_RANGE_LABELS: Record<DateRangeOption, string> = {
  'all': 'All Time',
  '7': 'Last 7 days',
  '30': 'Last 30 days',
  '90': 'Last 90 days',
  '180': 'Last 6 months',
  '365': 'Last year',
};

export const StickyFilterBar = ({ 
  filters, 
  onFiltersChange, 
  availableOpenings,
  totalGames,
  filteredCount
}: StickyFilterBarProps) => {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReset = () => {
    onFiltersChange({
      dateRange: { start: null, end: null },
      timeControl: 'all',
      color: 'all',
      openingBucket: 'all',
    });
  };

  // Get current date range value for the dropdown
  const getCurrentDateRangeValue = (): DateRangeOption => {
    if (!filters.dateRange.start) return 'all';
    const days = Math.round((new Date().getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return '7';
    if (days <= 30) return '30';
    if (days <= 90) return '90';
    if (days <= 180) return '180';
    if (days <= 365) return '365';
    return 'all';
  };

  const handleDateRangeChange = (value: DateRangeOption) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, dateRange: { start: null, end: null } });
    } else {
      const days = parseInt(value);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      onFiltersChange({ ...filters, dateRange: { start: startDate, end: new Date() } });
    }
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
      {/* Date Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Lookback Period</label>
        <Select
          value={getCurrentDateRangeValue()}
          onValueChange={(value) => handleDateRangeChange(value as DateRangeOption)}
        >
          <SelectTrigger className="w-full bg-background border-border">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {Object.entries(DATE_RANGE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          <SelectContent className="bg-popover border-border z-50">
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
          <SelectContent className="bg-popover border-border z-50">
            <SelectItem value="all">All Openings</SelectItem>
            {availableOpenings.map((bucket) => (
              <SelectItem key={bucket} value={bucket}>
                {OPENING_LABELS[bucket]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

  // Desktop: Collapsible bar
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 mb-6">
        {/* Header row - always visible */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="font-medium text-foreground">{filteredCount}</span>
              <span>of {totalGames} games</span>
            </div>

            {/* Active filter chips - shown in header when collapsed */}
            {!isExpanded && hasActiveFilters && (
              <>
                <div className="h-6 w-px bg-border" />
                <div className="flex flex-wrap gap-2">
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
              </>
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && !isExpanded && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {activeFilters.length}
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Expanded filter controls */}
        <CollapsibleContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            {/* Lookback Period */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Lookback Period</label>
              <Select
                value={getCurrentDateRangeValue()}
                onValueChange={(value) => handleDateRangeChange(value as DateRangeOption)}
              >
                <SelectTrigger className="w-[150px] bg-background border-border h-9">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {Object.entries(DATE_RANGE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Control */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Time Control</label>
              <Select
                value={filters.timeControl}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, timeControl: value as TimeControl | 'all' })
                }
              >
                <SelectTrigger className="w-[150px] bg-background border-border h-9">
                  <SelectValue placeholder="Time Control" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Opening</label>
              <Select
                value={filters.openingBucket}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, openingBucket: value as OpeningBucket | 'all' })
                }
              >
                <SelectTrigger className="w-[180px] bg-background border-border h-9">
                  <SelectValue placeholder="Opening" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="all">All Openings</SelectItem>
                  {availableOpenings.map((bucket) => (
                    <SelectItem key={bucket} value={bucket}>
                      {OPENING_LABELS[bucket]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-9">
                Clear All
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
