-- Schools table
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  role TEXT CHECK (role IN ('admin', 'staff', 'parent')),
  full_name TEXT,
  updated_at TIMESTAMPTZ
);

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  parent_id UUID REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  nfc_tag_uid TEXT UNIQUE,
  allergies JSONB DEFAULT '[]',
  blocked_items TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('comedor', 'snack')) NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table (Immutable)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit')) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  category TEXT,
  ingredients TEXT[],
  is_available BOOLEAN DEFAULT true
);

-- RLS POLICIES --

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

-- Students: Isolation by school_id linked to user profile
CREATE POLICY "School isolation for students" ON students
  FOR ALL USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  );

-- Wallets: Isolation via students
CREATE POLICY "School isolation for wallets" ON wallets
  FOR ALL USING (
    student_id IN (SELECT id FROM students WHERE school_id = (SELECT school_id FROM profiles WHERE id = auth.uid()))
  );

-- Transactions: Isolation via wallets
CREATE POLICY "School isolation for transactions" ON transactions
  FOR SELECT USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE student_id IN (
        SELECT id FROM students WHERE school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
      )
    )
  );

-- Products: Schools see their own products
CREATE POLICY "School isolation for products" ON products
  FOR ALL USING (
    school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  );