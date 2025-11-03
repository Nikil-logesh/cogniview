# 🎯 QUICK START GUIDE - Cogniview Store

## ✅ Current Status: RUNNING!

Your application is now running at **http://localhost:3000**

## 🚀 What You Can Do Right Now

### 1. **Create Your First Account** (30 seconds)
1. Visit http://localhost:3000
2. Click **"Sign Up"** in the header
3. Enter:
   - Full Name: (optional)
   - Email: test@example.com
   - Password: password123
4. Click **"Sign Up"**
5. You'll be redirected to login page
6. Sign in with your credentials

### 2. **Make Your First Purchase** (1 minute)
1. After signing in, you'll see 8 products
2. Click **"Buy Now"** on any product
3. ✅ Success! Order placed
4. Watch the stock decrease automatically
5. **Every action is being logged!**

### 3. **View the Monitoring Dashboard** (2 minutes)
1. Click **"📊 Monitor"** in the header
2. See all your telemetry data:
   - **Event Logs Tab**: Every action tracked
   - **Metrics Tab**: Performance measurements
   - **IBM Cleaned Data Tab**: Processed logs
3. Try the action buttons:
   - 🚨 Simulate Server Error
   - ⚠️ Simulate High Latency
   - 🧹 Clean Data with IBM Kit
4. Watch data update in real-time!

## 📊 What's Being Tracked Automatically

✅ Page views
✅ Login/signup attempts (success & failure)  
✅ Product fetch latency
✅ Purchase attempts & completions
✅ Stock updates
✅ API response times
✅ Client-side errors with stack traces
✅ User-specific telemetry

## 🧹 Testing IBM Data Prep Kit Integration

### Local Simulation Mode (Active Now)

Since you haven't configured IBM API credentials yet, the app is running in **local simulation mode**:

1. Go to `/monitor`
2. Click **"🧹 Clean Data with IBM Kit"**
3. Wait 2-3 seconds
4. Click **"IBM Cleaned Data"** tab
5. See your logs cleaned, categorized, and tagged!

### Example Output:
```
Category: user_activity
Event: Purchase Completed
Tags: [user, success, e-commerce]
Confidence: 95%
Message: "Order #123 placed for Wireless Headphones, user: test@example.com"
```

## 🗄️ Database Structure

Your Supabase now has these tables:

| Table | Purpose | Records |
|-------|---------|---------|
| `products` | Product catalog | 8 products |
| `orders` | Purchase history | Your orders |
| `logs` | All telemetry events | Growing! |
| `metrics` | Performance data | API latencies |
| `cleaned_logs` | IBM processed | After cleaning |
| `user_profiles` | User info | Your account |

## 🎨 UI Features

### Modern Design
- ✨ Gradient backgrounds
- 🎯 Tailwind CSS styling
- 📱 Fully responsive
- 🔄 Loading states
- ⚡ Real-time updates

### Authentication
- 🔐 Secure Supabase Auth
- 👤 User profiles with roles
- 🚪 Sign in/out functionality
- 🎭 Admin role support (set in database)

## 📈 Next Steps

### 1. Explore the Monitoring Dashboard
```
http://localhost:3000/monitor
```
- View all telemetry data
- Simulate incidents
- Clean data with IBM Kit
- Export logs for analysis

### 2. Check Your Supabase Dashboard
```
https://supabase.com/dashboard
```
- View all tables
- Check logs table growing
- See user profiles
- Query cleaned data

### 3. (Optional) Configure IBM Data Prep Kit

When you want to use the actual IBM API:

1. Get IBM Cloud account
2. Create Data Prep Kit API key
3. Update `.env.local`:
```env
IBM_DATA_PREP_KIT_API_KEY=your_real_key_here
IBM_DATA_PREP_KIT_ENDPOINT=https://api.dataplatform.cloud.ibm.com/v2/data_intg/cleanup
```
4. Restart server: `Ctrl+C` then `npm run dev`
5. App will automatically use IBM API!

