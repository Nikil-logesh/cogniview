-- =============================================
-- 🔧 COMPLETE DATABASE RESET & FIX
-- =============================================
-- This will completely reset your database and fix all issues
-- COPY AND RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- =============================================

-- Step 1: Drop ALL existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access on products" ON products;
DROP POLICY IF EXISTS "Allow anyone to create orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Allow anyone to insert logs" ON logs;
DROP POLICY IF EXISTS "Users can view their own logs" ON logs;
DROP POLICY IF EXISTS "Allow anyone to insert metrics" ON metrics;
DROP POLICY IF EXISTS "Users can view their own metrics" ON metrics;
DROP POLICY IF EXISTS "Allow public read access on cleaned_logs" ON cleaned_logs;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Step 2: Drop ALL triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 3: Drop ALL tables in correct order (dependencies first)
DROP TABLE IF EXISTS cleaned_logs CASCADE;
DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- =============================================
-- NOW CREATE FRESH TABLES
-- =============================================

-- Step 4: Create Products Table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Step 5: Create Orders Table (WITH user_id column)
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Step 6: Create Logs Table (WITH event_type column)
CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'system',
    severity VARCHAR(20) DEFAULT 'info',
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Step 7: Create Metrics Table
CREATE TABLE metrics (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Step 8: Create Cleaned Logs Table
CREATE TABLE cleaned_logs (
    id BIGSERIAL PRIMARY KEY,
    original_log_id BIGINT REFERENCES logs(id),
    cleaned_message TEXT NOT NULL,
    confidence_score DECIMAL(5, 2),
    processing_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Step 9: Create User Profiles Table
CREATE TABLE user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Step 10: Insert Sample Products
INSERT INTO products (name, price, stock) VALUES
    ('Laptop Pro 15"', 1299.99, 50),
    ('Wireless Mouse', 29.99, 200),
    ('Mechanical Keyboard', 89.99, 150),
    ('USB-C Hub', 49.99, 100),
    ('Monitor 27"', 399.99, 75),
    ('Webcam HD', 79.99, 120),
    ('Desk Lamp LED', 34.99, 180),
    ('Ergonomic Chair', 249.99, 30);

-- Step 11: Create Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_event_name ON logs(event_name);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_metrics_user_id ON metrics(user_id);
CREATE INDEX idx_metrics_created_at ON metrics(created_at);

-- Step 12: Create User Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 13: Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaned_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 14: Create RLS Policies
CREATE POLICY "Allow public read access on products" 
ON products FOR SELECT 
USING (true);

CREATE POLICY "Allow anyone to create orders" 
ON orders FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own orders" 
ON orders FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow anyone to insert logs" 
ON logs FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own logs" 
ON logs FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow anyone to insert metrics" 
ON metrics FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own metrics" 
ON metrics FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow public read access on cleaned_logs" 
ON cleaned_logs FOR SELECT 
USING (true);

CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- =============================================
-- ✅ COMPLETE! Verify the setup:
-- =============================================
SELECT 'Products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Logs', COUNT(*) FROM logs
UNION ALL
SELECT 'Metrics', COUNT(*) FROM metrics
UNION ALL
SELECT 'User Profiles', COUNT(*) FROM user_profiles;

-- Check columns exist:
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('orders', 'logs')
AND column_name IN ('user_id', 'event_type')
ORDER BY table_name, column_name;
