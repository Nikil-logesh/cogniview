# 🚨 URGENT FIX: Database Schema Missing Columns

## Problem
Your Supabase database is missing required columns:
- `orders` table missing `user_id` column
- `logs` table missing `event_type` column

This is why you're getting the error: **"Failed to process order"**

---

## ✅ Solution (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard
2. Select your project: **qifosyhanxyguwqnklii**
3. Click **"SQL Editor"** in left sidebar
4. Click **"New query"** button

### Step 2: Run the Schema
1. Open the file: **`RUN-THIS-IN-SUPABASE.sql`**
2. Copy **ALL** the content (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **"RUN"** button (bottom right)

### Step 3: Verify Success
You should see output like:
```
Products     | 8
Orders       | 0
Logs         | 0
Metrics      | 0
User Profiles| 0
```

---

## ⚠️ Warning
This script will **DROP and recreate** all tables. 

**What you'll lose:**
- ❌ Existing orders (if any)
- ❌ Existing logs (if any)
- ❌ Existing metrics (if any)

**What's preserved:**
- ✅ User accounts (in auth.users)
- ✅ Environment variables
- ✅ Application code

---

## 🧪 After Running SQL

### Test the Buy Button Again:

1. **Restart your dev server:**
   ```powershell
   # Press Ctrl+C in terminal
   npm run dev
   ```

2. **Visit the app:**
   ```
   http://localhost:3000
   ```

3. **Click "Buy Now" on any product**
   - Should now work! ✅
   - No more "Failed to process order" error
   - Order will be created in database

4. **Check Supabase:**
   - Go to: Table Editor → orders
   - You should see your new order! 🎉

---

## 📊 What the Schema Creates

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `products` | Store inventory | name, price, stock |
| `orders` | Purchase records | user_id, product_id, total_amount |
| `logs` | Event tracking | event_name, event_type, message |
| `metrics` | Performance data | metric_name, metric_value |
| `cleaned_logs` | IBM cleaned data | cleaned_message, confidence_score |
| `user_profiles` | User metadata | user_id, email, full_name |

---

## 🎯 Why This Happened

The original schema was created, but your Supabase database was likely reset or never had the full v2.0 schema applied. 

The new schema includes:
- ✅ All required columns (user_id, event_type)
- ✅ Proper foreign keys
- ✅ Row Level Security policies
- ✅ Sample products
- ✅ Indexes for performance
- ✅ User profile auto-creation trigger

---

## ❓ Troubleshooting

### If SQL script fails:
1. Check if you're in correct Supabase project
2. Verify you have admin access
3. Try running sections separately

### If buy button still fails:
1. Restart dev server (Ctrl+C, then `npm run dev`)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Check browser console for errors (F12)

### If no products show:
- The INSERT statement adds 8 products automatically
- If empty, run just the INSERT section again

---

## 📞 Need Help?

**Run this in Supabase SQL Editor to check your schema:**
```sql
-- Check if columns exist
SELECT 
    column_name, 
    data_type,
    table_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('orders', 'logs')
ORDER BY table_name, ordinal_position;
```

**Should show:**
- ✅ orders.user_id (uuid)
- ✅ logs.event_type (character varying)

---

## ✨ Summary

1. **Copy** `RUN-THIS-IN-SUPABASE.sql` content
2. **Paste** into Supabase SQL Editor
3. **Click** RUN button
4. **Restart** dev server
5. **Test** buy button
6. **Success!** 🎉

The buy button will now work and create proper orders with user tracking!
