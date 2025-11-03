# 🔍 HOW TO VIEW USERS IN SUPABASE

## Problem: Can't see login credentials in Supabase

Supabase **does NOT store passwords in plain text** for security reasons. Passwords are hashed using bcrypt. This is correct and secure behavior!

## ✅ How to View Users

### Method 1: Authentication Tab (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **"Authentication"** in the left sidebar (🔐 icon)
4. Click **"Users"** tab
5. You'll see all registered users with:
   - Email address
   - Created date
   - Last sign in
   - User ID (UUID)
   - **Note: Passwords are NOT visible (this is secure!)**

### Method 2: SQL Query

Run this in SQL Editor to see all users:

```sql
-- View all authenticated users
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;
```

### Method 3: User Profiles Table

Run this to see your custom user profiles:

```sql
-- View user profiles
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.created_at,
    au.last_sign_in_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;
```

## 🔑 Test Your Authentication

### Quick Test:

1. **Sign Up Test User**
   - Go to http://localhost:3000/signup
   - Email: `test@cogniview.com`
   - Password: `test123456`
   - Full Name: `Test User`

2. **Verify in Supabase**
   - Go to Authentication → Users
   - You should see `test@cogniview.com` listed
   - Note the User ID (UUID format)

3. **Check User Profile**
   - Go to Table Editor → `user_profiles`
   - Find the same User ID
   - Should show email and role

4. **Sign In**
   - Go to http://localhost:3000/login
   - Use same credentials: `test@cogniview.com` / `test123456`
   - Should successfully log in

## 🐛 Troubleshooting

### Issue: No users showing in Authentication tab

**Solution:**
```sql
-- Check if auth schema is accessible
SELECT COUNT(*) FROM auth.users;
```

If you get an error, your Supabase project might not have auth enabled.

### Issue: Users exist but can't sign in

**Check:**
1. Email confirmation settings
2. Go to Authentication → Settings → Email Auth
3. Disable "Confirm email" if testing locally

**SQL to manually confirm email:**
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'your-email@example.com';
```

### Issue: User profiles table empty

**Solution:** The trigger should auto-create profiles. If not, run this:

```sql
-- Manually create profile for existing user
INSERT INTO user_profiles (id, email, role)
SELECT id, email, 'customer'
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles);
```

## 📊 Current User Status

To check your current signed-in user in the app:

1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Look for `sb-[project-ref]-auth-token`
4. This contains your session JWT

Or run in browser console:
```javascript
// Get current user
supabase.auth.getUser().then(({ data }) => console.log(data.user))
```

## 🔐 Security Best Practices

✅ **DO:**
- Store passwords as hashed (Supabase does this)
- Use JWT tokens for sessions
- Enable Row Level Security (RLS)
- Require email confirmation in production

❌ **DON'T:**
- Store passwords in plain text
- Log passwords to console
- Share JWT tokens
- Disable auth in production

## 🎯 Quick Verification Script

Run this SQL to see everything about your users:

```sql
-- Complete user audit
SELECT 
    au.id as user_id,
    au.email,
    au.created_at as auth_created,
    au.last_sign_in_at,
    au.email_confirmed_at,
    up.full_name,
    up.role,
    up.created_at as profile_created,
    COUNT(DISTINCT o.id) as order_count,
    COUNT(DISTINCT l.id) as log_count
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
LEFT JOIN orders o ON au.id = o.user_id
LEFT JOIN logs l ON au.id = l.user_id
GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at, 
         au.email_confirmed_at, up.full_name, up.role, up.created_at
ORDER BY au.created_at DESC;
```

This shows:
- User email & ID
- When they signed up
- Last sign in time
- Profile info
- Number of orders
- Number of logged events

## 📧 Current User: nikilloesh4@gmail.com

Based on your screenshot, you're signed in as `nikilloesh4@gmail.com`.

To verify this user in Supabase:

1. Go to Authentication → Users
2. Search for `nikilloesh4@gmail.com`
3. Click on the user to see details
4. Check the User ID (UUID)

If you don't see this user, it means:
- The signup didn't complete successfully
- There's an issue with the auth trigger
- Wrong Supabase project selected

## 🔄 Reset & Recreate User (If Needed)

If you want to start fresh:

```sql
-- Delete existing user (BE CAREFUL!)
DELETE FROM auth.users WHERE email = 'nikilloesh4@gmail.com';

-- This will cascade delete from:
-- - user_profiles
-- - orders
-- - logs
-- Due to foreign key constraints
```

Then sign up again at http://localhost:3000/signup

## 📝 Summary

**Remember:**
- ✅ Users ARE in the database (auth.users table)
- ✅ Passwords are HASHED (not visible - this is good!)
- ✅ View users in Authentication → Users tab
- ✅ User profiles are in user_profiles table
- ✅ You can query auth.users with SQL
- ❌ You CANNOT see plain text passwords (by design)

**Your user `nikilloesh4@gmail.com` should be visible in:**
1. Supabase Dashboard → Authentication → Users
2. SQL query: `SELECT * FROM auth.users WHERE email = 'nikilloesh4@gmail.com'`
3. Table Editor → user_profiles table

If still not visible, there may be an issue with the signup process or database trigger.
