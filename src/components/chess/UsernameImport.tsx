import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Download, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

interface UsernameImportProps {
  onImport: (username: string, dateRange: number, maxGames: number) => Promise<void>;
  isLoading: boolean;
}

export const UsernameImport = ({ onImport, isLoading }: UsernameImportProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [dateRange, setDateRange] = useState('90');
  const [maxGames, setMaxGames] = useState('500');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!username.trim()) {
      setError('Please enter a Chess.com username');
      return;
    }

    try {
      await onImport(username.trim(), parseInt(dateRange), parseInt(maxGames));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import games');
    }
  };

  const isAuthenticated = !!user;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-primary/20 p-2">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Import from Chess.com</h3>
          <p className="text-sm text-muted-foreground">
            {isAuthenticated 
              ? 'Enter your username to analyze your games' 
              : 'Sign in to import your games'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Chess.com Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="e.g., MagnusCarlsen"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-secondary border-border"
            disabled={!isAuthenticated}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange} disabled={!isAuthenticated}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Max Games</Label>
            <Select value={maxGames} onValueChange={setMaxGames} disabled={!isAuthenticated}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 games</SelectItem>
                <SelectItem value="250">250 games</SelectItem>
                <SelectItem value="500">500 games</SelectItem>
                <SelectItem value="1000">1,000 games</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {isAuthenticated ? (
          <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing Games...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import Games
              </>
            )}
          </Button>
        ) : (
          <Button 
            type="button" 
            className="w-full" 
            variant="hero" 
            onClick={() => navigate('/auth')}
            disabled={authLoading}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In to Import
          </Button>
        )}
      </form>
    </motion.div>
  );
};
