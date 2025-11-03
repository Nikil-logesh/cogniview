-- =============================================
-- 🔧 ENHANCED E-COMMERCE DATABASE SETUP
-- =============================================
-- This script fixes the orders and adds essential e-commerce features
-- Run this in Supabase SQL Editor
-- =============================================

-- First, let's check and fix the RLS policies for orders table
-- Drop existing policies
DROP POLICY IF EXISTS "Allow anyone to create orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Allow public to insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public to view orders" ON orders;

-- Create new comprehensive policies for orders
-- Policy 1: Anyone can create orders (for both logged-in and guest users)
CREATE POLICY "Enable insert for all users"
ON orders FOR INSERT
TO public
WITH CHECK (true);

-- Policy 2: Users can view their own orders OR orders without user_id (guest orders)
CREATE POLICY "Enable read access for own orders"
ON orders FOR SELECT
TO public
USING (
  auth.uid() = user_id 
  OR user_id IS NULL
  OR auth.uid() IS NULL
);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'orders';

-- =============================================
-- Add order status tracking
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
        COMMENT ON COLUMN orders.status IS 'Order status: pending, processing, shipped, delivered, cancelled, refunded';
    END IF;
END $$;

-- =============================================
-- Add order notes/customer info
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'customer_email'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE orders ADD COLUMN notes TEXT;
    END IF;
END $$;

-- =============================================
-- Add shipping information
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'shipping_address'
    ) THEN
        ALTER TABLE orders ADD COLUMN shipping_address JSONB DEFAULT '{}';
        COMMENT ON COLUMN orders.shipping_address IS 'JSON: {street, city, state, zip, country}';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'tracking_number'
    ) THEN
        ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100);
    END IF;
END $$;

-- =============================================
-- Add product categories
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE products ADD COLUMN category VARCHAR(100) DEFAULT 'general';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE products ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE products ADD COLUMN image_url VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Update existing products with categories
UPDATE products SET category = 'computers' WHERE name LIKE '%Laptop%' OR name LIKE '%Monitor%';
UPDATE products SET category = 'accessories' WHERE name LIKE '%Mouse%' OR name LIKE '%Keyboard%' OR name LIKE '%Hub%' OR name LIKE '%Webcam%';
UPDATE products SET category = 'office' WHERE name LIKE '%Chair%' OR name LIKE '%Lamp%';

-- =============================================
-- Create order_items table for better order management
-- (Allows multiple products per order)
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for order_items
DROP POLICY IF EXISTS "Enable insert for order items" ON order_items;
DROP POLICY IF EXISTS "Enable read for order items" ON order_items;

CREATE POLICY "Enable insert for order items"
ON order_items FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable read for order items"
ON order_items FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR orders.user_id IS NULL OR auth.uid() IS NULL)
  )
);

-- =============================================
-- Create shopping cart table (persistent carts)
-- =============================================
CREATE TABLE IF NOT EXISTS shopping_carts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, product_id),
    UNIQUE(session_id, product_id)
);

-- Enable RLS for shopping carts
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart"
ON shopping_carts FOR ALL
TO public
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =============================================
-- Create product reviews table
-- =============================================
CREATE TABLE IF NOT EXISTS product_reviews (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS for reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
ON product_reviews FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create reviews"
ON product_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
ON product_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- Create wishlist table
-- =============================================
CREATE TABLE IF NOT EXISTS wishlists (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, product_id)
);

-- Enable RLS for wishlists
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wishlist"
ON wishlists FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Create discount codes table
-- =============================================
CREATE TABLE IF NOT EXISTS discount_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS for discount codes
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active discount codes"
ON discount_codes FOR SELECT
TO public
USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- =============================================
-- Create indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_user_id ON shopping_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);

-- =============================================
-- Create helpful views
-- =============================================

-- View for order summary with customer info
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id,
    o.user_id,
    o.product_name,
    o.quantity,
    o.price,
    o.total_amount,
    o.status,
    o.customer_email,
    o.customer_name,
    o.tracking_number,
    o.created_at,
    COALESCE(up.email, o.customer_email) as email,
    COALESCE(up.full_name, o.customer_name) as full_name
FROM orders o
LEFT JOIN user_profiles up ON o.user_id = up.user_id
ORDER BY o.created_at DESC;

-- View for product stats
CREATE OR REPLACE VIEW product_stats AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.price,
    p.stock,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.quantity), 0) as total_sold,
    COALESCE(SUM(o.total_amount), 0) as total_revenue,
    COALESCE(AVG(pr.rating), 0) as avg_rating,
    COUNT(DISTINCT pr.id) as review_count
FROM products p
LEFT JOIN orders o ON p.id = o.product_id
LEFT JOIN product_reviews pr ON p.id = pr.product_id
GROUP BY p.id, p.name, p.category, p.price, p.stock;

-- =============================================
-- Insert sample discount codes
-- =============================================
INSERT INTO discount_codes (code, discount_type, discount_value, min_purchase_amount, max_uses, valid_until)
VALUES 
    ('WELCOME10', 'percentage', 10.00, 50.00, 100, NOW() + INTERVAL '30 days'),
    ('SAVE20', 'percentage', 20.00, 100.00, 50, NOW() + INTERVAL '60 days'),
    ('FREESHIP', 'fixed', 10.00, 0.00, NULL, NOW() + INTERVAL '90 days')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Verification queries
-- =============================================

-- Check tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN ('products', 'orders', 'order_items', 'shopping_carts', 'product_reviews', 'wishlists', 'discount_codes')
ORDER BY table_name;

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('products', 'orders', 'order_items', 'shopping_carts', 'product_reviews', 'wishlists');

-- Check current data
SELECT 'Products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items
UNION ALL
SELECT 'Reviews', COUNT(*) FROM product_reviews
UNION ALL
SELECT 'Discount Codes', COUNT(*) FROM discount_codes;

-- =============================================
-- ✅ COMPLETE! 
-- Your e-commerce database is now ready with:
-- - Fixed order policies
-- - Order status tracking
-- - Product categories
-- - Shopping cart persistence
-- - Product reviews
-- - Wishlist functionality
-- - Discount codes
-- - Performance indexes
-- =============================================
