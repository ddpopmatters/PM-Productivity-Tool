-- Migration: Create Productivity Tools Tables
-- This creates tables for Habit Tracker and Eisenhower Matrix features

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly'
    color TEXT DEFAULT '#22c55e',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived BOOLEAN DEFAULT false
);

-- Habit completions (tracking when habits are done)
CREATE TABLE IF NOT EXISTS habit_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, completed_date)
);

-- Eisenhower Matrix tasks
CREATE TABLE IF NOT EXISTS matrix_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    quadrant TEXT NOT NULL, -- 'do', 'schedule', 'delegate', 'eliminate'
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_habits_user ON habits(user_email);
CREATE INDEX idx_habits_archived ON habits(archived);
CREATE INDEX idx_habit_completions_habit ON habit_completions(habit_id);
CREATE INDEX idx_habit_completions_date ON habit_completions(completed_date);
CREATE INDEX idx_matrix_tasks_user ON matrix_tasks(user_email);
CREATE INDEX idx_matrix_tasks_quadrant ON matrix_tasks(quadrant);

-- Enable Row Level Security
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habits (users can only see/manage their own habits)
CREATE POLICY "Users can view own habits" ON habits
    FOR SELECT TO authenticated
    USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can create own habits" ON habits
    FOR INSERT TO authenticated
    WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update own habits" ON habits
    FOR UPDATE TO authenticated
    USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete own habits" ON habits
    FOR DELETE TO authenticated
    USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for habit_completions (inherit access from parent habit)
CREATE POLICY "Users manage own habit completions" ON habit_completions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM habits
            WHERE habits.id = habit_completions.habit_id
            AND habits.user_email = auth.jwt() ->> 'email'
        )
    );

-- RLS Policies for matrix_tasks (users can only see/manage their own tasks)
CREATE POLICY "Users can view own matrix tasks" ON matrix_tasks
    FOR SELECT TO authenticated
    USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can create own matrix tasks" ON matrix_tasks
    FOR INSERT TO authenticated
    WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update own matrix tasks" ON matrix_tasks
    FOR UPDATE TO authenticated
    USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete own matrix tasks" ON matrix_tasks
    FOR DELETE TO authenticated
    USING (user_email = auth.jwt() ->> 'email');
