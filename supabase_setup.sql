-- #############################################################
-- EXPENSE IQ: COMPLETE DATABASE SETUP SCRIPT
-- Paste this entire script into the Supabase SQL Editor
-- #############################################################

-- 1. PROFILES TABLE
-- This table stores additional user metadata and links to Supabase Auth
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Users can only view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can only update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);


-- 2. EXPENSES TABLE
-- Main storage for all transaction data
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  vendor_name TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Food', 'Travel', 'Groceries', 'Shopping', 'Health', 'Utilities', 'Entertainment', 'Other'
  )),
  payment_mode TEXT DEFAULT 'Cash',
  date DATE NOT NULL,
  raw_ocr_text TEXT,
  is_manual BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance on queries by user and date
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);

-- Enable RLS for Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies for Expenses
CREATE POLICY "Users can fully manage their own expenses" 
ON expenses FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 3. BUDGETS TABLE
-- Stores monthly limits per category
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Food', 'Travel', 'Groceries', 'Shopping', 'Health', 'Utilities', 'Entertainment', 'Other'
  )),
  limit_amount NUMERIC(10,2) NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, month)
);

-- Enable RLS for Budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Policies for Budgets
CREATE POLICY "Users can fully manage their own budgets" 
ON budgets FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 4. PREDICTIONS TABLE
-- Stores AI forecast data
CREATE TABLE predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  predicted_date DATE NOT NULL,
  predicted_amount NUMERIC(10,2) NOT NULL,
  model_used TEXT NOT NULL CHECK (model_used IN ('LSTM', 'ARIMA')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Predictions
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Policies for Predictions
CREATE POLICY "Users can fully manage their own predictions" 
ON predictions FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 5. AUTOMATIC PROFILE CREATION TRIGGER
-- This ensures a profile is created every time a user signs up via Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Operative'), 
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- #############################################################
-- SETUP COMPLETE
-- Your database is now production-ready for ExpenseIQ
-- #############################################################
