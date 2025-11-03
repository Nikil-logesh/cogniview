# 🚀 IBM Data Prep Kit - FREE Setup (No COS Required)

## Overview: Cost-Free Data Pipeline

```
Next.js App (localhost:3001)
        ↓
Supabase PostgreSQL (already connected)
        ↓
IBM Data Prep Kit (PostgreSQL connector - FREE)
        ↓
Cleaned Data → watsonx.ai / Granite LLM Analysis
```

**No paid services needed!** Everything runs on free tiers.

---

## ✅ What You Already Have

- ✅ Next.js app logging to Supabase
- ✅ `logs` table with telemetry data
- ✅ `metrics` table with performance data
- ✅ Supabase credentials (in `.env.local`)

---

## 🔗 Part 1: Expose Supabase via API (Optional)

If IBM Data Prep Kit can't connect directly to Supabase PostgreSQL, create a REST API endpoint.

### Create API endpoint to fetch logs

Already done! Your app has this at `/api/clean-data/route.ts`

Test it:
```bash
curl http://localhost:3001/api/clean-data
```

---

## 🧠 Part 2: Connect IBM Data Prep Kit to Supabase

### Step 1: Get Supabase Database Credentials

Go to your Supabase project → **Settings** → **Database**

You'll need:
- **Host**: `db.your-project-ref.supabase.co`
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: Your database password
- **Connection String**: Available in Settings → Database

### Step 2: Set Up IBM Data Prep Kit

#### Option A: Use IBM watsonx.data (Free Tier)

1. Go to https://www.ibm.com/products/watsonx-data
2. Sign up for free trial
3. Create new project
4. Add **PostgreSQL Connection**:
   - Name: `supabase-cogniview`
   - Host: Your Supabase host
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: Your password
   - SSL: `require`

#### Option B: Use Local Data Prep Kit (Docker)

Run Data Prep Kit locally with Docker:

```bash
# Pull IBM Data Prep Kit container
docker pull quay.io/dataprep1/data-prep-kit:latest

# Run it
docker run -p 8080:8080 quay.io/dataprep1/data-prep-kit:latest
```

Access at: http://localhost:8080

### Step 3: Create Data Pipeline in Data Prep Kit

1. **Add Data Source**
   - Type: PostgreSQL
   - Connection: Your Supabase credentials
   - Query: 
     ```sql
     SELECT 
       id, 
       user_id, 
       event_name, 
       event_type, 
       severity, 
       message, 
       metadata, 
       created_at 
     FROM logs 
     WHERE created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC
     ```

2. **Add Transformations**
   - Remove duplicates
   - Parse JSON in `metadata` column
   - Normalize severity levels
   - Extract timestamps
   - Filter out noise

3. **Output**
   - Format: CSV or JSON
   - Destination: Download or API endpoint

---

## 📊 Part 3: Alternative - Simple HTTP API Approach

If you can't connect PostgreSQL directly, use the HTTP API approach:

### Create a public logs endpoint

Create `src/app/api/ibm-logs/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '1000')

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch logs from Supabase
    const { data: logs, error } = await supabase
      .from('logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    // Fetch metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (metricsError) {
      throw metricsError
    }

    // Return combined data
    return NextResponse.json({
      success: true,
      count: logs.length + metrics.length,
      data: {
        logs,
        metrics
      },
      metadata: {
        days_requested: days,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching logs for IBM:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
```

### Deploy and Use

1. Deploy your app (Vercel/Netlify/IBM Cloud)
2. Your endpoint: `https://your-app.com/api/ibm-logs?days=7&limit=1000`

3. In IBM Data Prep Kit:
   - Add **HTTP Data Source**
   - URL: Your endpoint above
   - Method: GET
   - Format: JSON
   - Authentication: Add API key if needed

---

## 🎯 Part 4: Data Cleaning Rules

Configure these transformations in Data Prep Kit:

### 1. Parse JSON Metadata
Extract fields from `metadata` column:
- `product_id`
- `product_name`
- `quantity`
- `duration`
- `context`

### 2. Normalize Severity
Map severity levels:
- `info` → `INFO`
- `warning`, `warn` → `WARNING`
- `error`, `critical` → `ERROR`

### 3. Deduplicate
Remove exact duplicates based on:
- `event_name` + `user_id` + `created_at` (within 1 second)

### 4. Calculate Metrics
Add computed columns:
- `response_time_ms` (from metadata)
- `is_error` (boolean)
- `hour_of_day` (from timestamp)
- `day_of_week` (from timestamp)

