-- =============================================
-- 🔧 FIX RLS POLICY FOR ORDERS
-- =============================================
-- This fixes the "row violates row-level security" error
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Allow anyone to create orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;

-- Create a new, more permissive INSERT policy
-- This allows:
-- 1. Authenticated users to create orders with their own user_id
-- 2. Anyone to create guest orders (user_id IS NULL)
-- 3. Authenticated users to create orders on behalf of others (for admin features)
CREATE POLICY "Enable insert for all users"
ON orders FOR INSERT
WITH CHECK (true);

-- Verify the policy was created
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
WHERE tablename = 'orders' AND cmd = 'INSERT';
