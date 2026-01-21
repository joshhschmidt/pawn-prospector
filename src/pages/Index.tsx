import { useState } from 'react';
import { Game } from '@/types/chess';
import { generateDemoGames, DEMO_USER_ID, DEMO_USERNAME } from '@/lib/demo-data';
import { parsePGNFile } from '@/lib/pgn-parser';
import { fetchChessComGames } from '@/lib/chess-api';
import { UsernameImport } from '@/components/chess/UsernameImport';
import { PGNUpload } from '@/components/chess/PGNUpload';
import { toast } from 'sonner';
import { AnalysisDashboard } from '@/components/chess/AnalysisDashboard';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, Github } from 'lucide-react';

const Index = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const handleUsernameImport = async (importUsername: string, dateRange: number, maxGames: number) => {
    setIsLoading(true);
    
    try {
      // Try to fetch from Chess.com API
      const fetchedGames = await fetchChessComGames(importUsername, dateRange, maxGames);
      setGames(fetchedGames);
      setUsername(importUsername);
      toast.success(`Imported ${fetchedGames.length} games from Chess.com!`);
    } catch (error) {
      console.error('Failed to fetch from Chess.com, using demo data:', error);
      toast.error('Could not fetch from Chess.com. Loading demo data instead.');
      // Fall back to demo data
      const demoGames = generateDemoGames(DEMO_USER_ID);
      setGames(demoGames.slice(0, maxGames));
      setUsername(importUsername);
    }
    setShowDashboard(true);
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
      
      if (allGames.length === 0) {
        throw new Error('No valid games found in the uploaded files');
      }
      
      setGames(allGames);
      setUsername(username || 'Uploaded Games');
      setShowDashboard(true);
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
      setIsLoading(false);
    }, 500);
  };

  const handleBack = () => {
    setShowDashboard(false);
    setGames([]);
    setUsername('');
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Background pattern */}
      <div className="fixed inset-0 chess-pattern pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {!showDashboard ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-12 lg:py-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center max-w-3xl mx-auto mb-12"
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-2 text-sm text-primary mb-6">
                  <Sparkles className="h-4 w-4" />
                  AI-Powered Chess Analysis
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                  Unlock Your{' '}
                  <span className="text-primary glow-text">Chess Potential</span>
                </h1>
                
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Get actionable coaching insights from your Chess.com games. No engine analysis needed — 
                  we focus on patterns, habits, and practical advice to help you improve.
                </p>
              </motion.div>

              {/* Import Options */}
              <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
                <UsernameImport onImport={handleUsernameImport} isLoading={isLoading} />
                <PGNUpload onUpload={handlePGNUpload} isLoading={isLoading} />
              </div>

              {/* Demo Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mt-8"
              >
                <p className="text-sm text-muted-foreground mb-3">
                  Just want to explore? Try our demo with sample data.
                </p>
                <Button
                  variant="outline"
                  onClick={handleLoadDemo}
                  disabled={isLoading}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Load Demo Data
                </Button>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-5xl mx-auto mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
              >
                {[
                  { title: 'Opening Analysis', desc: 'Track your success by opening' },
                  { title: 'Pattern Detection', desc: 'Find tactical weaknesses' },
                  { title: 'Coaching Insights', desc: 'Actionable recommendations' },
                  { title: 'Training Plans', desc: '50-game improvement roadmap' },
                ].map((feature, index) => (
                  <div
                    key={feature.title}
                    className="rounded-xl border border-border bg-card/50 p-5 text-center"
                  >
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Footer */}
            <footer className="border-t border-border bg-card/30 mt-20">
              <div className="container mx-auto px-4 py-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Chess Coach Analyzer — Improve your game with data-driven insights
                </p>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-5 w-5" />
                </a>
              </div>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            {/* Dashboard Header */}
            <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
              <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Chess Coach Analyzer</span>
                </div>
                
                <div className="w-20" /> {/* Spacer for centering */}
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="container mx-auto px-4 py-8">
              <AnalysisDashboard games={games} username={username} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
