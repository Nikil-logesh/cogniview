-- =============================================
-- 🔍 VIEW USERS IN SUPABASE DATABASE
-- =============================================
-- Run these queries in Supabase SQL Editor
-- =============================================

-- Query 1: View all registered users (EMAIL VISIBLE, PASSWORD NOT VISIBLE)
-- This shows user accounts from the authentication system
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at,
    phone,
    confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- Query 2: Check if your specific email exists
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'nikilloesh4@gmail.com';

-- Query 3: View user profiles (if they exist)
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.created_at,
    u.last_sign_in_at
FROM user_profiles up
LEFT JOIN auth.users u ON up.user_id = u.id
ORDER BY up.created_at DESC;

-- Query 4: Check all user activity (orders)
SELECT 
    o.id as order_id,
    u.email as user_email,
    o.product_name,
    o.total_amount,
    o.created_at as order_date
FROM orders o
LEFT JOIN auth.users u ON o.user_id = u.id
ORDER BY o.created_at DESC;

-- Query 5: Check user event logs
SELECT 
    l.id,
    u.email as user_email,
    l.event_name,
    l.message,
    l.created_at
FROM logs l
LEFT JOIN auth.users u ON l.user_id = u.id
WHERE l.user_id IS NOT NULL
ORDER BY l.created_at DESC
LIMIT 20;

-- =============================================
-- 🔐 ABOUT PASSWORDS
-- =============================================
-- Q: Why can't I see passwords?
-- A: Supabase uses bcrypt hashing - passwords are encrypted and CANNOT be reversed
--
-- Q: Where are passwords stored?
-- A: In auth.users table in 'encrypted_password' column (hash only)
--
-- Q: Can I view the hash?
-- A: Yes, but it's meaningless without the encryption key:

SELECT 
    id,
    email,
    LEFT(encrypted_password, 20) || '...' as password_hash_preview
FROM auth.users
ORDER BY created_at DESC;

-- =============================================
-- 📊 USER STATISTICS
-- =============================================
-- Count total users
SELECT COUNT(*) as total_users FROM auth.users;

-- Count users who confirmed email
SELECT COUNT(*) as confirmed_users 
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL;

-- Find most recent signups
SELECT 
    email,
    created_at,
    CASE 
        WHEN last_sign_in_at IS NOT NULL THEN 'Active'
        ELSE 'Never signed in'
    END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
