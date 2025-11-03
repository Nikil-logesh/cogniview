-- =============================================
-- Cogniview Store - Enhanced Database Schema
-- =============================================
-- Run these commands in your Supabase SQL Editor
-- This includes authentication, products, orders, 
-- telemetry (logs + metrics), and cleaned data
-- =============================================

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Enhanced Logs Table (User & System Events)
CREATE TABLE IF NOT EXISTS logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'system', -- 'user', 'system', 'error', 'incident'
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Metrics Table (Performance & System Health)
CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20), -- 'ms', 'percent', 'count', 'bytes'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Cleaned Logs Table (IBM Data Prep Kit Output)
CREATE TABLE IF NOT EXISTS cleaned_logs (
    id BIGSERIAL PRIMARY KEY,
    original_log_id BIGINT REFERENCES logs(id),
    cleaned_event_name VARCHAR(100),
    normalized_severity VARCHAR(20),
    category VARCHAR(50), -- 'user_activity', 'system_health', 'incident_alert'
    tags TEXT[],
    cleaned_message TEXT,
    confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 6. User Profiles Table (Extended user info)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'customer', -- 'customer', 'admin', 'monitor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_event_name ON logs(event_name);
CREATE INDEX IF NOT EXISTS idx_logs_event_type ON logs(event_type);
CREATE INDEX IF NOT EXISTS idx_logs_severity ON logs(severity);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleaned_logs_category ON cleaned_logs(category);
CREATE INDEX IF NOT EXISTS idx_cleaned_logs_created_at ON cleaned_logs(created_at DESC);

-- 8. Insert Sample Products
INSERT INTO products (name, price, stock) VALUES
    ('Wireless Headphones', 79.99, 50),
    ('Smart Watch', 199.99, 30),
    ('Laptop Stand', 49.99, 100),
    ('USB-C Cable', 12.99, 200),
    ('Mechanical Keyboard', 129.99, 25),
    ('Wireless Mouse', 34.99, 75),
    ('4K Webcam', 149.99, 40),
    ('Portable SSD 1TB', 89.99, 60)
ON CONFLICT DO NOTHING;

-- 9. Create Function to Auto-Create User Profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'customer');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create Trigger for New User Registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 11. Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS Policies

-- User Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Orders: Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Logs: Users can create logs, admins can view all
CREATE POLICY "Anyone can insert logs" ON logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own logs" ON logs
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Metrics: Similar to logs
CREATE POLICY "Anyone can insert metrics" ON metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own metrics" ON metrics
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Products: Public read access
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);

-- =============================================
-- Verification Queries
-- =============================================

-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'orders', 'logs', 'metrics', 'cleaned_logs', 'user_profiles')
ORDER BY table_name;

-- Check products
SELECT * FROM products;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
