-- =============================================
-- 🚨 QUICK FIX FOR ORDER ISSUES
-- =============================================
-- Run this IMMEDIATELY in Supabase SQL Editor
-- This fixes the "no orders showing" and "buy now not working" issues
-- =============================================

-- Step 1: Fix RLS policies for orders table
DROP POLICY IF EXISTS "Allow anyone to create orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Allow public to insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public to view orders" ON orders;
DROP POLICY IF EXISTS "Enable insert for all users" ON orders;
DROP POLICY IF EXISTS "Enable read access for own orders" ON orders;

-- Create simple, working policies
CREATE POLICY "Enable insert for all users"
ON orders FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable read access for own orders"
ON orders FOR SELECT
TO public
USING (
  auth.uid() = user_id 
  OR user_id IS NULL
);

-- Step 2: Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Step 3: Check if orders exist
SELECT COUNT(*) as total_orders FROM orders;
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- Step 4: Test inserting an order (as anonymous user)
INSERT INTO orders (user_id, product_id, product_name, price, quantity, total_amount)
VALUES (NULL, 1, 'Test Product', 99.99, 1, 99.99)
RETURNING *;

-- Step 5: Verify RLS is working
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'orders';

-- Step 6: Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'orders';

-- =============================================
-- ✅ After running this:
-- 1. Try creating an order via "Buy Now"
-- 2. Check the /orders page
-- 3. Orders should now appear!
-- =============================================
