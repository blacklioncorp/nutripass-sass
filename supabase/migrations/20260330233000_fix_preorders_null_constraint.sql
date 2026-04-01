-- Drop the NOT NULL constraint on daily_menu_id since pre_orders can now refer to products (snacks)
ALTER TABLE public.pre_orders 
ALTER COLUMN daily_menu_id DROP NOT NULL;

-- Optionally, ensure that at least one of them is present (data integrity)
ALTER TABLE public.pre_orders
ADD CONSTRAINT pre_orders_target_check 
CHECK (daily_menu_id IS NOT NULL OR product_id IS NOT NULL);
