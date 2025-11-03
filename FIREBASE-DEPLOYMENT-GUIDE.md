# 🔥 Firebase Hosting + IBM Data Prep Kit Integration

## Complete Setup Guide

---

## Part 1: Deploy Next.js App to Firebase Hosting

### Step 1: Install Firebase CLI

```powershell
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Verify login
firebase projects:list
```

### Step 2: Initialize Firebase in Your Project

```powershell
# Navigate to your project
cd "d:\test for cogniview"

# Initialize Firebase
firebase init

# Select these options:
# ✓ Hosting: Configure files for Firebase Hosting
# ✓ Use existing project (select your Firebase project)
# 
# What do you want to use as your public directory? → out
# Configure as single-page app? → Yes
# Set up automatic builds with GitHub? → No (for now)
```

### Step 3: Configure Firebase for Next.js

Firebase requires static export. Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Enable static export for Firebase
  images: {
    unoptimized: true, // Required for static export
  },
  // Disable API routes for static export
  trailingSlash: true,
}

module.exports = nextConfig
```

### Step 4: Build and Deploy

```powershell
# Build static export
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

**Your app will be live at:** `https://your-project.firebaseapp.com`

---

## ⚠️ Important: API Routes Won't Work on Firebase Hosting

Firebase Hosting only supports static sites. Your API routes (`/api/orders`, `/api/ibm-logs`) won't work.

**Solution:** Use Firebase Cloud Functions for backend!

---

## Part 2: Migrate API Routes to Firebase Cloud Functions

### Step 1: Initialize Firebase Functions

```powershell
# Initialize functions
firebase init functions

# Select:
# ✓ Use existing project
# ✓ Language: TypeScript
# ✓ ESLint: Yes
# ✓ Install dependencies: Yes
```

### Step 2: Create Functions Structure

```powershell
# Your project structure will be:
# d:\test for cogniview\
#   ├── functions/
#   │   ├── src/
#   │   │   └── index.ts
#   │   ├── package.json
#   │   └── tsconfig.json
#   ├── out/              # Next.js build output
#   └── firebase.json
```

### Step 3: Create IBM Logs API Function

Create `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
)

// IBM Data Prep Kit API - Fetch Logs and Metrics
export const ibmLogs = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Get query parameters
    const days = parseInt(req.query.days as string || '7', 10)
    const limit = parseInt(req.query.limit as string || '1000', 10)
    const eventType = req.query.event_type as string || null
    const severity = req.query.severity as string || null

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    console.log(`Fetching logs: days=${days}, limit=${limit}`)

    // Build logs query
    let logsQuery = supabase
      .from('logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (eventType) logsQuery = logsQuery.eq('event_type', eventType)
    if (severity) logsQuery = logsQuery.eq('severity', severity)

    // Fetch logs
    const { data: logs, error: logsError } = await logsQuery
    if (logsError) throw logsError

    // Fetch metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (metricsError) throw metricsError

    // Calculate statistics
    const errorCount = logs?.filter(log => log.severity === 'error').length || 0
    const warningCount = logs?.filter(log => log.severity === 'warning').length || 0
    const infoCount = logs?.filter(log => log.severity === 'info').length || 0

    const eventTypeCounts = logs?.reduce((acc: Record<string, number>, log) => {
      acc[log.event_type] = (acc[log.event_type] || 0) + 1
      return acc
    }, {}) || {}

    const metricStats = metrics?.reduce((acc: Record<string, any>, metric) => {
      if (!acc[metric.metric_name]) {
        acc[metric.metric_name] = { count: 0, sum: 0, avg: 0 }
      }
      acc[metric.metric_name].count++
      acc[metric.metric_name].sum += parseFloat(metric.metric_value)
      acc[metric.metric_name].avg = acc[metric.metric_name].sum / acc[metric.metric_name].count
      return acc
    }, {}) || {}

    // Return response
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      query: {
        days_requested: days,
        limit_requested: limit,
        filters: { event_type: eventType, severity: severity },
        date_range: {
          start: startDate.toISOString(),
          end: new Date().toISOString()
        }
      },
      summary: {
        total_logs: logs?.length || 0,
        total_metrics: metrics?.length || 0,
        severity_distribution: {
          error: errorCount,
          warning: warningCount,
          info: infoCount,
          error_rate_percent: logs?.length ? (errorCount / logs.length * 100).toFixed(2) : '0.00'
        },
        event_type_distribution: eventTypeCounts,
        metric_statistics: metricStats
      },
      data: {
        logs: logs || [],
        metrics: metrics || []
      }
    })

  } catch (error: any) {
    console.error('Error fetching logs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs and metrics',
      message: error.message
    })
  }
})

// Orders API
export const createOrder = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const orderData = req.body

    // Insert order into Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single()

    if (error) throw error

    res.status(200).json({
      success: true,
      order: data
    })

  } catch (error: any) {
    console.error('Error creating order:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})
```

