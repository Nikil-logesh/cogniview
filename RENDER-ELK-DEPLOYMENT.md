# 🚀 Render Deployment + ELK Stack Integration

## Complete Setup: Render + ELK → Data Prep Kit

---

## Part 1: Deploy to Render.com (FREE)

### Step 1: Create render.yaml

```yaml
# render.yaml - Render deployment configuration
services:
  - type: web
    name: cogniview-store
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_SUPABASE_URL
        fromSecret: SUPABASE_URL
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
        fromSecret: SUPABASE_ANON_KEY
      - key: ELASTICSEARCH_URL
        fromSecret: ELASTICSEARCH_URL
      - key: ELASTICSEARCH_API_KEY
        fromSecret: ELASTICSEARCH_API_KEY
    healthCheckPath: /api/health
    disk:
      name: cogniview-disk
      mountPath: /opt/render/project/storage
      sizeGB: 1
```

### Step 2: Update package.json for Render

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start -p $PORT",
    "dev": "next dev",
    "lint": "next lint"
  }
}
```

### Step 3: Deploy to Render

1. **Push to GitHub** (already done ✅)
2. **Go to Render.com** → Sign up with GitHub
3. **Create Web Service** → Connect your repo
4. **Auto-deploy** from `master` branch

**Your app will be live at:** `https://cogniview-store.onrender.com`

---

## Part 2: ELK Stack Integration

### What is ELK?
- **E**lasticsearch - Store and search logs
- **L**ogstash - Process and transform logs  
- **K**ibana - Visualize logs and metrics

### Architecture:
```
Next.js App (Render) → Elasticsearch → Logstash → Kibana → Data Prep Kit
```

---

## Part 3: Elasticsearch Setup

### Option A: Elastic Cloud (FREE 14-day trial)

1. **Sign up**: https://cloud.elastic.co/registration
2. **Create deployment**: 
   - Name: `cogniview-logs`
   - Cloud: AWS
   - Region: US East (N. Virginia)
   - Version: Latest

3. **Get credentials**:
   ```
   Elasticsearch URL: https://your-deployment.es.us-east-1.aws.found.io
   Username: elastic
   Password: [generated password]
   ```

### Option B: Local Elasticsearch (Docker)

```bash
# Run Elasticsearch locally
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# Test connection
curl http://localhost:9200
```

---

## Part 4: Add ELK Integration to Your App

### Install Elasticsearch Client

```bash
npm install @elastic/elasticsearch
```

### Create ELK Service

Create `src/lib/elk.ts`:

```typescript
import { Client } from '@elastic/elasticsearch'

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_API_KEY ? {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  } : undefined
})

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  event_name: string
  event_type: string
  message: string
  user_id?: string
  metadata?: any
  source: 'cogniview-app'
}

export interface MetricEntry {
  timestamp: string
  metric_name: string
  metric_value: number
  unit: string
  metadata?: any
  source: 'cogniview-app'
}

// Send logs to Elasticsearch
export async function sendLogToELK(log: LogEntry) {
  try {
    await client.index({
      index: 'cogniview-logs',
      body: {
        ...log,
        '@timestamp': new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to send log to ELK:', error)
  }
}

// Send metrics to Elasticsearch
export async function sendMetricToELK(metric: MetricEntry) {
  try {
    await client.index({
      index: 'cogniview-metrics',
      body: {
        ...metric,
        '@timestamp': new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to send metric to ELK:', error)
  }
}

// Search logs for Data Prep Kit
export async function searchLogs(query: {
  days?: number
  limit?: number
  level?: string
  event_type?: string
}) {
  const { days = 7, limit = 1000, level, event_type } = query

  const mustFilters: any[] = [
    {
      range: {
        '@timestamp': {
          gte: `now-${days}d/d`
        }
      }
    }
  ]

  if (level) {
    mustFilters.push({ term: { level } })
  }

  if (event_type) {
    mustFilters.push({ term: { event_type } })
  }

  try {
    const response = await client.search({
      index: 'cogniview-logs',
      body: {
        query: {
          bool: {
            must: mustFilters
          }
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
        size: limit
      }
    })

    return response.body.hits.hits.map((hit: any) => hit._source)
  } catch (error) {
    console.error('ELK search failed:', error)
    return []
  }
}

// Search metrics for Data Prep Kit
export async function searchMetrics(query: {
  days?: number
  limit?: number
  metric_name?: string
}) {
  const { days = 7, limit = 1000, metric_name } = query

  const mustFilters: any[] = [
    {
      range: {
        '@timestamp': {
          gte: `now-${days}d/d`
        }
      }
    }
  ]

  if (metric_name) {
    mustFilters.push({ term: { metric_name } })
  }

  try {
    const response = await client.search({
      index: 'cogniview-metrics',
      body: {
        query: {
          bool: {
            must: mustFilters
          }
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
        size: limit
      }
    })

    return response.body.hits.hits.map((hit: any) => hit._source)
  } catch (error) {
    console.error('ELK metrics search failed:', error)
    return []
  }
}
```

