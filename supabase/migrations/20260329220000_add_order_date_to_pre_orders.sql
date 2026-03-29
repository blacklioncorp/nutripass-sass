-- Add missing order_date column to pre_orders (column exists in schema but was not applied to prod)
ALTER TABLE public.pre_orders
  ADD COLUMN IF NOT EXISTS order_date DATE;

-- Also ensure product_id column exists (for snack pre-orders)
ALTER TABLE public.pre_orders
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id);
