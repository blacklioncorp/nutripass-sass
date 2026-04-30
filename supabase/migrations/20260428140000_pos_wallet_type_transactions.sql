-- Migration: Add wallet_type to transactions and update smart_pos_checkout

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS wallet_type TEXT;

CREATE OR REPLACE FUNCTION public.smart_pos_checkout(
  p_consumer_id UUID,
  p_school_id UUID,
  p_cart_items JSONB,
  p_comedor_total NUMERIC,
  p_snack_total NUMERIC,
  p_wallet_comedor_id UUID DEFAULT NULL,
  p_wallet_snack_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
  -- 1. Allergen Check (Accumulative Logic - using consumers.allergies)
  SELECT allergies, daily_limit INTO v_consumer_allergies, v_daily_limit
  FROM consumers WHERE id = p_consumer_id;
  
  IF v_consumer_allergies IS NOT NULL AND jsonb_array_length(v_consumer_allergies) > 0 THEN
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

  -- 2. Daily Limit Check (Strictly from p_daily_limit)
  IF v_daily_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_gasto_hoy
    FROM transactions 
    WHERE wallet_id IN (p_wallet_comedor_id, p_wallet_snack_id)
      AND type = 'debit'
      AND description NOT ILIKE '%Comisión%'
      AND description NOT ILIKE '%Pre-orden%'
      AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE;

    IF (v_gasto_hoy + p_comedor_total + p_snack_total) > v_daily_limit THEN
      RAISE EXCEPTION 'LIMITE_DIARIO_EXCEDIDO';
    END IF;
  END IF;

  -- 3. Capacities & Overdraft Checks
  SELECT settings INTO v_school_settings FROM schools WHERE id = p_school_id;
  IF v_school_settings IS NOT NULL AND v_school_settings ? 'financial' THEN
      v_overdraft_limit := COALESCE((v_school_settings->'financial'->>'overdraft_limit')::NUMERIC, 0);
      v_apply_fee := COALESCE((v_school_settings->'financial'->>'apply_convenience_fee')::BOOLEAN, false);
      v_fee_amount := COALESCE((v_school_settings->'financial'->>'convenience_fee_amount')::NUMERIC, 0);
  END IF;

  -- Validation: COMEDOR
  IF p_comedor_total > 0 THEN
      IF p_wallet_comedor_id IS NULL THEN RAISE EXCEPTION 'FONDOS_INSUFICIENTES_COMEDOR'; END IF;
      SELECT balance INTO v_comedor_balance FROM wallets WHERE id = p_wallet_comedor_id;
      IF v_comedor_balance < p_comedor_total THEN
          IF (v_comedor_balance - p_comedor_total) < -v_overdraft_limit THEN RAISE EXCEPTION 'FONDOS_INSUFICIENTES_COMEDOR'; END IF;
          SELECT EXISTS (
             SELECT 1 FROM transactions 
             WHERE wallet_id = p_wallet_comedor_id AND description ILIKE '%Comisión por Sobregiro%'
             AND extract(week from created_at) = extract(week from current_date)
             AND extract(year from created_at) = extract(year from current_date)
          ) INTO v_used_overdraft;
          IF v_used_overdraft THEN RAISE EXCEPTION 'SOBREGIRO_SEMANAL_AGOTADO_COMEDOR'; END IF;
      END IF;
  END IF;
  
  -- Validation: SNACK
  IF p_snack_total > 0 THEN
      IF p_wallet_snack_id IS NULL THEN RAISE EXCEPTION 'FONDOS_INSUFICIENTES_SNACK'; END IF;
      SELECT balance INTO v_snack_balance FROM wallets WHERE id = p_wallet_snack_id;
      IF v_snack_balance < p_snack_total THEN
          IF (v_snack_balance - p_snack_total) < -v_overdraft_limit THEN RAISE EXCEPTION 'FONDOS_INSUFICIENTES_SNACK'; END IF;
          SELECT EXISTS (
             SELECT 1 FROM transactions 
             WHERE wallet_id = p_wallet_snack_id AND description ILIKE '%Comisión por Sobregiro%'
             AND extract(week from created_at) = extract(week from current_date)
             AND extract(year from created_at) = extract(year from current_date)
          ) INTO v_used_overdraft;
          IF v_used_overdraft THEN RAISE EXCEPTION 'SOBREGIRO_SEMANAL_AGOTADO_SNACK'; END IF;
      END IF;
  END IF;

  -- 4. Atomic Execution
  IF p_comedor_total > 0 THEN
      UPDATE wallets SET balance = balance - p_comedor_total WHERE id = p_wallet_comedor_id RETURNING balance INTO v_comedor_balance;
      INSERT INTO transactions (wallet_id, amount, type, description, wallet_type) 
      VALUES (p_wallet_comedor_id, -p_comedor_total, 'debit', 'BILLETERA COMEDOR: Consumo Alimentos', 'comedor');
      
      IF v_comedor_balance < 0 AND v_apply_fee AND v_fee_amount > 0 THEN
          UPDATE wallets SET balance = balance - v_fee_amount WHERE id = p_wallet_comedor_id;
          INSERT INTO transactions (wallet_id, amount, type, description, wallet_type) VALUES (p_wallet_comedor_id, -v_fee_amount, 'debit', 'Comisión por Sobregiro', 'comedor');
      END IF;
  END IF;

  IF p_snack_total > 0 THEN
      UPDATE wallets SET balance = balance - p_snack_total WHERE id = p_wallet_snack_id RETURNING balance INTO v_snack_balance;
      INSERT INTO transactions (wallet_id, amount, type, description, wallet_type) 
      VALUES (p_wallet_snack_id, -p_snack_total, 'debit', 'BILLETERA SNACK: Consumo Cafetería', 'snack');
      
      IF v_snack_balance < 0 AND v_apply_fee AND v_fee_amount > 0 THEN
          UPDATE wallets SET balance = balance - v_fee_amount WHERE id = p_wallet_snack_id;
          INSERT INTO transactions (wallet_id, amount, type, description, wallet_type) VALUES (p_wallet_snack_id, -v_fee_amount, 'debit', 'Comisión por Sobregiro', 'snack');
      END IF;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'messages', '{"Cobro inteligente ejecutado con éxito."}'::JSONB);
END;
$$;
