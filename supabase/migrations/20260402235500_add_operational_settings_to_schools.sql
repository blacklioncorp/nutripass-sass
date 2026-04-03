-- Migration: Add operational and financial settings to schools
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '15:00:00';

COMMENT ON COLUMN public.schools.billing_email IS 'Email address to receive invoice requests from parents';
COMMENT ON COLUMN public.schools.opening_time IS 'Cafeteria opening time for service';
COMMENT ON COLUMN public.schools.closing_time IS 'Cafeteria closing time for service';
