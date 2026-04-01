-- Add commission_percentage to schools table
-- Default to 5% as discussed
ALTER TABLE schools ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 5.00;

-- Optional: Update existing schools to have 5% if it was NULL (IF NOT EXISTS might not set initial value for existing rows in some DBs)
UPDATE schools SET commission_percentage = 5.00 WHERE commission_percentage IS NULL;
