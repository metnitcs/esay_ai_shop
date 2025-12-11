-- Enable RLS back
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can delete own assets" ON assets;
DROP POLICY IF EXISTS "Users can view own assets" ON assets;
DROP POLICY IF EXISTS "Users can insert own assets" ON assets;
DROP POLICY IF EXISTS "Users can update own assets" ON assets;

-- Create proper policies
CREATE POLICY "Users can view own assets" ON assets 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets" ON assets 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets" ON assets 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets" ON assets 
FOR DELETE USING (auth.uid() = user_id);