### Step 4: Install Dependencies in Functions

```powershell
cd functions

# Install required packages
npm install @supabase/supabase-js
npm install firebase-functions@latest
npm install firebase-admin@latest

cd ..
```

### Step 5: Set Environment Variables

```powershell
# Set Supabase credentials in Firebase
firebase functions:config:set supabase.url="YOUR_SUPABASE_URL"
firebase functions:config:set supabase.key="YOUR_SUPABASE_ANON_KEY"

# View config
firebase functions:config:get
```

For local development, create `functions/.runtimeconfig.json`:

```json
{
  "supabase": {
    "url": "https://your-project.supabase.co",
    "key": "your-anon-key"
  }
}
```

### Step 6: Deploy Functions

```powershell
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:ibmLogs
```

**Your functions will be live at:**
- `https://us-central1-your-project.cloudfunctions.net/ibmLogs`
- `https://us-central1-your-project.cloudfunctions.net/createOrder`

---

## Part 3: Update Frontend to Use Firebase Functions

Since we're using static export, we need to hardcode the Firebase Function URLs.

Create `.env.production`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=https://us-central1-your-project.cloudfunctions.net
```

Update `src/app/checkout/page.tsx`:

```typescript
// Replace API calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

// When creating order:
const response = await fetch(`${API_BASE_URL}/createOrder`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
})
```

---

## Part 4: Connect to IBM Data Prep Kit

### Option A: Use Firebase Function URL Directly

Your IBM Data Prep Kit endpoint is now:
```
https://us-central1-your-project.cloudfunctions.net/ibmLogs?days=30&limit=5000
```

**In IBM Data Prep Kit:**
1. Add HTTP Data Source
2. URL: Your Firebase Function URL above
3. Method: GET
4. Format: JSON
5. Path to data: `data.logs` or `data.metrics`

### Option B: Use Scheduled Function to Push Data

Create auto-sync from Firebase to IBM every hour:

```typescript
// In functions/src/index.ts
import * as functions from 'firebase-functions'

export const syncToIBM = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    // Fetch logs from Supabase
    const { data: logs } = await supabase
      .from('logs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())

    // Send to IBM Data Prep Kit API
    await fetch('YOUR_IBM_DATA_PREP_KIT_ENDPOINT', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs })
    })

    console.log('Synced', logs?.length, 'logs to IBM')
  })
```

Deploy:
```powershell
firebase deploy --only functions:syncToIBM
```

---

## Part 5: Complete Firebase Deployment Script

Create `deploy-firebase.ps1`:

```powershell
# Firebase Deployment Script

Write-Host "🔥 Starting Firebase Deployment..." -ForegroundColor Cyan

# 1. Clean previous builds
Write-Host "🧹 Cleaning old builds..." -ForegroundColor Yellow
Remove-Item -Path "out" -Recurse -ErrorAction SilentlyContinue
Remove-Item -Path ".next" -Recurse -ErrorAction SilentlyContinue

# 2. Build Next.js app
Write-Host "🏗️  Building Next.js app..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# 3. Deploy functions
Write-Host "☁️  Deploying Firebase Functions..." -ForegroundColor Yellow
firebase deploy --only functions