---

## Part 5: Update Your Telemetry Hook

Update `src/hooks/useTelemetry.ts`:

```typescript
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { sendLogToELK, sendMetricToELK } from '@/lib/elk'

export function useTelemetry() {
  const { user } = useAuth()

  const logEvent = async (
    eventName: string, 
    metadata: any = {}, 
    options: { eventType?: string; severity?: string } = {}
  ) => {
    const logData = {
      user_id: user?.id || null,
      event_name: eventName,
      event_type: options.eventType || 'user',
      severity: options.severity || 'info',
      message: `Event: ${eventName}`,
      metadata,
      ip_address: null,
      user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
    }

    try {
      // Send to Supabase (existing)
      await supabase.from('logs').insert([logData])
      
      // Send to ELK Stack (new)
      await sendLogToELK({
        timestamp: new Date().toISOString(),
        level: options.severity as any || 'info',
        event_name: eventName,
        event_type: options.eventType || 'user',
        message: `Event: ${eventName}`,
        user_id: user?.id || undefined,
        metadata,
        source: 'cogniview-app'
      })
    } catch (error) {
      console.error('Error logging event:', error)
    }
  }

  const recordMetric = async (
    metricName: string, 
    value: number, 
    unit: string = '', 
    metadata: any = {}
  ) => {
    const metricData = {
      user_id: user?.id || null,
      metric_name: metricName,
      metric_value: value,
      unit,
      metadata,
    }

    try {
      // Send to Supabase (existing)
      await supabase.from('metrics').insert([metricData])
      
      // Send to ELK Stack (new)
      await sendMetricToELK({
        timestamp: new Date().toISOString(),
        metric_name: metricName,
        metric_value: value,
        unit,
        metadata,
        source: 'cogniview-app'
      })
    } catch (error) {
      console.error('Error recording metric:', error)
    }
  }

  const reportError = async (error: Error, context: any = {}) => {
    await logEvent('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      context
    }, { eventType: 'system', severity: 'error' })
  }

  return { logEvent, recordMetric, reportError }
}
```

---

## Part 6: Create ELK Data API for Data Prep Kit

