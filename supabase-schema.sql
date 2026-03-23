-- ==========================================
-- AUTOMATIC RLS TRIGGER
-- Creates an event trigger that automatically 
-- enables RLS on all new tables in public schema
-- ==========================================
CREATE OR REPLACE FUNCTION public.auto_enable_rls()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag = 'CREATE TABLE' AND schema_name = 'public'
  LOOP
    EXECUTE 'ALTER TABLE ' || rec.object_identity || ' ENABLE ROW LEVEL SECURITY;';
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS enable_rls_on_new_tables;
CREATE EVENT TRIGGER enable_rls_on_new_tables
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION public.auto_enable_rls();

-- ==========================================
-- SCHEMA DEFINITIONS
-- ==========================================

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#7CB9E8',
  secondary_color TEXT DEFAULT '#004B87',
  staff_discount_active BOOLEAN DEFAULT false,
  staff_discount_percentage DECIMAL(5,2) DEFAULT 0.00,
  stripe_account_id TEXT UNIQUE,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  role TEXT CHECK (role IN ('superadmin', 'school_admin', 'staff', 'parent')),
  full_name TEXT,
  push_token TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consumers (Unified table for Students and Staff)
CREATE TABLE IF NOT EXISTS consumers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  parent_id UUID REFERENCES profiles(id), -- Nullable, staff might not have a parent
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  identifier TEXT, -- Enrollment Number or Employee ID
  nfc_tag_uid TEXT UNIQUE,
  type TEXT CHECK (type IN ('student', 'staff')) NOT NULL,
  earned_nutri_points INTEGER DEFAULT 0,
  allergies JSONB DEFAULT '[]',
  blocked_items TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID REFERENCES consumers(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('comedor', 'snack')) NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
  max_overdraft DECIMAL(12,2) DEFAULT 50.00 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (Immutable)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit')) NOT NULL,
  description TEXT,
  stripe_payment_intent_id TEXT UNIQUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(12,2) NOT NULL,
  category TEXT CHECK (category IN ('snack', 'comedor', 'bebida')) NOT NULL,
  image_url TEXT,
  barcode TEXT UNIQUE,
  is_available BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT 0,
  nutri_points_reward INTEGER DEFAULT 0,
  ingredients TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Menus (Combo de 5 Tiempos)
CREATE TABLE IF NOT EXISTS daily_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  date DATE NOT NULL,
  soup_name TEXT,
  main_course_name TEXT,
  side_dish_name TEXT,
  dessert_name TEXT,
  drink_name TEXT,
  combo_price DECIMAL(10,2) DEFAULT 70.00,
  -- Legacy FK for backward compat (nullable)
  product_id UUID REFERENCES products(id),
  available_quantity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, date)
);

-- Pre Orders
CREATE TABLE IF NOT EXISTS pre_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID REFERENCES consumers(id) NOT NULL,
  daily_menu_id UUID REFERENCES daily_menus(id) NOT NULL,
  status TEXT CHECK (status IN ('paid', 'consumed', 'cancelled')) DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- (Automatic RLS enabled via Trigger, we just define policies here)

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- Schools
DROP POLICY IF EXISTS "Public read for subdomains" ON schools;
CREATE POLICY "Public read for subdomains" ON schools FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can update their school" ON schools;
CREATE POLICY "Admins can update their school" ON schools FOR UPDATE USING (
  id = (SELECT school_id FROM profiles WHERE profiles.id = auth.uid() AND role = 'school_admin')
);

-- Consumers
DROP POLICY IF EXISTS "School isolation for consumers" ON consumers;
CREATE POLICY "School isolation for consumers" ON consumers FOR ALL USING (
  school_id = (SELECT school_id FROM profiles WHERE profiles.id = auth.uid()) OR
  parent_id = auth.uid()
);