### 4. Export Data for AI Analysis

**Query in Supabase SQL Editor:**
```sql
-- Get all high-confidence incidents
SELECT * FROM cleaned_logs 
WHERE category = 'incident_alert' 
AND confidence_score > 0.85
ORDER BY processed_at DESC;

-- Get performance metrics summary
SELECT metric_name, 
       AVG(metric_value) as avg_value,
       COUNT(*) as count
FROM metrics
GROUP BY metric_name
ORDER BY avg_value DESC;
```

**Export via API:**
```typescript
const { data } = await supabase
  .from('cleaned_logs')
  .select('*')
  .order('confidence_score', { ascending: false })
```

## 🎯 Demo Scenario

**Perfect for showing off your project:**

1. **Open two browsers** (Chrome + Edge)
2. **Browser 1**: Sign in as `admin@test.com`
3. **Browser 2**: Sign in as `customer@test.com`
4. **Customer**: Browse and buy products
5. **Admin**: Watch Monitor dashboard update live
6. **Admin**: Click "Simulate Server Error"
7. **Admin**: Click "Clean Data with IBM Kit"
8. **Show**: IBM Cleaned Data tab with categorized logs
9. **Explain**: This data is ready for AI/ML training

## 🔧 Troubleshooting

### Can't sign in?
- Make sure you signed up first
- Check email is correct
- Password must be 6+ characters
- Try the browser console (F12) for errors

### No telemetry data showing?
- Use the app first (browse, buy products)
- Click "Refresh Data" in monitor
- Check Supabase logs table directly

### Styles look weird?
- Tailwind installed? Run `npm install`
- Clear cache: Delete `.next` folder
- Restart server

## 📱 Responsive Testing

Try the app on different screen sizes:
- Desktop: Full experience
- Tablet: Touch-friendly
- Mobile: Optimized layout

## 🎉 Success Metrics

Your app is working if you see:

✅ Home page loads with products  
✅ Can sign up and sign in  
✅ Header shows "Welcome, [email]"  
✅ Buy button works and stock decreases  
✅ Monitor page shows logs and metrics  
✅ IBM cleaning button processes data  
✅ Real-time updates in monitor  

## 💬 Key Features to Highlight

**For Your Presentation/Demo:**

1. **Real-Time Telemetry**: Every click tracked
2. **IBM Integration**: Production-ready API + local sim
3. **AI-Ready Data**: Cleaned, categorized, tagged logs
4. **User Authentication**: Secure Supabase Auth
5. **Performance Monitoring**: Latency & error tracking
6. **Incident Simulation**: Test pipeline end-to-end
7. **Export Capability**: Ready for Granite LLM/RAG
8. **Modern Stack**: Next.js 14 + TypeScript + Tailwind

## 🌟 The Big Picture

```
User Action → Telemetry Hook → Supabase Database
                                      ↓
                               IBM Data Prep Kit
                                      ↓
                           Cleaned & Categorized Data
                                      ↓
                         AI/ML Ready for watsonx.ai
                                      ↓
                              Granite LLM + RAG
                                      ↓
                        Intelligent Insights & Alerts
```

## 📚 Files Created

- ✅ 20+ TypeScript/React files
- ✅ Authentication pages (login, signup)
- ✅ Monitoring dashboard
- ✅ Telemetry hooks
- ✅ API routes (orders, clean-data)
- ✅ Database schema SQL
- ✅ Tailwind config
- ✅ Comprehensive README

## 🎊 You're Ready!

Your **Cogniview Store** is fully operational with:

- E-commerce functionality ✅
- User authentication ✅
- Real-time telemetry ✅
- IBM Data Prep Kit integration ✅
- Visual monitoring dashboard ✅
- AI-ready data export ✅

**Now go create some telemetry data and watch the magic happen!** 🚀

---

Need help? Check `README-COGNIVIEW.md` for detailed documentation.
