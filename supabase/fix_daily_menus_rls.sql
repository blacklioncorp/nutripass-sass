-- file: supabase/fix_daily_menus_rls.sql

-- Enable RLS for daily_menus if not already enabled
ALTER TABLE daily_menus ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies if they exist (to be safe)
DROP POLICY IF EXISTS "Parents can view menus of their children's schools" ON daily_menus;

-- Create policy allowing parents to see menus of schools where their children are enrolled
CREATE POLICY "Parents can view menus of their children's schools"
ON daily_menus
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM consumers WHERE parent_id = auth.uid()
  )
);
