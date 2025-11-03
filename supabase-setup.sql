-- =============================================
-- Supabase Database Setup for E-Commerce App
-- =============================================
-- Run these commands in your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query
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
    product_id BIGINT NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Create Logs Table (for event tracking)
CREATE TABLE IF NOT EXISTS logs (
    id BIGSERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Create Indexes for Better Performance
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_event_name ON logs(event_name);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

-- 5. Insert Sample Products
INSERT INTO products (name, price, stock) VALUES
    ('Wireless Headphones', 79.99, 50),
    ('Smart Watch', 199.99, 30),
    ('Laptop Stand', 49.99, 100),
    ('USB-C Cable', 12.99, 200),
    ('Mechanical Keyboard', 129.99, 25),
    ('Wireless Mouse', 34.99, 75);

-- =============================================
-- Verify Setup
-- =============================================
-- Run these queries to verify your tables were created successfully:

-- Check products
SELECT * FROM products;

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'orders', 'logs');
