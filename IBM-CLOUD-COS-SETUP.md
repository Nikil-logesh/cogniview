# 🚀 IBM CLOUD DEPLOYMENT & COS INTEGRATION GUIDE

## Overview: Complete IBM Cloud Setup

This guide covers:
1. ✅ Deploy Next.js app to IBM Cloud
2. ✅ Connect to IBM Cloud Object Storage (COS)
3. ✅ Stream logs & metrics to COS
4. ✅ Clean data with IBM Data Prep Kit

---

## PART 1: IBM Cloud Deployment

### Prerequisites
- IBM Cloud account (https://cloud.ibm.com/registration)
- IBM CLI installed
- Git repository of your project

### Option A: Deploy with IBM Cloud Foundry

#### Step 1: Install IBM Cloud CLI

**Windows (PowerShell):**
```powershell
# Download and install from:
# https://cloud.ibm.com/docs/cli?topic=cli-install-ibmcloud-cli

# Verify installation
ibmcloud --version
```

#### Step 2: Login to IBM Cloud

```bash
ibmcloud login

# Or with API key
ibmcloud login --apikey YOUR_API_KEY -r us-south

# Target Cloud Foundry org & space
ibmcloud target --cf
```

#### Step 3: Prepare manifest.yml

Create `manifest.yml` in project root:

```yaml
---
applications:
- name: cogniview-store
  memory: 512M
  instances: 1
  buildpacks:
    - nodejs_buildpack
  command: npm start
  env:
    NODE_ENV: production
    NEXT_PUBLIC_SUPABASE_URL: https://your-project.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY: your_anon_key_here
    IBM_DATA_PREP_KIT_API_KEY: your_ibm_key
    IBM_DATA_PREP_KIT_ENDPOINT: your_ibm_endpoint
    IBM_COS_ENDPOINT: https://s3.us-south.cloud-object-storage.appdomain.cloud
    IBM_COS_API_KEY: your_cos_api_key
    IBM_COS_INSTANCE_ID: your_cos_instance_id
    IBM_COS_BUCKET_NAME: cogniview-logs
```

#### Step 4: Build and Deploy

```bash
# Build Next.js app
npm run build

# Deploy to IBM Cloud
ibmcloud cf push
```

Your app will be available at: `https://cogniview-store.mybluemix.net`

---

### Option B: Deploy with IBM Code Engine (Recommended)

Code Engine is IBM's serverless container platform - better for Next.js apps.

#### Step 1: Create Code Engine Project

```bash
# Install Code Engine plugin
ibmcloud plugin install code-engine

# Create project
ibmcloud ce project create --name cogniview-store

# Select the project
ibmcloud ce project select --name cogniview-store
```

#### Step 2: Build Container Image

Create `Dockerfile` in project root:

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
}

module.exports = nextConfig
```

#### Step 3: Build & Deploy Container

```bash
# Build and push to IBM Container Registry
ibmcloud ce build create --name cogniview-build \
  --source . \
  --strategy dockerfile \
  --size medium

# Create application from build
ibmcloud ce app create --name cogniview-store \
  --build-source cogniview-build \
  --port 3000 \
  --env NEXT_PUBLIC_SUPABASE_URL=your_url \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

Get your app URL:
```bash
ibmcloud ce app get --name cogniview-store
```

---

## PART 2: IBM Cloud Object Storage (COS) Setup

### Step 1: Create COS Instance

**Via IBM Cloud Console:**
1. Go to https://cloud.ibm.com/catalog
2. Search for "Object Storage"
3. Click "Cloud Object Storage"
4. Choose "Lite" plan (free) or "Standard"
5. Click "Create"

**Via CLI:**
```bash
# Create COS instance
ibmcloud resource service-instance-create cogniview-cos \
  cloud-object-storage lite us-south

# Get instance ID
ibmcloud resource service-instance cogniview-cos --output json
```

### Step 2: Create Storage Bucket

```bash
# List COS instances
ibmcloud resource service-instances --service-name cloud-object-storage

# Create bucket
ibmcloud cos bucket-create --bucket cogniview-logs \
  --ibm-service-instance-id YOUR_INSTANCE_ID \
  --region us-south
```

### Step 3: Create Service Credentials

**Via Console:**
1. Go to your COS instance
2. Click "Service credentials" → "New credential"
3. Name: `cogniview-store-key`
4. Role: Writer
5. Click "Add"
6. View credentials → Copy `apikey` and `resource_instance_id`

**Via CLI:**
```bash
# Create credentials
ibmcloud resource service-key-create cogniview-cos-key Writer \
  --instance-name cogniview-cos

# View credentials
ibmcloud resource service-key cogniview-cos-key --output json
```

Save these values:
- `apikey`: Your COS API key
- `resource_instance_id`: Your COS instance ID
- `endpoints`: Use public endpoint for your region

---

## PART 3: Integrate COS with Your App

### Step 1: Install IBM COS SDK