# 4. Deploy hosting
Write-Host "🌐 Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Your app: https://your-project.firebaseapp.com" -ForegroundColor Cyan
Write-Host "🔗 IBM Logs API: https://us-central1-your-project.cloudfunctions.net/ibmLogs" -ForegroundColor Cyan
```

Run it:
```powershell
.\deploy-firebase.ps1
```

---

## Part 6: Firebase + IBM Data Prep Kit Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Users / Browsers                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│          Firebase Hosting (Static Next.js)               │
│                your-app.firebaseapp.com                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Firebase Cloud Functions                    │
│   ├─ ibmLogs()      → Returns logs + metrics            │
│   ├─ createOrder()  → Creates orders                    │
│   └─ syncToIBM()    → Auto-sync (hourly)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL                         │
│   ├─ logs table                                          │
│   ├─ metrics table                                       │
│   ├─ orders table                                        │
│   └─ products table                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│            IBM Data Prep Kit                             │
│   ├─ HTTP Connector → Firebase Function                 │
│   ├─ Data Cleaning Pipeline                             │
│   └─ Output → watsonx.ai                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Part 7: Test Everything

### Test 1: Firebase Hosting

```powershell
# Visit your app
Start-Process "https://your-project.firebaseapp.com"
```

### Test 2: Firebase Function (IBM Logs API)

```powershell
# Test the function
$url = "https://us-central1-your-project.cloudfunctions.net/ibmLogs?days=7"
Invoke-RestMethod -Uri $url | ConvertTo-Json -Depth 3
```

### Test 3: IBM Data Prep Kit Connection

1. Go to IBM Data Prep Kit
2. Add HTTP Data Source
3. URL: Your Firebase Function URL
4. Click "Test Connection"
5. Should return logs and metrics ✅

---

## Part 8: Monitoring & Logs

### View Firebase Function Logs

```powershell
# Stream logs in real-time
firebase functions:log --only ibmLogs

# Or view in Firebase Console
Start-Process "https://console.firebase.google.com/project/your-project/functions"
```

### View Function Performance

Go to Firebase Console → Functions → Click function name → View metrics:
- Invocations per second
- Execution time
- Memory usage
- Error rate

---

## Part 9: Costs (Firebase Free Tier)

**Spark Plan (FREE):**
- ✅ Hosting: 10 GB storage, 360 MB/day transfer
- ✅ Functions: 125K invocations/month, 40K GB-seconds
- ✅ Real-time data: 1 GB stored, 10 GB/month downloaded

**Blaze Plan (Pay-as-you-go):**
- Only pay for what you use beyond free tier
- Functions: $0.40 per million invocations
- Very cheap for small projects

---

## Part 10: Alternative - Hybrid Approach

Keep local dev, use Firebase only for IBM integration:

```typescript
// In your Next.js app
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://us-central1-your-project.cloudfunctions.net'
  : 'http://localhost:3001/api'

// Use local API in dev, Firebase Functions in production
```

This way:
- ✅ Local development unchanged
- ✅ Production uses Firebase
- ✅ IBM Data Prep Kit connects to Firebase Function

---

## 🎯 Quick Start Commands

```powershell
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Initialize (select Hosting + Functions)
firebase init

# 4. Update next.config.js (add output: 'export')

# 5. Build and deploy
npm run build
firebase deploy

# 6. Get your URLs
firebase hosting:channel:list
firebase functions:list
```

---

## 📚 Resources

- Firebase Docs: https://firebase.google.com/docs
- Firebase Functions: https://firebase.google.com/docs/functions
- Next.js Static Export: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- IBM Data Prep Kit: https://github.com/IBM/data-prep-kit

---

## ✅ Summary

1. **Firebase Hosting** - Hosts your Next.js static site
2. **Firebase Functions** - Backend API (ibmLogs, createOrder)
3. **Supabase** - Database (already set up)
4. **IBM Data Prep Kit** - Connects to Firebase Function URL

**IBM Data Prep Kit Endpoint:**
```
https://us-central1-YOUR-PROJECT.cloudfunctions.net/ibmLogs?days=30&limit=5000
```

Use this URL in IBM Data Prep Kit's HTTP connector! 🚀

---

Ready to deploy? Let me know if you need help with any step!
