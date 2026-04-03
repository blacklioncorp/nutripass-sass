-- Add special instructions and allergy override to pre_orders
ALTER TABLE public.pre_orders
  ADD COLUMN IF NOT EXISTS special_instructions TEXT,
  ADD COLUMN IF NOT EXISTS has_allergy_override BOOLEAN DEFAULT FALSE;

-- Ensure kitchen reports and other queries know these columns exist
COMMENT ON COLUMN public.pre_orders.special_instructions IS 'Instrucciones especiales de preparación o notas del padre.';
COMMENT ON COLUMN public.pre_orders.has_allergy_override IS 'Si es TRUE, el padre omitió una alerta de la IA para proceder con la orden bajo precaución.';
