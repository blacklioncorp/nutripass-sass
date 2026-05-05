-- Migration: Add lifecycle status to consumers and wallets
-- Purpose: Enable account cancellation workflow and wallet closure for refunds.

-- 1. Add status enum lifecycle to consumers
ALTER TABLE public.consumers
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancellation_requested', 'closed'));

ALTER TABLE public.consumers
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add status to wallets (to close them after a refund is processed)
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed'));

-- 3. Ensure existing records are set to 'active'
UPDATE public.consumers SET status = 'active' WHERE status IS NULL;
UPDATE public.wallets SET status = 'active' WHERE status IS NULL;

-- 4. Comments for documentation
COMMENT ON COLUMN public.consumers.status IS
  'Account lifecycle: active = normal, cancellation_requested = parent requested withdrawal, closed = account fully liquidated.';
COMMENT ON COLUMN public.consumers.cancellation_requested_at IS
  'Timestamp when the parent submitted a cancellation request.';
COMMENT ON COLUMN public.wallets.status IS
  'Wallet lifecycle: active = operational, closed = liquidated after school withdrawal refund.';

-- 5. Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
