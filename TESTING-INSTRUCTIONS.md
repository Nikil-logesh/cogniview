# 🚀 TESTING INSTRUCTIONS

## Server Status
✅ **Server is running on: http://localhost:3000**

## CRITICAL: Run This SQL First!

### Option 1: Quick Fix (Recommended)
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to: SQL Editor
3. Copy and paste the entire contents of: **`NUCLEAR-FIX-RLS.sql`**
4. Click "Run"
5. Verify you see: ✅ RLS POLICIES FIXED!

### Option 2: Complete Setup
If you want all e-commerce features:
- Run: **`ENHANCED-ECOMMERCE-SETUP.sql`** instead

---

## Testing Process

### Step 1: Open The Application
- URL: http://localhost:3000
- Open Browser DevTools (F12)
- Go to Console tab

### Step 2: Enable Debug Panel
- Look for 🐛 bug icon in bottom-left corner
- Click it to open debug panel
- This shows real-time debugging info

### Step 3: Test "Buy Now"
1. Click "Buy Now" on any product
2. Watch the debug panel - you'll see:
   - 🛒 Initiating purchase
   - 📤 Sending order
   - 📥 Response
   - ✅ Order created (if successful)
   - ❌ Error message (if failed)

3. Check browser console for detailed logs

### Step 4: Check Order History
1. Click "My Orders" in navigation
2. You should see your order appear
3. If not, check debug panel for errors

### Step 5: Test Shopping Cart
1. Click "Add to Cart" on products
2. Cart badge should show item count
3. Click cart icon (top right)
4. Adjust quantities
5. Click "Checkout"
6. Watch debug panel for each order

---

## Troubleshooting

### If "Buy Now" Shows Error:

**1. Check Debug Panel**
- Look for the error message
- Common errors:
  - "Product not found" → Check product exists in database
  - "Insufficient stock" → Update stock in Supabase
  - "Failed to create order" → RLS policy issue
  - "Price mismatch" → Refresh page

**2. Check Browser Console**
- Look for red error messages
- Check "Sending order request" log
- Check "Order response" log

**3. Check Supabase**
- Go to Supabase Dashboard
- Table Editor → orders table
- Do you see any orders?

**4. Run SQL Verification**
```sql
-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'orders';

-- Try manual insert
INSERT INTO orders (user_id, product_id, product_name, price, quantity, total_amount)
VALUES (NULL, 1, 'Test', 99.99, 1, 99.99)
RETURNING *;

-- Check orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;
```

### If Orders Don't Show on /orders Page:

**1. Check Debug Panel**
- Navigate to /orders
- Check console for "Fetched orders: [...]"

**2. Verify Orders Exist**
```sql
SELECT COUNT(*) FROM orders;
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
```

**3. Check RLS Policies**
```sql
-- This should return rows
SELECT * FROM orders WHERE user_id IS NULL;
```

---

## Debug Panel Legend

- 🔄 = Loading/Fetching
- ✅ = Success
- ❌ = Error
- ⚠️ = Warning
- 🛒 = Purchase initiated
- 📤 = Sending data
- 📥 = Receiving data

---

## Expected Behavior

### Successful "Buy Now":
```
[Time] 🛒 Initiating purchase: Laptop Pro 15" x1
[Time] 📤 Sending order: {"product_id":1,"product_name":"Laptop Pro 15"...}
[Time] 📥 Response: 200 - {"success":true,"order":{"id":123...}}
[Time] ✅ Order #123 created successfully!
[Time] 🔄 Fetching products from Supabase...
[Time] ✅ Loaded 8 products in 234ms
```

### Failed "Buy Now":
```
[Time] 🛒 Initiating purchase: Laptop Pro 15" x1
[Time] 📤 Sending order: {"product_id":1...}
[Time] 📥 Response: 500 - {"error":"Failed to create order"}
[Time] ❌ Order failed: Failed to create order
```

---

## Quick Test Commands

### Test 1: Direct API Call
Open browser console and run:
```javascript
fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 1,
    product_name: 'Test Product',
    price: 99.99,
    quantity: 1,
    user_id: null
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

### Test 2: Check Products
```javascript
fetch('http://localhost:3000/api/orders')
  .then(r => r.json())
  .then(console.log)
```

---

## Success Indicators

✅ Debug panel shows order creation  
✅ Green notification appears  
✅ Stock count decreases  
✅ Order appears in /orders page  
✅ No red errors in console  
✅ Browser network tab shows 200 OK  

---

## If All Else Fails

### Nuclear Option:
1. Stop the server (Ctrl+C in terminal)
2. Run in Supabase: `NUCLEAR-FIX-RLS.sql`
3. Restart server: `npm run dev`
4. Hard refresh browser (Ctrl+Shift+R)
5. Try again with debug panel open

### Still Not Working?
Check these files for more help:
- `FIXING-ORDERS-GUIDE.md` - Detailed debugging
- `ECOMMERCE-ROADMAP.md` - Feature implementation
- `QUICK-FIX-ORDERS.sql` - Alternative SQL fix

---

## Current Status

🟢 Server: Running on http://localhost:3000  
🟡 Database: Need to run SQL fix  
🔵 Debug Panel: Available (click 🐛)  
📱 Features: All implemented and ready  

**Next Action**: Run `NUCLEAR-FIX-RLS.sql` in Supabase!
