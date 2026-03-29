-- Ensure products table has all required columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS nutri_points_reward INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ingredients TEXT[];

-- Ensure products INSERT/UPDATE policy exists for school_admins
DROP POLICY IF EXISTS "School Admins can manage products" ON products;
CREATE POLICY "School Admins can manage products" ON products FOR ALL USING (
  school_id IN (SELECT school_id FROM profiles WHERE profiles.id = auth.uid() AND (role = 'school_admin' OR role = 'superadmin'))
);
