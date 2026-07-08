-- LCA-AI Supabase Database Setup
-- Run this in Supabase SQL Editor

-- 1. History table
CREATE TABLE IF NOT EXISTS user_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_title TEXT,
  functional_unit TEXT,
  total_co2eq NUMERIC,
  report_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects table
CREATE TABLE IF NOT EXISTS user_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Project calculations table
CREATE TABLE IF NOT EXISTS project_calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES user_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_calculations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - users see only their own data
CREATE POLICY "Users see own history" ON user_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own projects" ON user_projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own calculations" ON project_calculations
  FOR ALL USING (auth.uid() = user_id);
