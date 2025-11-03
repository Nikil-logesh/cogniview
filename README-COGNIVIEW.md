# 🧠 Cogniview Store - AI-Ready Telemetry E-Commerce

> "Turning every click and metric into AI-ready insight — combining Supabase simplicity with IBM Data Prep Kit intelligence."

A Next.js e-commerce application with **comprehensive telemetry tracking**, **IBM Data Prep Kit integration**, and **real-time monitoring dashboard**. Every user action and system event is captured, cleaned, and prepared for AI analysis.

## 🌟 Key Features

### 1. **User Authentication** 🔐
- Email + password registration and login via Supabase Auth
- Secure session handling with personalized dashboards
- Role-based access (customer, admin, monitor)
- Authenticated telemetry tracking per user

### 2. **Real-Time Telemetry** 📊
Custom hooks for comprehensive data collection:
- `logEvent()` - Records user actions and system events
- `recordMetric()` - Tracks performance metrics (latency, CPU, error rates)
- `reportError()` - Captures client-side exceptions with stack traces
- All telemetry linked to authenticated users

### 3. **IBM Data Prep Kit Integration** 🧹
Automated data cleaning pipeline:
- Parses timestamps and JSON fields
- Normalizes severity levels (INFO, WARNING, ERROR, CRITICAL)
- Categorizes events (user_activity, system_health, incident_alert)
- Tags and classifies log entries
- Calculates confidence scores
- **Production-ready IBM API integration** + local simulation mode

### 4. **Visual Monitoring Panel** 📈
Real-time dashboard displaying:
- Live event logs with severity filtering
- Performance metrics table
- IBM-cleaned data visualization
- Summary statistics (total events, errors, metrics)
- Incident simulation buttons for testing
- Real-time data subscription via Supabase

### 5. **E-Commerce Functionality** 🛒
- Product catalog with real-time stock updates
- Authenticated purchasing with order tracking
- Automatic telemetry for every transaction
- User-linked order history

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) + TypeScript | Modern React framework |
| **UI** | Tailwind CSS | Utility-first styling |
| **Database & Auth** | Supabase | PostgreSQL + Authentication |
| **Data Cleaning** | IBM Data Prep Kit | Log normalization & classification |
| **Charts** | Recharts | Metric visualization |
| **Date Handling** | date-fns | Timestamp formatting |
| **Real-time** | Supabase Realtime | Live data updates |

## 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Supabase Account** ([Sign up free](https://supabase.com/))
- **IBM Cloud Account** (Optional - for production Data Prep Kit)

## 🚀 Quick Start

### Step 1: Clone & Install

```bash
cd "d:\\test for cogniview"
npm install
```

### Step 2: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase-cogniview-schema.sql`
3. Verify tables created: `products`, `orders`, `logs`, `metrics`, `cleaned_logs`, `user_profiles`

### Step 3: Configure Environment

Update `.env.local` with your credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: IBM Data Prep Kit (leave as-is for local simulation)
IBM_DATA_PREP_KIT_API_KEY=your_ibm_api_key_here
IBM_DATA_PREP_KIT_ENDPOINT=https://api.dataplatform.cloud.ibm.com/v2/data_intg/cleanup
```

### Step 4: Run the Application

```bash
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)**

## 🔐 Authentication Flow

1. **Sign Up** → Navigate to `/signup`, create account
2. **Sign In** → Navigate to `/login`, enter credentials
3. **Automatic Profile** → User profile created via database trigger
4. **Session Tracking** → All actions linked to authenticated user
5. **Header Display** → Shows "Welcome, user@email.com"

## 📊 Telemetry Usage

### In Your Components

```typescript
import { useTelemetry } from '@/hooks/useTelemetry'

function MyComponent() {
  const { logEvent, recordMetric, reportError } = useTelemetry()
  
  // Log a user action
  await logEvent('button_clicked', { button_id: 'submit' }, { 
    eventType: 'user', 
    severity: 'info' 
  })
  
  // Record a performance metric
  await recordMetric('api_latency', 125.5, 'ms')
  
  // Report an error
  try {
    // risky code
  } catch (error) {
    await reportError(error, { context: 'data_fetch' })
  }
}
```