Create `src/app/api/elk-data/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { searchLogs, searchMetrics } from '@/lib/elk'

/**
 * ELK Data API for Data Prep Kit
 * GET /api/elk-data?days=30&limit=5000&source=logs
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '1000')
    const source = searchParams.get('source') || 'both' // logs, metrics, both
    const level = searchParams.get('level') || undefined
    const event_type = searchParams.get('event_type') || undefined
    const metric_name = searchParams.get('metric_name') || undefined

    let logs: any[] = []
    let metrics: any[] = []

    // Fetch logs from ELK
    if (source === 'logs' || source === 'both') {
      logs = await searchLogs({ days, limit, level, event_type })
    }

    // Fetch metrics from ELK
    if (source === 'metrics' || source === 'both') {
      metrics = await searchMetrics({ days, limit, metric_name })
    }

    // Calculate statistics
    const errorLogs = logs.filter(log => log.level === 'error')
    const warningLogs = logs.filter(log => log.level === 'warning')
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      source: 'elk-stack',
      query: {
        days_requested: days,
        limit_requested: limit,
        filters: { source, level, event_type, metric_name }
      },
      summary: {
        total_logs: logs.length,
        total_metrics: metrics.length,
        error_count: errorLogs.length,
        warning_count: warningLogs.length,
        error_rate_percent: logs.length ? (errorLogs.length / logs.length * 100).toFixed(2) : '0.00'
      },
      data: {
        logs,
        metrics,
        combined: [...logs, ...metrics].sort((a, b) => 
          new Date(b.timestamp || b['@timestamp']).getTime() - 
          new Date(a.timestamp || a['@timestamp']).getTime()
        )
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('ELK API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch ELK data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
```

---

## Part 7: Connect to Your Local Data Prep Kit Project

### Data Flow:
```
Render App → ELK Stack → HTTP API → Your Local Data Prep Kit
```

### API Endpoint for Your Data Prep Kit:
```
https://cogniview-store.onrender.com/api/elk-data?days=30&limit=5000&source=both
```

### Response Format:
```json
{
  "success": true,
  "source": "elk-stack",
  "summary": {
    "total_logs": 1500,
    "total_metrics": 300,
    "error_count": 25,
    "error_rate_percent": "1.67"
  },
  "data": {
    "logs": [...],
    "metrics": [...],
    "combined": [...]
  }
}
```

---

## Part 8: No Need for Other Project Info!

### Your Data Prep Kit Project Should:

1. **Connect via HTTP API**:
   ```python
   import requests
   
   # Fetch data from your Render app
   response = requests.get(
       'https://cogniview-store.onrender.com/api/elk-data',
       params={'days': 30, 'limit': 5000, 'source': 'both'}
   )
   
   data = response.json()
   logs = data['data']['logs']
   metrics = data['data']['metrics']
   ```

2. **Process the data locally**:
   - Clean timestamps
   - Normalize log levels
   - Extract features
   - Classify events
   - Generate insights

3. **No credentials needed** - Public API endpoint

---

## Part 9: Quick Deployment Commands

```bash
# 1. Install ELK client
npm install @elastic/elasticsearch

# 2. Commit changes
git add .
git commit -m "feat: Add Render deployment with ELK Stack integration"
git push origin master

# 3. Deploy to Render
# Go to render.com → Connect GitHub repo → Auto-deploy

# 4. Set environment variables in Render:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-key
# ELASTICSEARCH_URL=https://your-cluster.es.region.aws.found.io
# ELASTICSEARCH_API_KEY=your-api-key
```

---

## Part 10: Testing the Complete Flow

### Test 1: Local Development
```bash
# Start your app
npm run dev

# Generate some logs
curl http://localhost:3001
curl http://localhost:3001/checkout

# Test ELK API
curl http://localhost:3001/api/elk-data?days=1
```

### Test 2: Production (Render)
```bash
# Test live API
curl https://cogniview-store.onrender.com/api/elk-data?days=7&limit=100

# Use in your Data Prep Kit
python -c "
import requests
r = requests.get('https://cogniview-store.onrender.com/api/elk-data?days=7')
print(f'Got {len(r.json()[\"data\"][\"logs\"])} logs')
"
```

---

## ✅ Summary

1. **Render.com** - Free hosting for your Next.js app
2. **ELK Stack** - Powerful log aggregation and search
3. **HTTP API** - Clean interface for Data Prep Kit
4. **No Firebase** - Completely removed
5. **No credentials sharing** - Your Data Prep Kit just calls public API

**Your Data Prep Kit URL**: `https://cogniview-store.onrender.com/api/elk-data`

Ready to set this up? 🚀