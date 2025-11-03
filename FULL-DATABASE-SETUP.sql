-- =============================================
-- 🚀 COGNIVIEW COMPLETE DATABASE SETUP
-- =============================================
-- Full E-Commerce + Telemetry + Monitoring System
-- Run this ENTIRE script in Supabase SQL Editor
-- This will reset everything and create a fresh database
-- =============================================
-- Features:
-- ✅ E-commerce (Products, Orders, Cart)
-- ✅ Multi-step Checkout with Shipping
-- ✅ User Authentication & Profiles
-- ✅ Telemetry (Logs + Metrics)
-- ✅ Data Cleaning Pipeline
-- ✅ Row Level Security (RLS)
-- ✅ Guest Checkout Support
-- =============================================

-- =============================================
-- STEP 1: CLEAN SLATE - Drop Everything
-- =============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public read access on products" ON products;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Allow anyone to create orders" ON orders;
DROP POLICY IF EXISTS "Enable insert for all users" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Allow anyone to insert logs" ON logs;
DROP POLICY IF EXISTS "Anyone can insert logs" ON logs;
DROP POLICY IF EXISTS "Users can view their own logs" ON logs;
DROP POLICY IF EXISTS "Users can view own logs" ON logs;
DROP POLICY IF EXISTS "Allow anyone to insert metrics" ON metrics;
DROP POLICY IF EXISTS "Anyone can insert metrics" ON metrics;
DROP POLICY IF EXISTS "Users can view their own metrics" ON metrics;
DROP POLICY IF EXISTS "Users can view own metrics" ON metrics;
DROP POLICY IF EXISTS "Allow public read access on cleaned_logs" ON cleaned_logs;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS cleaned_logs CASCADE;
DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- =============================================
-- STEP 2: CREATE TABLES
-- =============================================

-- Products Table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category VARCHAR(100),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Orders Table (Enhanced with shipping info)
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    
    -- Order Items (simplified - one product per order for now)
    product_id BIGINT NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    
    -- Customer Information
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    
    -- Shipping Address
    shipping_address_line1 VARCHAR(255),
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_zip VARCHAR(20),
    shipping_country VARCHAR(100),
    
    -- Billing Address
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_zip VARCHAR(20),
    billing_country VARCHAR(100),
    same_as_shipping BOOLEAN DEFAULT true,
    
    -- Shipping Method
    shipping_method VARCHAR(50), -- 'standard', 'express', 'overnight', 'pickup'
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    
    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    promo_code VARCHAR(50),
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Order Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    
    -- Metadata
    is_guest_order BOOLEAN DEFAULT false,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Logs Table (Telemetry Events)
CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'system', -- 'user', 'system', 'error', 'incident', 'checkout', 'cart'
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Metrics Table (Performance & Analytics)
CREATE TABLE metrics (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20), -- 'ms', 'percent', 'count', 'bytes', 'usd'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Cleaned Logs Table (IBM Data Prep Kit Output)
CREATE TABLE cleaned_logs (
    id BIGSERIAL PRIMARY KEY,
    original_log_id BIGINT REFERENCES logs(id),
    cleaned_message TEXT NOT NULL,
    normalized_severity VARCHAR(20),
    category VARCHAR(50), -- 'user_activity', 'system_health', 'incident_alert', 'checkout_flow'
    tags TEXT[],
    confidence_score DECIMAL(5, 2), -- 0.00 to 1.00
    processing_metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User Profiles Table
CREATE TABLE user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'customer', -- 'customer', 'admin', 'monitor'
    
    -- Default Addresses (for faster checkout)
    default_shipping_address JSONB,
    default_billing_address JSONB,
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- STEP 3: CREATE INDEXES (Performance)
-- =============================================

-- Products
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);

-- Logs
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_event_name ON logs(event_name);
CREATE INDEX idx_logs_event_type ON logs(event_type);
CREATE INDEX idx_logs_severity ON logs(severity);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);

-- Metrics
CREATE INDEX idx_metrics_user_id ON metrics(user_id);
CREATE INDEX idx_metrics_metric_name ON metrics(metric_name);
CREATE INDEX idx_metrics_created_at ON metrics(created_at DESC);

-- Cleaned Logs
CREATE INDEX idx_cleaned_logs_category ON cleaned_logs(category);
CREATE INDEX idx_cleaned_logs_created_at ON cleaned_logs(created_at DESC);

-- User Profiles
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- =============================================
-- STEP 4: INSERT SAMPLE DATA
-- =============================================

