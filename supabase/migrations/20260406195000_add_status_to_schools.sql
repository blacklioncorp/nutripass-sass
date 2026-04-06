-- Migration: Add status column to schools table
-- This column is used by the master dashboard to suspend/activate schools
-- and by the middleware to block access for suspended schools.

ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- Ensure all existing schools have 'active' status
UPDATE public.schools SET status = 'active' WHERE status IS NULL;

COMMENT ON COLUMN public.schools.status IS 'School status: active or suspended. Suspended schools block access for all non-superadmin users.';
