-- Fix: stripe_payment_intent_id should NOT be globally unique because one bulk payment
-- creates multiple transaction records (one per wallet). 
-- Drop the existing UNIQUE constraint and add a composite unique index instead
-- so the same intent ID can appear once per wallet.

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_stripe_payment_intent_id_key;

-- Composite index: same payment intent can appear multiple times but NOT for the same wallet twice
CREATE UNIQUE INDEX IF NOT EXISTS transactions_intent_wallet_unique 
  ON public.transactions (stripe_payment_intent_id, wallet_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
