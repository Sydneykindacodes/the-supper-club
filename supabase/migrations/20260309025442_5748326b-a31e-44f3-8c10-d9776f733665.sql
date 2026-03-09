
-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_color text DEFAULT '#c9956a',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add user_id to members table to link to auth
ALTER TABLE public.members ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Policy: members readable by group members
CREATE POLICY "Authenticated users can read members"
  ON public.members FOR SELECT TO authenticated USING (true);