-- Products
DROP POLICY IF EXISTS "School isolation for products" ON products;
CREATE POLICY "School isolation for products" ON products FOR ALL USING (
  school_id = (SELECT school_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Wallets
DROP POLICY IF EXISTS "School Admins can insert wallets" ON wallets;
CREATE POLICY "School Admins can insert wallets" ON wallets FOR INSERT WITH CHECK (
  consumer_id IN (
    SELECT id FROM consumers WHERE school_id IN (SELECT school_id FROM profiles WHERE profiles.id = auth.uid() AND (role = 'school_admin' OR role = 'superadmin'))
  )
);
DROP POLICY IF EXISTS "Public read for wallets" ON wallets;
CREATE POLICY "Public read for wallets" ON wallets FOR SELECT USING (true);
-- School Admins can update wallets
DROP POLICY IF EXISTS "School Admins can update wallets" ON wallets;
CREATE POLICY "School Admins can update wallets" ON wallets FOR UPDATE USING (
  consumer_id IN (
    SELECT id FROM consumers WHERE school_id IN (SELECT school_id FROM profiles WHERE profiles.id = auth.uid() AND (role = 'school_admin' OR role = 'superadmin'))
  )
);

-- Daily Menus
DROP POLICY IF EXISTS "School isolation for daily menus" ON daily_menus;
CREATE POLICY "School isolation for daily menus" ON daily_menus FOR ALL USING (
  school_id IN (SELECT school_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Pre Orders
DROP POLICY IF EXISTS "School isolation for pre orders" ON pre_orders;
CREATE POLICY "School isolation for pre orders" ON pre_orders FOR ALL USING (
  consumer_id IN (
    SELECT id FROM consumers WHERE school_id IN (SELECT school_id FROM profiles WHERE profiles.id = auth.uid())
    OR parent_id = auth.uid()
  )
);

-- Transactions (read only for users, inserts are done via Service Role/RPC)
DROP POLICY IF EXISTS "Read access for transactions" ON transactions;
CREATE POLICY "Read access for transactions" ON transactions FOR SELECT USING (
  wallet_id IN (
    SELECT id FROM wallets WHERE consumer_id IN (
      SELECT id FROM consumers WHERE parent_id = auth.uid() OR school_id IN (SELECT school_id FROM profiles WHERE profiles.id = auth.uid())
    )
  )
);

-- ==========================================
-- ATOMIC POS TRANSACTION (RPC)
-- ==========================================
CREATE OR REPLACE FUNCTION process_pos_sale(
  p_nfc_uid TEXT,
  p_cart_total DECIMAL,
  p_nutri_points_earned INTEGER,
  p_items JSONB -- [{product_id, quantity}]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consumer RECORD;
  v_school RECORD;
  v_wallet RECORD;
  v_final_total DECIMAL;
  v_new_balance DECIMAL;
  i INTEGER;
BEGIN
  -- 1. Find Consumer by NFC or Identifier
  SELECT * INTO v_consumer FROM consumers WHERE (nfc_tag_uid = p_nfc_uid OR identifier = p_nfc_uid) AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consumidor no encontrado o inactivo.';
  END IF;

  -- 2. Find School settings
  SELECT * INTO v_school FROM schools WHERE id = v_consumer.school_id;

  -- 3. Calculate Final Total (Apply Staff Discount if applicable)
  v_final_total := p_cart_total;
  IF v_consumer.type = 'staff' AND v_school.staff_discount_active = true THEN
    v_final_total := p_cart_total - (p_cart_total * (v_school.staff_discount_percentage / 100));
  END IF;

  -- 4. Get Primary Wallet
  SELECT * INTO v_wallet FROM wallets WHERE consumer_id = v_consumer.id AND type = 'snack' LIMIT 1;
  IF NOT FOUND THEN 
    SELECT * INTO v_wallet FROM wallets WHERE consumer_id = v_consumer.id LIMIT 1;
  END IF;

  -- 5. Verify Balance + Overdraft
  v_new_balance := v_wallet.balance - v_final_total;
  IF (v_wallet.balance + v_wallet.max_overdraft) < v_final_total THEN
    RAISE EXCEPTION 'Insufficient Funds including Emergency Overdraft';
  END IF;

  -- 6. Deduct Balance
  UPDATE wallets SET balance = v_new_balance, updated_at = NOW() WHERE id = v_wallet.id;

  -- 7. Insert Transaction
  INSERT INTO transactions (wallet_id, amount, type, description, metadata)
  VALUES (v_wallet.id, v_final_total, 'debit', 'POS Purchase', p_items);

  -- 8. Deduct Stock & Add Nutripoints
  IF jsonb_array_length(p_items) > 0 THEN
    FOR i IN 0 .. jsonb_array_length(p_items) - 1
    LOOP
      UPDATE products 
      SET stock_quantity = stock_quantity - (p_items->i->>'quantity')::INTEGER
      WHERE id = (p_items->i->>'product_id')::UUID 
        AND (category = 'snack' OR category = 'bebida');
    END LOOP;
  END IF;

  UPDATE consumers 
  SET earned_nutri_points = earned_nutri_points + p_nutri_points_earned
  WHERE id = v_consumer.id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'consumer_name', v_consumer.first_name,
    'overdraft_triggered', v_new_balance < 0
  );
END;
$$;

-- ==========================================
-- STORAGE POLICIES (school_assets)
-- ==========================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('school_assets', 'school_assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read for school assets" ON storage.objects;
CREATE POLICY "Public read for school assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'school_assets');

DROP POLICY IF EXISTS "School Admins can upload assets" ON storage.objects;
CREATE POLICY "School Admins can upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'school_assets'
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'school_admin' OR role = 'superadmin')
  );

DROP POLICY IF EXISTS "School Admins can update assets" ON storage.objects;
CREATE POLICY "School Admins can update assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'school_assets'
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'school_admin' OR role = 'superadmin')
  );

DROP POLICY IF EXISTS "School Admins can delete assets" ON storage.objects;
CREATE POLICY "School Admins can delete assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'school_assets'
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'school_admin' OR role = 'superadmin')
  );

-- ==========================================
-- WEBHOOKS AND CRON JOBS (pg_net & pg_cron)
-- ==========================================

-- Trigger to call Deno Edge Function on Purchase
CREATE OR REPLACE FUNCTION notify_transaction()
RETURNS trigger AS $$
BEGIN
  -- Requires pg_net extension to be enabled in Supabase
  PERFORM net.http_post(
    url := 'https://' || current_setting('request.headers')::json->>'origin' || '/functions/v1/send-purchase-alert',
    headers := '{"Content-Type": "application/json"}',
    body := json_build_object('transaction', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transaction_webhook ON transactions;
CREATE TRIGGER transaction_webhook
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_transaction();

-- Schedule Weekly Reminder
-- Runs every Friday at 16:00 (Cron: '0 16 * * 5')
-- Make sure pg_cron is enabled in the database extensions layer.
/* 
SELECT cron.schedule(
  'weekly-preorder-reminder', 
  '0 16 * * 5', 
  $$
  SELECT net.http_post(
    url := 'https://' || current_setting('request.headers')::json->>'origin' || '/functions/v1/send-weekly-reminder',
    headers := '{"Content-Type": "application/json"}',
    body := '{"trigger": "cron"}'
  );
  $$
);
*/