### Telemetry Auto-Tracking

The app automatically logs:
- ✅ Page views
- ✅ Login/signup attempts (success & failure)
- ✅ Product fetches with latency
- ✅ Purchase attempts & completions
- ✅ Stock updates
- ✅ API response times
- ✅ Client-side errors

## 🧹 IBM Data Prep Kit Integration

### Local Mode (Default)

Without IBM API credentials, the app uses intelligent local simulation:
- Normalizes event names
- Categorizes into user_activity, system_health, incident_alert
- Tags events (e-commerce, inventory, performance, failure)
- Calculates confidence scores
- Formats messages for readability

### Production Mode (IBM API)

When you configure IBM credentials in `.env.local`:

1. Get API key from [IBM Cloud](https://cloud.ibm.com/)
2. Set `IBM_DATA_PREP_KIT_API_KEY` and `IBM_DATA_PREP_KIT_ENDPOINT`
3. App automatically switches to calling IBM API
4. Cleaned data returned and stored in `cleaned_logs` table

### Using the Cleaning Pipeline

1. Navigate to `/monitor`
2. Click **"🧹 Clean Data with IBM Kit"**
3. View results in **"IBM Cleaned Data"** tab
4. Export cleaned logs for AI training:

```sql
SELECT * FROM cleaned_logs 
WHERE category = 'incident_alert' 
ORDER BY confidence_score DESC;
```

## 📈 Monitoring Dashboard

Access at `/monitor` (requires authentication)

### Features:
- **Summary Cards** - Total events, errors, metrics, cleaned logs
- **Action Buttons**:
  - 🚨 Simulate Server Error
  - ⚠️ Simulate High Latency
  - ⏱️ Simulate DB Timeout
  - 🧹 Clean Data with IBM Kit
  - 🔄 Refresh Data
- **Event Logs Tab** - Real-time log stream with severity colors
- **Metrics Tab** - Performance metrics table
- **IBM Cleaned Data Tab** - Processed logs with tags and categories

### Real-Time Updates

Dashboard subscribes to Supabase changes:
```typescript
const logsSubscription = supabase
  .channel('logs_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, () => {
    fetchLogs()
  })
  .subscribe()
```

## 🗄️ Database Schema

### Core Tables

#### `products`
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| name | VARCHAR | Product name |
| price | DECIMAL | Price |
| stock | INTEGER | Available units |

#### `orders`
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| user_id | UUID | FK to auth.users |
| product_id | BIGINT | FK to products |
| product_name | VARCHAR | Snapshot |
| price | DECIMAL | Price at order |
| quantity | INTEGER | Units ordered |
| total_amount | DECIMAL | Total price |

#### `logs` (Telemetry Events)
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| user_id | UUID | FK to auth.users |
| event_name | VARCHAR | Event identifier |
| event_type | VARCHAR | user/system/error/incident |
| severity | VARCHAR | info/warning/error/critical |
| message | TEXT | Event description |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMP | Event time |

#### `metrics` (Performance Data)
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| user_id | UUID | FK to auth.users |
| metric_name | VARCHAR | Metric identifier |
| metric_value | DECIMAL | Numeric value |
| unit | VARCHAR | ms, percent, count, bytes |
| metadata | JSONB | Additional context |
| created_at | TIMESTAMP | Measurement time |

#### `cleaned_logs` (IBM Processed)
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| original_log_id | BIGINT | FK to logs |
| cleaned_event_name | VARCHAR | Normalized name |
| normalized_severity | VARCHAR | Standardized severity |
| category | VARCHAR | Classification |
| tags | TEXT[] | Event tags |
| cleaned_message | TEXT | Processed message |
| confidence_score | DECIMAL | 0.00 to 1.00 |
| processed_at | TIMESTAMP | Cleaning time |

#### `user_profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | FK to auth.users |
| email | VARCHAR | User email |
| full_name | VARCHAR | Display name |
| role | VARCHAR | customer/admin/monitor |
| created_at | TIMESTAMP | Account creation |

## 🔒 Security Features

### Row Level Security (RLS)

All tables have RLS policies:

```sql
-- Users can only view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Users can view own logs" ON logs
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );
```

### Authentication

- Passwords hashed by Supabase Auth
- JWT tokens for session management
- Server-side auth verification on API routes
- Automatic session refresh

## 📤 Exporting Data for AI

### Export Cleaned Logs (CSV)

Supabase Dashboard → Table Editor → `cleaned_logs` → Export

### SQL Export Queries

```sql
-- Export all high-confidence incidents
COPY (
  SELECT cleaned_event_name, category, tags, cleaned_message, confidence_score
  FROM cleaned_logs
  WHERE category = 'incident_alert' AND confidence_score > 0.85
  ORDER BY processed_at DESC
) TO '/tmp/incidents.csv' WITH CSV HEADER;

-- Export performance metrics
COPY (
  SELECT metric_name, AVG(metric_value) as avg_value, 
         MIN(metric_value) as min_value, MAX(metric_value) as max_value
  FROM metrics
  GROUP BY metric_name
) TO '/tmp/metrics_summary.csv' WITH CSV HEADER;
```

### API Export

```typescript
const { data: cleanedLogs } = await supabase
  .from('cleaned_logs')
  .select('*')
  .order('confidence_score', { ascending: false })
  .limit(1000)

// Export as JSON for AI training
const jsonExport = JSON.stringify(cleanedLogs, null, 2)
```

## 🧪 Testing the Pipeline

1. **Generate Activity**
   - Sign up as a new user
   - Browse products
   - Make a purchase
   - View monitoring dashboard

2. **Simulate Incidents**
   - Go to `/monitor`
   - Click simulation buttons
   - Observe logs being created

3. **Clean Data**
   - Click "Clean Data with IBM Kit"
   - Check "IBM Cleaned Data" tab
   - Verify categorization and tags

4. **Export & Analyze**
   - Query `cleaned_logs` table
   - Export to CSV
   - Feed into IBM watsonx.ai or Granite LLM

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Environment Variables for Production

```
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
IBM_DATA_PREP_KIT_API_KEY=your_ibm_key
IBM_DATA_PREP_KIT_ENDPOINT=your_ibm_endpoint
```

## 🔧 Troubleshooting

### "Failed to load products"
- ✅ Check `.env.local` credentials
- ✅ Verify Supabase tables exist
- ✅ Run `supabase-cogniview-schema.sql`

### Authentication not working
- ✅ Confirm Supabase Auth is enabled
- ✅ Check email confirmation settings
- ✅ Verify RLS policies

### IBM API errors
- ✅ Validate API key and endpoint
- ✅ Check IBM Cloud quota
- ✅ Review API response in console
- ✅ App falls back to local simulation

### Tailwind styles not working
- ✅ Run `npm install` to install Tailwind
- ✅ Restart dev server
- ✅ Clear `.next` cache

## 🎯 Future Enhancements

- [ ] IBM watsonx.ai Granite LLM integration
- [ ] RAG (Retrieval-Augmented Generation) for incident analysis
- [ ] Automated incident root cause detection
- [ ] Anomaly detection with AI
- [ ] Custom dashboard builder
- [ ] Advanced metric visualization (Recharts)
- [ ] Webhook notifications for critical events
- [ ] Multi-tenant support

## 📚 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders` | POST | Create order (requires auth) |
| `/api/clean-data` | POST | Trigger IBM cleaning pipeline |

## 🤝 Contributing

This project demonstrates enterprise-grade telemetry and data preparation for AI workflows. Contributions welcome!

## 📄 License

MIT License - Open source for educational and commercial use

## 💡 Use Cases

- **E-commerce Analytics** - Track user behavior and purchase patterns
- **Performance Monitoring** - Identify bottlenecks and latency issues
- **Incident Management** - Automated error detection and classification
- **AI Training Data** - Clean, labeled datasets for machine learning
- **Customer Insights** - Understand user journeys and pain points
- **Compliance** - Structured logging for audit trails

## 🌐 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [IBM Data Prep Kit](https://www.ibm.com/products/data-refinery)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Built with ❤️ for IBM Hackathon** | Bridging developer tools with enterprise AI

