-- Migration: Refactor Smart POS Checkout & Financial Constraints

-- 1. Add daily_limit to consumers
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS daily_limit NUMERIC DEFAULT NULL;

-- 2. Stripe Idempotency
-- First remove any completely exact duplicate row before adding unique constraint, just in case (optional, but safe to ignore if clean database)
-- Add UNIQUE constraint to prevent double funding
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS unique_stripe_intent;
ALTER TABLE public.transactions ADD CONSTRAINT unique_stripe_intent UNIQUE (stripe_payment_intent_id);

-- 3. Create or Replace the Transactional RPC smart_pos_checkout
CREATE OR REPLACE FUNCTION public.smart_pos_checkout(
  p_consumer_id UUID,
  p_school_id UUID,
  p_cart_items JSONB,
  p_comedor_total NUMERIC,
  p_snack_total NUMERIC,
  p_wallet_comedor_id UUID,
  p_wallet_snack_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as DB owner to bypass RLS for internal POS checks if needed
SET search_path = public
AS $$
DECLARE
  v_consumer_allergies JSONB;
  v_allergies_text TEXT[];
  v_daily_limit NUMERIC;
  v_gasto_hoy NUMERIC;
  
  v_comedor_balance NUMERIC;
  v_snack_balance NUMERIC;
  
  v_school_settings JSONB;
  v_overdraft_limit NUMERIC := 0;
  v_apply_fee BOOLEAN := false;
  v_fee_amount NUMERIC := 0;
  
  v_used_overdraft BOOLEAN := false;
BEGIN
  -- 1. Allergen Check (Strict Collision Logic)
  SELECT allergies, daily_limit INTO v_consumer_allergies, v_daily_limit
  FROM consumers WHERE id = p_consumer_id;
  
  IF v_consumer_allergies IS NOT NULL AND jsonb_array_length(v_consumer_allergies) > 0 THEN
    -- Convert JSONB array to TEXT[]
    SELECT array_agg(attr) INTO v_allergies_text FROM jsonb_array_elements_text(v_consumer_allergies) as attr;
    
    IF EXISTS (
        SELECT 1 
        FROM products p 
        WHERE p.id IN (SELECT (value->>'id')::UUID FROM jsonb_array_elements(p_cart_items))
        AND p.allergens && v_allergies_text
    ) THEN
        RAISE EXCEPTION 'ALERGIA_DETECTADA';
    END IF;
  END IF;

  -- 2. Daily Limit Check
  IF v_daily_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_gasto_hoy
    FROM transactions 
    WHERE wallet_id IN (p_wallet_comedor_id, p_wallet_snack_id)
      AND type = 'purchase'
      AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE;

    IF (v_gasto_hoy + p_comedor_total + p_snack_total) > v_daily_limit THEN
      RAISE EXCEPTION 'LIMITE_DIARIO_EXCEDIDO';
    END IF;
  END IF;

  -- 3. Capacities & Overdraft Checks
  -- Get school global financial settings
  SELECT settings INTO v_school_settings FROM schools WHERE id = p_school_id;
  IF v_school_settings IS NOT NULL AND v_school_settings ? 'financial' THEN
      v_overdraft_limit := COALESCE((v_school_settings->'financial'->>'overdraft_limit')::NUMERIC, 0);
      v_apply_fee := COALESCE((v_school_settings->'financial'->>'apply_convenience_fee')::BOOLEAN, false);
      v_fee_amount := COALESCE((v_school_settings->'financial'->>'convenience_fee_amount')::NUMERIC, 0);
  END IF;

  -- COMEDOR Validation
  IF p_comedor_total > 0 THEN
      IF p_wallet_comedor_id IS NULL THEN
          RAISE EXCEPTION 'FONDOS_INSUFICIENTES_COMEDOR';
      END IF;

      SELECT balance INTO v_comedor_balance FROM wallets WHERE id = p_wallet_comedor_id;
      
      IF v_comedor_balance < p_comedor_total THEN
          -- Overdraft checks
          IF (v_comedor_balance - p_comedor_total) < -v_overdraft_limit THEN
              RAISE EXCEPTION 'FONDOS_INSUFICIENTES_COMEDOR';
          END IF;
          
          -- Check if overdraft fee was already applied this ISO week
          SELECT EXISTS (
             SELECT 1 FROM transactions 
             WHERE wallet_id = p_wallet_comedor_id 
             AND description ILIKE '%Comisión por Sobregiro%'
             AND extract(week from created_at) = extract(week from current_date)
             AND extract(year from created_at) = extract(year from current_date)
          ) INTO v_used_overdraft;
          
          IF v_used_overdraft THEN
             RAISE EXCEPTION 'SOBREGIRO_SEMANAL_AGOTADO_COMEDOR';
          END IF;
      END IF;
  END IF;
  
  -- SNACK Validation
  IF p_snack_total > 0 THEN
      IF p_wallet_snack_id IS NULL THEN
          RAISE EXCEPTION 'FONDOS_INSUFICIENTES_SNACK';
      END IF;

      SELECT balance INTO v_snack_balance FROM wallets WHERE id = p_wallet_snack_id;
      
      IF v_snack_balance < p_snack_total THEN
          -- Overdraft checks
          IF (v_snack_balance - p_snack_total) < -v_overdraft_limit THEN
              RAISE EXCEPTION 'FONDOS_INSUFICIENTES_SNACK';
          END IF;
          
          SELECT EXISTS (
             SELECT 1 FROM transactions 
             WHERE wallet_id = p_wallet_snack_id 
             AND description ILIKE '%Comisión por Sobregiro%'
             AND extract(week from created_at) = extract(week from current_date)
             AND extract(year from created_at) = extract(year from current_date)
          ) INTO v_used_overdraft;
          
          IF v_used_overdraft THEN
             RAISE EXCEPTION 'SOBREGIRO_SEMANAL_AGOTADO_SNACK';
          END IF;
      END IF;
  END IF;

  -- 4. Atomic Execution of Charges
  -- (If any UPDATE or INSERT fails, the whole block rolls back automatically)
  IF p_comedor_total > 0 THEN
      UPDATE wallets SET balance = balance - p_comedor_total 
      WHERE id = p_wallet_comedor_id 
      RETURNING balance INTO v_comedor_balance;
      
      INSERT INTO transactions (wallet_id, amount, type, description) 
      VALUES (p_wallet_comedor_id, -p_comedor_total, 'purchase', 'Compra en POS - Comida/Desayuno');
      
      -- If new balance is negative, apply overdraft fee if configured (and we passed earlier validation so we know it's not double applied in week)
      IF v_comedor_balance < 0 AND v_apply_fee AND v_fee_amount > 0 THEN
          UPDATE wallets SET balance = balance - v_fee_amount WHERE id = p_wallet_comedor_id;
          INSERT INTO transactions (wallet_id, amount, type, description) 
          VALUES (p_wallet_comedor_id, -v_fee_amount, 'fee', 'Comisión por Sobregiro');
      END IF;
  END IF;

  IF p_snack_total > 0 THEN
      UPDATE wallets SET balance = balance - p_snack_total 
      WHERE id = p_wallet_snack_id 
      RETURNING balance INTO v_snack_balance;
      
      INSERT INTO transactions (wallet_id, amount, type, description) 
      VALUES (p_wallet_snack_id, -p_snack_total, 'purchase', 'Compra en POS - Snacks/Bebidas');
      
      IF v_snack_balance < 0 AND v_apply_fee AND v_fee_amount > 0 THEN
          UPDATE wallets SET balance = balance - v_fee_amount WHERE id = p_wallet_snack_id;
          INSERT INTO transactions (wallet_id, amount, type, description) 
          VALUES (p_wallet_snack_id, -v_fee_amount, 'fee', 'Comisión por Sobregiro');
      END IF;
  END IF;
  
  RETURN jsonb_build_object(
      'success', true,
      'messages', '{"Cobro inteligente ejecutado con éxito."}'::JSONB
  );
END;
$$;
