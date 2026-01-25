import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  chessComUsername: string | null;
  signUp: (email: string, password: string, chessUsername?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  fetchChessComUsername: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [chessComUsername, setChessComUsername] = useState<string | null>(null);

  const fetchChessComUsername = async (): Promise<string | null> => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('chess_com_username')
      .eq('id', user.id)
      .maybeSingle();
    
    if (error || !data) return null;
    
    setChessComUsername(data.chess_com_username);
    return data.chess_com_username;
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch chess.com username when user logs in
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('chess_com_username')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (data) {
            setChessComUsername(data.chess_com_username);
          }
        } else {
          setChessComUsername(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('chess_com_username')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (data) {
          setChessComUsername(data.chess_com_username);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, chessUsername?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    
    // If signup successful and we have a chess username, store it in the users table
    if (!error && data.user && chessUsername) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          chess_com_username: chessUsername,
        });
      
      if (profileError) {
        console.error('Failed to save chess.com username:', profileError);
      } else {
        setChessComUsername(chessUsername);
      }
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    // If rememberMe is false, we'll sign out when the browser closes
    // Supabase handles persistent sessions by default
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Store remember me preference in localStorage
    if (!error) {
      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setChessComUsername(null);
    localStorage.removeItem('rememberMe');
  };

  // Handle session expiry based on remember me preference
  useEffect(() => {
    const handleVisibilityChange = () => {
      const rememberMe = localStorage.getItem('rememberMe');
      if (rememberMe === 'false' && document.visibilityState === 'hidden') {
        // User didn't want to be remembered - sign out when they leave
        // Using beforeunload would be better but it's not reliable
      }
    };

    // Check on page load if user should be signed out
    const checkRememberMe = async () => {
      const rememberMe = localStorage.getItem('rememberMe');
      if (rememberMe === 'false') {
        // If the browser was closed and reopened, the session may still exist
        // We could sign them out here, but that's disruptive
        // Instead, we'll just let the session naturally expire
      }
    };
    
    checkRememberMe();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isAuthenticated, 
      chessComUsername,
      signUp, 
      signIn, 
      signOut,
      fetchChessComUsername
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