```bash
npm install ibm-cos-sdk
```

### Step 2: Create COS Client

Create `src/lib/ibm-cos.ts`:

```typescript
import * as AWS from 'ibm-cos-sdk';

const config = {
  endpoint: process.env.IBM_COS_ENDPOINT || 's3.us-south.cloud-object-storage.appdomain.cloud',
  apiKeyId: process.env.IBM_COS_API_KEY,
  serviceInstanceId: process.env.IBM_COS_INSTANCE_ID,
};

const cos = new AWS.S3(config);

export default cos;

// Helper function to upload logs
export async function uploadLogsToCOS(data: any, filename: string) {
  const bucketName = process.env.IBM_COS_BUCKET_NAME || 'cogniview-logs';
  
  const params = {
    Bucket: bucketName,
    Key: filename,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  };

  try {
    const result = await cos.putObject(params).promise();
    console.log(`✅ Uploaded to COS: ${filename}`);
    return result;
  } catch (error) {
    console.error('❌ COS upload failed:', error);
    throw error;
  }
}

// Helper function to read logs from COS
export async function readLogsFromCOS(filename: string) {
  const bucketName = process.env.IBM_COS_BUCKET_NAME || 'cogniview-logs';
  
  const params = {
    Bucket: bucketName,
    Key: filename,
  };

  try {
    const result = await cos.getObject(params).promise();
    return JSON.parse(result.Body?.toString('utf-8') || '{}');
  } catch (error) {
    console.error('❌ COS read failed:', error);
    throw error;
  }
}

// Helper function to list all logs in bucket
export async function listLogsInCOS(prefix: string = '') {
  const bucketName = process.env.IBM_COS_BUCKET_NAME || 'cogniview-logs';
  
  const params = {
    Bucket: bucketName,
    Prefix: prefix,
  };

  try {
    const result = await cos.listObjectsV2(params).promise();
    return result.Contents || [];
  } catch (error) {
    console.error('❌ COS list failed:', error);
    throw error;
  }
}
```

### Step 3: Create API Route to Export Logs to COS

Create `src/app/api/export-to-cos/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { uploadLogsToCOS } from '@/lib/ibm-cos'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    // Fetch recent logs from Supabase
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (logsError) throw logsError

    // Fetch recent metrics from Supabase
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (metricsError) throw metricsError

    // Prepare data for export
    const exportData = {
      exported_at: new Date().toISOString(),
      logs_count: logs?.length || 0,
      metrics_count: metrics?.length || 0,
      logs: logs || [],
      metrics: metrics || [],
    }

    // Generate filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const filename = `telemetry-export-${timestamp}.json`

    // Upload to IBM COS
    await uploadLogsToCOS(exportData, filename)

    return NextResponse.json({
      success: true,
      filename,
      logs_count: logs?.length || 0,
      metrics_count: metrics?.length || 0,
      message: 'Data successfully exported to IBM Cloud Object Storage',
    })
  } catch (error) {
    console.error('Export to COS failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to export to COS', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
```

### Step 4: Add Export Button to Monitor Page

Update `src/app/monitor/page.tsx` - add this button to the Actions section:

```tsx
<button
  onClick={async () => {
    try {
      const response = await fetch('/api/export-to-cos', { method: 'POST' })
      const result = await response.json()
      if (response.ok) {
        alert(`✅ Exported ${result.logs_count} logs and ${result.metrics_count} metrics to IBM COS!`)
      } else {
        alert(`❌ Export failed: ${result.error}`)
      }
    } catch (error) {
      alert('❌ Export failed: ' + (error as Error).message)
    }
  }}
  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
>
  📤 Export to IBM COS
</button>
```

---

## PART 4: IBM Data Prep Kit Integration with COS

### Step 1: Update Clean Data API to Use COS

Update `src/app/api/clean-data/route.ts`:

```typescript
import { uploadLogsToCOS, readLogsFromCOS } from '@/lib/ibm-cos'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    // 1. Fetch logs from Supabase
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (logsError) throw logsError

    // 2. Upload raw logs to COS
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    await uploadLogsToCOS(logs, `raw-logs-${timestamp}.json`)

    // 3. Clean data with IBM Data Prep Kit
    const cleanedLogs = await cleanWithIBMDataPrepKit(logs)

    // 4. Upload cleaned logs to COS
    await uploadLogsToCOS(cleanedLogs, `cleaned-logs-${timestamp}.json`)

    // 5. Store cleaned logs in Supabase
    const { error: insertError } = await supabase
      .from('cleaned_logs')
      .insert(cleanedLogs)

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      cleaned_count: cleanedLogs.length,
      cos_uploaded: true,
      message: `Cleaned ${cleanedLogs.length} logs and uploaded to COS`,
    })
  } catch (error) {
    console.error('Clean data failed:', error)
    return NextResponse.json(
      { error: 'Failed to clean data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function cleanWithIBMDataPrepKit(logs: any[]) {
  const apiKey = process.env.IBM_DATA_PREP_KIT_API_KEY
  const endpoint = process.env.IBM_DATA_PREP_KIT_ENDPOINT

  if (!apiKey || !endpoint || apiKey === 'your_ibm_api_key_here') {
    // Use local simulation
    return simulateDataCleaning(logs)
  }

  try {
    // Call IBM Data Prep Kit API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: logs }),
    })

    if (!response.ok) throw new Error(`IBM API error: ${response.status}`)

    const result = await response.json()
    return result.cleaned_data
  } catch (error) {
    console.error('IBM API failed, using local simulation:', error)
    return simulateDataCleaning(logs)
  }
}
```

