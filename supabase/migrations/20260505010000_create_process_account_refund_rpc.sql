-- Migration: Create process_account_refund RPC
-- Purpose: Atomically liquidate a consumer's account, zeroing out both wallets
--          and computing the net refund amount (after 5% admin commission).
--
-- Refund Formula:
--   gross          = comedor_balance + snack_balance
--   net_after_debt = gross  (negative means overdraft > balance, so $0 refund)
--   admin_fee      = GREATEST(net_after_debt, 0) * 0.05
--   refund_amount  = GREATEST(net_after_debt - admin_fee, 0)
--
-- This function ALWAYS closes the account (option b approved by stakeholder).
-- If refund_amount = 0 it means the account had an outstanding balance.

CREATE OR REPLACE FUNCTION public.process_account_refund(p_consumer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumer_name     TEXT;
  v_comedor_wallet_id UUID;
  v_snack_wallet_id   UUID;
  v_comedor_balance   NUMERIC := 0;
  v_snack_balance     NUMERIC := 0;
  v_gross             NUMERIC;
  v_admin_fee         NUMERIC;
  v_refund_amount     NUMERIC;
BEGIN
  -- 1. Validate consumer exists and fetch display name
  SELECT TRIM(first_name || ' ' || last_name)
  INTO v_consumer_name
  FROM consumers
  WHERE id = p_consumer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONSUMER_NOT_FOUND';
  END IF;

  -- 2. Fetch COMEDOR wallet (if it exists)
  SELECT id, COALESCE(balance, 0)
  INTO v_comedor_wallet_id, v_comedor_balance
  FROM wallets
  WHERE consumer_id = p_consumer_id
    AND type = 'comedor'
    AND status = 'active'
  LIMIT 1;

  -- 3. Fetch SNACK wallet (if it exists)
  SELECT id, COALESCE(balance, 0)
  INTO v_snack_wallet_id, v_snack_balance
  FROM wallets
  WHERE consumer_id = p_consumer_id
    AND type = 'snack'
    AND status = 'active'
  LIMIT 1;

  -- 4. Calculate refund amounts
  v_gross         := v_comedor_balance + v_snack_balance;
  v_admin_fee     := GREATEST(v_gross, 0) * 0.05;
  v_refund_amount := GREATEST(v_gross - v_admin_fee, 0);
  -- Round to 2 decimal places for currency accuracy
  v_admin_fee     := ROUND(v_admin_fee, 2);
  v_refund_amount := ROUND(v_refund_amount, 2);

  -- 5. Zero out COMEDOR wallet and insert refund transaction
  IF v_comedor_wallet_id IS NOT NULL THEN
    -- Insert debit transaction to bring balance to exactly $0.00
    -- Only insert if balance is non-zero (positive or negative)
    IF v_comedor_balance <> 0 THEN
      INSERT INTO transactions (wallet_id, amount, type, description, wallet_type)
      VALUES (
        v_comedor_wallet_id,
        -v_comedor_balance,   -- negative of current balance zeroes it out
        'refund',
        'Reembolso por Baja Escolar y Liquidación de Cuenta',
        'comedor'
      );
      UPDATE wallets SET balance = 0 WHERE id = v_comedor_wallet_id;
    END IF;

    -- Close the comedor wallet regardless
    UPDATE wallets SET status = 'closed' WHERE id = v_comedor_wallet_id;
  END IF;

  -- 6. Zero out SNACK wallet and insert refund transaction
  IF v_snack_wallet_id IS NOT NULL THEN
    IF v_snack_balance <> 0 THEN
      INSERT INTO transactions (wallet_id, amount, type, description, wallet_type)
      VALUES (
        v_snack_wallet_id,
        -v_snack_balance,
        'refund',
        'Reembolso por Baja Escolar y Liquidación de Cuenta',
        'snack'
      );
      UPDATE wallets SET balance = 0 WHERE id = v_snack_wallet_id;
    END IF;

    -- Close the snack wallet regardless
    UPDATE wallets SET status = 'closed' WHERE id = v_snack_wallet_id;
  END IF;

  -- 7. Close the consumer account
  UPDATE consumers
  SET status = 'closed'
  WHERE id = p_consumer_id;

  -- 8. Return result JSON for the frontend
  RETURN jsonb_build_object(
    'success',            true,
    'consumer_name',      v_consumer_name,
    'comedor_balance',    v_comedor_balance,
    'snack_balance',      v_snack_balance,
    'gross_balance',      v_gross,
    'admin_fee',          v_admin_fee,
    'refund_amount',      v_refund_amount,
    'had_overdraft',      (v_gross < 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Roll back everything if any step fails
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- Grant execution only to authenticated users (enforced by SECURITY DEFINER + superadmin check on frontend)
GRANT EXECUTE ON FUNCTION public.process_account_refund(UUID) TO authenticated;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
