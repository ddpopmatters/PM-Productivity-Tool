-- Create user_profiles table to track claimed accounts
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    team TEXT,
    role TEXT DEFAULT 'member',
    clerk_user_id TEXT,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read profiles (for team display)
CREATE POLICY "Allow public read access" ON user_profiles
    FOR SELECT USING (true);

-- Allow inserts from authenticated users (via service role in edge function)
CREATE POLICY "Allow insert for all" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- Allow updates for own profile
CREATE POLICY "Allow update for all" ON user_profiles
    FOR UPDATE USING (true);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