-- Insert Products
INSERT INTO products (name, description, price, stock, category) VALUES
    ('Laptop Pro 15"', 'High-performance laptop with 16GB RAM and 512GB SSD', 1299.99, 50, 'Electronics'),
    ('Wireless Mouse', 'Ergonomic wireless mouse with precision tracking', 29.99, 200, 'Accessories'),
    ('Mechanical Keyboard', 'RGB backlit mechanical keyboard with blue switches', 89.99, 150, 'Accessories'),
    ('USB-C Hub', '7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader', 49.99, 100, 'Accessories'),
    ('Monitor 27"', '4K UHD monitor with HDR support', 399.99, 75, 'Electronics'),
    ('Webcam HD', '1080p webcam with auto-focus and noise cancellation', 79.99, 120, 'Electronics'),
    ('Desk Lamp LED', 'Adjustable LED desk lamp with touch controls', 34.99, 180, 'Office'),
    ('Ergonomic Chair', 'Premium ergonomic office chair with lumbar support', 249.99, 30, 'Furniture'),
    ('Noise-Canceling Headphones', 'Premium wireless headphones with active noise cancellation', 199.99, 80, 'Electronics'),
    ('Portable SSD 1TB', 'Ultra-fast portable SSD with USB-C connectivity', 89.99, 110, 'Storage');

-- =============================================
-- STEP 5: CREATE FUNCTIONS & TRIGGERS
-- =============================================

-- Function: Auto-create user profile on signup
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

-- Trigger: Run handle_new_user on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Auto-update updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaned_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 7: CREATE RLS POLICIES
-- =============================================

-- Products: Public read access
CREATE POLICY "Allow public read access on products" 
ON products FOR SELECT 
USING (true);

-- Orders Policies - Fixed for RLS
CREATE POLICY "Enable insert for all users" 
ON orders FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Users can view their own orders" 
ON orders FOR SELECT 
TO public
USING (
    auth.uid() = user_id 
    OR user_id IS NULL 
    OR is_guest_order = true
);

CREATE POLICY "Users can update their own orders" 
ON orders FOR UPDATE 
TO public
USING (auth.uid() = user_id);

-- Logs Policies
CREATE POLICY "Allow anyone to insert logs" 
ON logs FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own logs" 
ON logs FOR SELECT 
USING (
    auth.uid() = user_id 
    OR user_id IS NULL
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Metrics Policies
CREATE POLICY "Allow anyone to insert metrics" 
ON metrics FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own metrics" 
ON metrics FOR SELECT 
USING (
    auth.uid() = user_id 
    OR user_id IS NULL
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Cleaned Logs: Public read (for monitoring dashboard)
CREATE POLICY "Allow public read access on cleaned_logs" 
ON cleaned_logs FOR SELECT 
USING (true);

-- User Profiles Policies
CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- STEP 8: CREATE VIEWS (Optional - for analytics)
-- =============================================

-- View: Order Summary
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id,
    o.customer_name,
    o.customer_email,
    o.product_name,
    o.quantity,
    o.total_amount,
    o.status,
    o.shipping_method,
    o.created_at,
    CASE 
        WHEN o.user_id IS NULL THEN 'Guest'
        ELSE 'Registered'
    END as customer_type
FROM orders o
ORDER BY o.created_at DESC;

-- View: Product Inventory
CREATE OR REPLACE VIEW product_inventory AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.price,
    p.stock,
    COALESCE(SUM(o.quantity), 0) as total_sold,
    p.stock - COALESCE(SUM(o.quantity), 0) as available_stock
FROM products p
LEFT JOIN orders o ON p.id = o.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.category, p.price, p.stock
ORDER BY total_sold DESC;

-- =============================================
-- STEP 9: VERIFICATION & SUMMARY
-- =============================================

-- Count all records
SELECT 'Products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Logs', COUNT(*) FROM logs
UNION ALL
SELECT 'Metrics', COUNT(*) FROM metrics
UNION ALL
SELECT 'Cleaned Logs', COUNT(*) FROM cleaned_logs
UNION ALL
SELECT 'User Profiles', COUNT(*) FROM user_profiles;

-- List all tables
SELECT 
    schemaname as schema,
    tablename as table,
    tableowner as owner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all RLS policies
SELECT 
    schemaname as schema,
    tablename as table,
    policyname as policy,
    cmd as command,
    qual as using_clause
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- ✅ SETUP COMPLETE!
-- =============================================
-- Your database is ready for:
-- 1. E-commerce (Products, Orders, Multi-step Checkout)
-- 2. Guest & Authenticated Checkout
-- 3. Shipping Address Collection
-- 4. Telemetry (Logs + Metrics)
-- 5. Data Cleaning Pipeline
-- 6. User Management
-- 7. Monitoring Dashboard
-- =============================================
-- Next Steps:
-- 1. Test product listing: SELECT * FROM products;
-- 2. Test order creation through your app
-- 3. Verify RLS policies work correctly
-- 4. Check the monitoring dashboard
-- =============================================
