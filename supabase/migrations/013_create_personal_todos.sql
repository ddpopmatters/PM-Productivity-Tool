-- Migration: Create Personal Todos Table
-- Stores personal todo items with date scheduling and completion status

CREATE TABLE IF NOT EXISTS personal_todos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    date DATE,  -- Optional: schedule for a specific date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_personal_todos_user ON personal_todos(user_email);
CREATE INDEX idx_personal_todos_date ON personal_todos(date);
CREATE INDEX idx_personal_todos_completed ON personal_todos(completed);

-- Enable Row Level Security
ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see/manage their own todos)
CREATE POLICY "Users can view own todos" ON personal_todos
    FOR SELECT TO authenticated
    USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can create own todos" ON personal_todos
    FOR INSERT TO authenticated
    WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update own todos" ON personal_todos
    FOR UPDATE TO authenticated
    USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete own todos" ON personal_todos
    FOR DELETE TO authenticated
    USING (user_email = auth.jwt() ->> 'email');
