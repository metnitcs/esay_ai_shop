-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'assets';

-- Create proper DELETE policy if not exists
CREATE POLICY "Users can delete own assets" ON assets 
FOR DELETE USING (auth.uid() = user_id);

-- Or temporarily disable RLS for testing
-- ALTER TABLE assets DISABLE ROW LEVEL SECURITY;