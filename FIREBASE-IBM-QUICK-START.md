# 🎯 Quick Guide: Firebase → IBM Data Prep Kit

## The Problem
Firebase Hosting only supports static sites. Your API routes won't work.

## The Solution
Use Firebase Cloud Functions as backend API for IBM Data Prep Kit.

---

## 🚀 Quick Setup (15 minutes)

### Step 1: Initialize Firebase Functions

```powershell
# In your project directory
firebase init functions

# Select:
# - TypeScript
# - Yes to ESLint
# - Yes to install dependencies
```

### Step 2: Install Supabase in Functions

```powershell
cd functions
npm install @supabase/supabase-js
cd ..
```

### Step 3: Create the IBM Logs Function

Replace `functions/src/index.ts` with this:

```typescript
import * as functions from 'firebase-functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  functions.config().supabase?.url || process.env.SUPABASE_URL || '',
  functions.config().supabase?.key || process.env.SUPABASE_ANON_KEY || ''
);

export const ibmLogs = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const days = parseInt(req.query.days as string || '7');
    const limit = parseInt(req.query.limit as string || '1000');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: logs } = await supabase
      .from('logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: metrics } = await supabase
      .from('metrics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    res.json({
      success: true,
      data: { logs: logs || [], metrics: metrics || [] }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### Step 4: Set Supabase Credentials

```powershell
# Set environment variables
firebase functions:config:set supabase.url="YOUR_SUPABASE_URL"
firebase functions:config:set supabase.key="YOUR_SUPABASE_ANON_KEY"
```

Or for local testing, create `functions/.runtimeconfig.json`:

```json
{
  "supabase": {
    "url": "https://your-project.supabase.co",
    "key": "your-anon-key-here"
  }
}
```

### Step 5: Deploy Function

```powershell
firebase deploy --only functions
```

You'll get a URL like:
```
https://us-central1-your-project.cloudfunctions.net/ibmLogs
```

### Step 6: Test It

```powershell
$url = "https://us-central1-YOUR-PROJECT.cloudfunctions.net/ibmLogs?days=7"
Invoke-RestMethod -Uri $url | ConvertTo-Json
```

---

## 🔗 Connect to IBM Data Prep Kit

### In IBM watsonx.data or Data Prep Kit:

1. **Add New Connection**
   - Type: **HTTP API / REST API**
   - Name: `Cogniview Logs`

2. **Configuration:**
   - URL: `https://us-central1-YOUR-PROJECT.cloudfunctions.net/ibmLogs`
   - Method: `GET`
   - Query Parameters:
     - `days`: `30` (get last 30 days)
     - `limit`: `5000` (max 5000 records)

3. **Data Mapping:**
   - Response format: JSON
   - Data path: `data.logs` (for logs)
   - Or: `data.metrics` (for metrics)

4. **Test Connection** → Should return your data! ✅

---

## 📊 Example IBM Data Prep Kit Setup

```
Source: HTTP API
├─ URL: https://us-central1-YOUR-PROJECT.cloudfunctions.net/ibmLogs?days=30&limit=5000
├─ Method: GET
├─ Headers: None needed (CORS enabled)
└─ Response: JSON

Data Extract:
├─ Path: data.logs
└─ Fields: id, event_name, severity, message, created_at, metadata

Transformations:
├─ Parse JSON (metadata column)
├─ Normalize severity levels
├─ Extract timestamp components
├─ Remove duplicates
└─ Calculate metrics

Output:
└─ Send to watsonx.ai for AI analysis
```

---

## 🎯 What You Get

**Your Firebase Function provides:**
- ✅ Live data from Supabase
- ✅ Logs and metrics combined
- ✅ Filtering by date range
- ✅ Customizable limit
- ✅ CORS enabled for IBM tools
- ✅ Fast and scalable

**IBM Data Prep Kit gets:**
- ✅ Clean JSON data
- ✅ Real-time updates
- ✅ Ready for AI analysis
- ✅ No manual exports needed

---

## 💰 Costs

**Firebase Free Tier:**
- 125,000 function invocations/month FREE
- 40,000 GB-seconds compute time FREE
- Plenty for hackathons and demos!

**If you exceed free tier:**
- $0.40 per million invocations (super cheap!)

---

## 🔧 Troubleshooting

### Function not deploying?
```powershell
# Check logs
firebase functions:log

# Redeploy
firebase deploy --only functions:ibmLogs --force
```

### CORS errors?
Make sure this is in your function:
```typescript
res.set('Access-Control-Allow-Origin', '*');
```

### Empty response?
Check Supabase credentials:
```powershell
firebase functions:config:get
```

---

## 📝 Complete Commands

```powershell
# 1. Initialize functions
firebase init functions

# 2. Install dependencies
cd functions
npm install @supabase/supabase-js
cd ..

# 3. Create function (copy code above)

# 4. Set config
firebase functions:config:set supabase.url="YOUR_URL"
firebase functions:config:set supabase.key="YOUR_KEY"

# 5. Deploy
firebase deploy --only functions

# 6. Test
Invoke-RestMethod -Uri "YOUR_FUNCTION_URL?days=7"

# 7. Use in IBM Data Prep Kit!
```

---

## ✅ Summary

1. **Firebase Function** = Your backend API
2. **Supabase** = Your database (already set up)
3. **IBM Data Prep Kit** = Connects to Firebase Function URL
4. **watsonx.ai** = AI analysis on cleaned data

**That's it!** Simple, free, and powerful. 🚀

---

Need help? Check `FIREBASE-DEPLOYMENT-GUIDE.md` for detailed steps!