---

## PART 5: Environment Variables Setup

Update your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# IBM Cloud Object Storage
IBM_COS_ENDPOINT=s3.us-south.cloud-object-storage.appdomain.cloud
IBM_COS_API_KEY=your_cos_api_key_here
IBM_COS_INSTANCE_ID=your_cos_instance_id_here
IBM_COS_BUCKET_NAME=cogniview-logs

# IBM Data Prep Kit
IBM_DATA_PREP_KIT_API_KEY=your_ibm_api_key_here
IBM_DATA_PREP_KIT_ENDPOINT=https://api.dataplatform.cloud.ibm.com/v2/data_intg/cleanup
```

---

## PART 6: Automated Log Streaming to COS

### Option A: Scheduled Export (Cron Job)

Create `src/lib/scheduler.ts`:

```typescript
import { uploadLogsToCOS } from './ibm-cos'
import { supabase } from './supabase'
import { format } from 'date-fns'

export async function scheduleLogExport() {
  // Run every hour
  setInterval(async () => {
    try {
      console.log('🕒 Running scheduled log export...')
      
      // Get logs from last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      const { data: logs } = await supabase
        .from('logs')
        .select('*')
        .gte('created_at', oneHourAgo.toISOString())

      if (logs && logs.length > 0) {
        const filename = `hourly-logs-${format(new Date(), 'yyyy-MM-dd_HH')}.json`
        await uploadLogsToCOS(logs, filename)
        console.log(`✅ Exported ${logs.length} logs to COS`)
      }
    } catch (error) {
      console.error('❌ Scheduled export failed:', error)
    }
  }, 60 * 60 * 1000) // Every hour
}
```

### Option B: Real-time Streaming with Supabase Triggers

Set up a Supabase Edge Function that triggers on new logs and streams to COS.

---

## PART 7: Complete Workflow

```
USER ACTION (e.g., Purchase)
    ↓
Next.js Frontend (logEvent)
    ↓
Supabase Database (logs table)
    ↓
[Trigger: New Log Entry]
    ↓
Export API → IBM Cloud Object Storage
    ↓
IBM Data Prep Kit (Clean & Normalize)
    ↓
Cleaned Data → COS (cleaned-logs/)
    ↓
Also store in Supabase (cleaned_logs table)
    ↓
Available for:
- Monitor Dashboard
- AI/ML Training
- IBM watsonx.ai
- Granite LLM Analysis
```

---

## PART 8: Testing the Complete Flow

### Test Script:

```bash
# 1. Make a purchase on the website
# (This generates logs)

# 2. Export to COS
curl -X POST http://localhost:3000/api/export-to-cos

# 3. Clean data with IBM Kit
curl -X POST http://localhost:3000/api/clean-data

# 4. Verify in IBM Cloud
ibmcloud cos objects --bucket cogniview-logs --region us-south
```

---

## PART 9: Cost Estimation

### IBM Cloud Lite (Free Tier):
- ✅ Cloud Object Storage: 25 GB storage free
- ✅ Code Engine: 100,000 vCPU-seconds/month free
- ✅ Cloud Foundry: 256 MB memory free

### Paid Plans:
- COS Standard: $0.023/GB/month
- Code Engine: $0.000012 per vCPU-second
- Data Prep Kit: Contact IBM for pricing

---

## PART 10: Deployment Checklist

- [ ] IBM Cloud account created
- [ ] COS instance created
- [ ] COS bucket created
- [ ] Service credentials obtained
- [ ] App deployed to Code Engine / Cloud Foundry
- [ ] Environment variables configured
- [ ] COS SDK installed
- [ ] Export API route created
- [ ] Clean data API updated for COS
- [ ] Test end-to-end flow
- [ ] Monitor COS usage dashboard

---

## 🎯 Summary

Your complete IBM Cloud setup will:

1. ✅ Host Next.js app on IBM Code Engine
2. ✅ Stream all logs/metrics to IBM COS
3. ✅ Clean data with IBM Data Prep Kit
4. ✅ Store cleaned data in COS + Supabase
5. ✅ Ready for AI/ML with IBM watsonx.ai

**This creates a production-grade, enterprise-level telemetry and data pipeline!**

---

Need help with any specific part? Let me know!