### 5. Filter Noise
Remove events:
- System health checks
- Automated monitoring pings
- Events with severity < WARNING

---

## 🧪 Part 5: Test the Pipeline

### Test 1: Generate Sample Data

Run this in your Next.js app:

```bash
# Visit these pages to generate logs
curl http://localhost:3001/
curl http://localhost:3001/checkout
curl http://localhost:3001/api/orders -X POST -H "Content-Type: application/json" -d '{"product_id":1,"quantity":1}'
```

### Test 2: Verify Data in Supabase

```sql
-- Check logs table
SELECT COUNT(*), event_type, severity 
FROM logs 
GROUP BY event_type, severity;

-- Check metrics table
SELECT metric_name, AVG(metric_value) as avg_value 
FROM metrics 
GROUP BY metric_name;
```

### Test 3: Fetch via API

```bash
curl http://localhost:3001/api/ibm-logs?days=1
```

---

## 🌟 Part 6: Connect to watsonx.ai for Analysis

Once data is cleaned in Data Prep Kit:

### Option 1: Export CSV and Upload
1. Download cleaned dataset from Data Prep Kit
2. Upload to watsonx.ai Jupyter Notebook
3. Run analysis with Granite models

### Option 2: Direct API Integration
1. Export cleaned data to public URL
2. In watsonx.ai, fetch data via HTTP
3. Run real-time analysis

### Example Analysis Queries for Granite:

```python
# In watsonx.ai notebook
import pandas as pd

# Load cleaned data
df = pd.read_csv('cleaned_logs.csv')

# Analyze error patterns
error_logs = df[df['severity'] == 'ERROR']
print(f"Error rate: {len(error_logs)/len(df)*100:.2f}%")

# Top error messages
top_errors = error_logs['message'].value_counts().head(10)

# Ask Granite LLM to analyze
prompt = f"""
Analyze these top 10 error messages and suggest fixes:
{top_errors.to_string()}

Provide:
1. Root cause analysis
2. Priority ranking (critical/medium/low)
3. Recommended fixes
"""

# Call Granite model via watsonx.ai API
response = watsonx_model.generate(prompt)
```

---

## 📋 Quick Setup Checklist

- [ ] Supabase database credentials ready
- [ ] `.env.local` has correct Supabase keys
- [ ] App is generating logs (test by using the app)
- [ ] API endpoint `/api/ibm-logs` is working
- [ ] IBM Data Prep Kit account created (free trial)
- [ ] PostgreSQL or HTTP connection configured
- [ ] Data pipeline created with cleaning rules
- [ ] Test data flowing through pipeline
- [ ] Export cleaned data
- [ ] Connect to watsonx.ai for analysis

---

## 🎉 Benefits of This Approach

✅ **100% Free** - No paid IBM COS
✅ **No Complex Setup** - Uses existing Supabase
✅ **Real Data** - Actual logs from your app
✅ **Live Updates** - Real-time data flow
✅ **Scalable** - Works for demos and production
✅ **Hackathon-Ready** - Quick to demonstrate

---

## 🔧 Troubleshooting

### Can't connect PostgreSQL directly?
→ Use HTTP API approach (Part 3)

### No data showing up?
→ Check logs table in Supabase: `SELECT * FROM logs LIMIT 10;`

### Need more logs for demo?
→ Use the app! Browse products, checkout, create orders

### Want fake data?
→ Run the data generation script (see next section)

---

## 🎲 Bonus: Generate Demo Data

Want lots of logs for your demo? Run this:

```sql
-- In Supabase SQL Editor
INSERT INTO logs (event_name, event_type, severity, message, metadata)
SELECT 
  (ARRAY['page_view', 'purchase', 'search', 'cart_add', 'error'])[floor(random() * 5 + 1)],
  'user',
  (ARRAY['info', 'warning', 'error'])[floor(random() * 3 + 1)],
  'Sample event ' || generate_series,
  ('{"product_id": ' || floor(random() * 10 + 1) || '}')::jsonb
FROM generate_series(1, 1000);
```

This creates 1000 sample log entries instantly! 🚀

---

## 📚 Resources

- IBM Data Prep Kit: https://github.com/IBM/data-prep-kit
- watsonx.ai Docs: https://www.ibm.com/docs/en/watsonx-as-a-service
- Supabase PostgreSQL: https://supabase.com/docs/guides/database
- Your GitHub Repo: https://github.com/Nikil-logesh/cogniview

---

**Ready to go!** No IBM COS needed. Everything runs on free tiers. 🎉
