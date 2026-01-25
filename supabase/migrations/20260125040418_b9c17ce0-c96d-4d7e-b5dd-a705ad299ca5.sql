-- Drop existing permissive policies on games table
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;
DROP POLICY IF EXISTS "Anyone can delete games" ON public.games;

-- Create user-scoped RLS policies for games
CREATE POLICY "Users can view their own games"
ON public.games FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own games"
ON public.games FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own games"
ON public.games FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own games"
ON public.games FOR DELETE
USING (auth.uid() = user_id);

-- Also update the users table policies to be user-scoped
DROP POLICY IF EXISTS "Anyone can create users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;

CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);