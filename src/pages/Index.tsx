import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Game, FilterState } from '@/types/chess';
import { generateDemoGames, DEMO_USER_ID, DEMO_USERNAME } from '@/lib/demo-data';
import { parsePGNFile } from '@/lib/pgn-parser';
import { fetchChessComGames } from '@/lib/chess-api';
import { UsernameImport } from '@/components/chess/UsernameImport';
import { PGNUpload } from '@/components/chess/PGNUpload';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { OverviewPage } from '@/components/chess/OverviewPage';
import { RecentProgressPage } from '@/components/chess/RecentProgressPage';
import { HabitsPage } from '@/components/chess/HabitsPage';
import { OpeningTrainingPage } from '@/components/chess/OpeningTrainingPage';
import { GameAnalyzerPage } from '@/components/chess/GameAnalyzerPage';
import { ExportPage } from '@/components/chess/ExportPage';
import { CoachingConversationsPage } from '@/components/chess/CoachingConversationsPage';
import { EmptyState, LoadingState } from '@/components/chess/EmptyLoadingStates';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Upload } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface IndexProps {
  demoMode?: boolean;
}

const Index = ({ demoMode = false }: IndexProps) => {
  const [searchParams] = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [currentView, setCurrentView] = useState('overview');
  const [coachingContext, setCoachingContext] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: null, end: null },
    timeControl: 'all',
    color: 'all',
    openingBucket: 'all',
  });
  const isMobile = useIsMobile();

  // Check for demo mode from prop or URL parameter
  const isDemoMode = demoMode || searchParams.get('demo') === 'true';
  const viewParam = searchParams.get('view');

  // Auto-load demo data when in demo mode
  useEffect(() => {
    if (isDemoMode && games.length === 0 && !isLoading) {
      const demoGames = generateDemoGames(DEMO_USER_ID);
      setGames(demoGames);
      setUsername(DEMO_USERNAME);
      setShowDashboard(true);
    }
  }, [isDemoMode, games.length, isLoading]);

  // Handle deep linking to specific views
  useEffect(() => {
    if (viewParam && ['overview', 'recent-progress', 'habits', 'tactics', 'training', 'analyzer', 'export', 'coaching'].includes(viewParam)) {
      setCurrentView(viewParam);
    }
  }, [viewParam]);

  const handleUsernameImport = async (importUsername: string, dateRange: number, maxGames: number) => {
    setIsLoading(true);
    try {
      const fetchedGames = await fetchChessComGames(importUsername, dateRange, maxGames);
      setGames(fetchedGames);
      setUsername(importUsername);
      toast.success(`Imported ${fetchedGames.length} games from Chess.com!`);
    } catch (error) {
      console.error('Failed to fetch from Chess.com, using demo data:', error);
      toast.error('Could not fetch from Chess.com. Loading demo data instead.');
      const demoGames = generateDemoGames(DEMO_USER_ID);
      setGames(demoGames.slice(0, maxGames));
      setUsername(importUsername);
    }
    setShowDashboard(true);
    setCurrentView('overview');
    setIsLoading(false);
  };

  const handlePGNUpload = async (files: File[]) => {
    setIsLoading(true);
    try {
      const allGames: Game[] = [];
      for (const file of files) {
        const content = await file.text();
        const parsedGames = parsePGNFile(content, DEMO_USER_ID, username || 'Player');
        allGames.push(...parsedGames);
      }
      if (allGames.length === 0) throw new Error('No valid games found');
      setGames(allGames);
      setUsername(username || 'Uploaded Games');
      setShowDashboard(true);
      setCurrentView('overview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = () => {
    setIsLoading(true);
    setTimeout(() => {
      const demoGames = generateDemoGames(DEMO_USER_ID);
      setGames(demoGames);
      setUsername(DEMO_USERNAME);
      setShowDashboard(true);
      setCurrentView('overview');
      setIsLoading(false);
    }, 500);
  };

  const handleBack = () => {
    setShowDashboard(false);
    setGames([]);
    setUsername('');
    setCurrentView('overview');
  };

  const renderCurrentView = () => {
    if (currentView === 'import' || currentView === 'dashboard') {
      return (
        <PageContainer>
          <PageHeader title="Import Games" subtitle="Add your chess games for analysis" />
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
            <UsernameImport onImport={handleUsernameImport} isLoading={isLoading} />
            <PGNUpload onUpload={handlePGNUpload} isLoading={isLoading} />
          </div>
        </PageContainer>
      );
    }
    if (currentView === 'overview') {
      return <OverviewPage games={games} filters={filters} onFiltersChange={setFilters} onNavigate={(view, context) => {
        setCurrentView(view);
        if (context) setCoachingContext(context);
      }} />;
    }
    if (currentView === 'recent-progress') {
      return <RecentProgressPage games={games} filters={filters} onFiltersChange={setFilters} onNavigate={(view, context) => {
        setCurrentView(view);
        if (context) setCoachingContext(context);
      }} />;
    }
    if (currentView === 'habits') {
      return <HabitsPage games={games} filters={filters} onFiltersChange={setFilters} onNavigate={(view, context) => {
        setCurrentView(view);
        if (context) setCoachingContext(context);
      }} />;
    }
    if (currentView === 'training') {
      return <OpeningTrainingPage games={games} filters={filters} onFiltersChange={setFilters} />;
    }
    if (currentView === 'analyzer') {
      return <GameAnalyzerPage games={games} filters={filters} onFiltersChange={setFilters} />;
    }
    if (currentView === 'coaching') {
      return <CoachingConversationsPage 
        games={games} 
        username={username} 
        filters={filters} 
        onFiltersChange={setFilters} 
        initialContext={coachingContext}
        onContextConsumed={() => setCoachingContext(null)}
      />;
    }
    if (currentView === 'export') {
      return <ExportPage games={games} username={username} />;
    }
    return <OverviewPage games={games} filters={filters} onFiltersChange={setFilters} onNavigate={setCurrentView} />;
  };

  // Landing page
  if (!showDashboard) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <div className="fixed inset-0 chess-pattern pointer-events-none" />
        <div className="relative container mx-auto px-4 py-12 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-2 text-sm text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Chess Analysis
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Unlock Your <span className="text-primary glow-text">Chess Potential</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get actionable coaching insights from your Chess.com games.
            </p>
          </motion.div>
          <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
            <UsernameImport onImport={handleUsernameImport} isLoading={isLoading} />
            <PGNUpload onUpload={handlePGNUpload} isLoading={isLoading} />
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" onClick={handleLoadDemo} disabled={isLoading}>
              <Sparkles className="mr-2 h-4 w-4" />
              Load Demo Data
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard with sidebar
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar username={username} onBack={handleBack} currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex h-full items-center gap-4 px-4 lg:px-6">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground hidden sm:inline">Pawn Prospector</span>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{username}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {isLoading ? <LoadingState /> : renderCurrentView()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
