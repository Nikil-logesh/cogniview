# 🚀 COMPLETE RENDER + ELK + LOCAL SYNC DEPLOYMENT GUIDE

## Overview
Deploy Cogniview to Render with ELK Stack integration and set up real-time local file syncing.

```
🌐 Render Website → 📊 ELK Stack → 🔄 Real-time API → 📁 Local Files
```

## Part 1: Deploy to Render

### Step 1: Prepare Repository
```bash
# Make sure everything is committed
git add .
git commit -m "Ready for Render deployment with ELK integration"
git push origin main
```

### Step 2: Create Render Service
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (`cogniview`)
4. Configure:
   - **Name**: `cogniview-store`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or upgrade for better performance)

### Step 3: Environment Variables
Add these in Render Dashboard → Environment:

```bash
# Supabase (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# ELK Stack (Optional - for advanced features)
ELASTICSEARCH_URL=your_elasticsearch_endpoint
ELASTICSEARCH_USERNAME=your_username
ELASTICSEARCH_PASSWORD=your_password

# Next.js
NODE_ENV=production
```

### Step 4: Deploy
1. Click "Create Web Service"
2. Wait for build to complete (5-10 minutes)
3. Your site will be available at: `https://cogniview-store.onrender.com`

## Part 2: Set Up ELK Stack (Optional)

### Option A: Local Elasticsearch (Free)
```bash
# Download and run Elasticsearch locally
docker run -d --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.8.0

# Test connection
curl http://localhost:9200
```

### Option B: Elastic Cloud (Paid)
1. Go to https://cloud.elastic.co
2. Create free trial
3. Get connection details
4. Add to Render environment variables

### Option C: Skip ELK (Use Supabase Only)
ELK is optional! The API will work with Supabase data if ELK is not configured.

## Part 3: Set Up Real-Time Local Sync

### Choose Your Method:

#### Method 1: Python Real-Time Sync
```bash
# Install requirements
pip install requests

# Run the sync
python sync_cogniview.py
```

**Features:**
- ✅ Real-time monitoring (30-second intervals)
- ✅ Human-readable text files
- ✅ JSON data files
- ✅ Automatic error detection
- ✅ Progress tracking

#### Method 2: Node.js Real-Time Sync  
```bash
# Install requirements
npm install axios

# Run the sync
node sync_cogniview.js
```

**Features:**
- ✅ JSONL format (great for streaming)
- ✅ Fast processing
- ✅ Memory efficient
- ✅ Easy integration with data tools

#### Method 3: Manual Sync (Simple)
```bash
# Get all data
curl "https://cogniview-store.onrender.com/api/elk-data?type=both&days=7&limit=5000" > data.json

# Get only logs
curl "https://cogniview-store.onrender.com/api/elk-data?type=logs&realtime=true" > logs.json

# Get CSV format
curl "https://cogniview-store.onrender.com/api/elk-data?type=both&format=csv" > data.csv

# Get human-readable text
curl "https://cogniview-store.onrender.com/api/elk-data?type=both&format=txt" > summary.txt
```

## Part 4: Test Complete System

### 1. Test Website
```bash
# Open your deployed site
https://cogniview-store.onrender.com

# Test API endpoints
curl "https://cogniview-store.onrender.com/api/elk-data?type=health"
```

### 2. Generate Test Data
1. Visit your website
2. Browse products
3. Add items to cart
4. Try search functionality
5. Simulate errors (invalid URLs)

### 3. Verify Real-Time Sync
```bash
# Check if local files are updating
ls -la cogniview_realtime_data/

# Watch logs in real-time
tail -f cogniview_realtime_data/LIVE_SUMMARY.txt

# Monitor JSON data
tail -f cogniview_realtime_data/live_logs.json
```

## Part 5: API Endpoints Reference

### Health Check
```bash
GET /api/elk-data?type=health
```

### Real-Time Data (Recommended)
```bash
# Get recent data (last 6 hours)
GET /api/elk-data?type=both&days=0.25&realtime=true

# Get logs only (last hour)  
GET /api/elk-data?type=logs&days=0.04&realtime=true

# Get metrics only
GET /api/elk-data?type=metrics&days=1&realtime=true
```

### Bulk Data Export
```bash
# Large export (last 30 days)
GET /api/elk-data?type=both&days=30&limit=10000

# Filtered data
GET /api/elk-data?type=logs&level=error&days=7

# CSV format
GET /api/elk-data?type=both&format=csv&days=7

# Human-readable
GET /api/elk-data?type=both&format=txt&days=1
```

## Part 6: Data Processing Examples

### Python Data Analysis
```python
import pandas as pd
import json

# Load synced data
with open('cogniview_realtime_data/live_logs.json') as f:
    logs_data = json.load(f)

# Convert to DataFrame
logs_df = pd.DataFrame([item for entry in logs_data for item in entry['logs']])

# Analyze user behavior
user_activity = logs_df.groupby('user_id').size().sort_values(ascending=False)
print("Most active users:", user_activity.head())

# Error analysis
errors = logs_df[logs_df['level'] == 'error']
print(f"Error rate: {len(errors)/len(logs_df)*100:.2f}%")
```

### Real-Time Monitoring Script
```bash
#!/bin/bash
# monitor_cogniview.sh

while true; do
    echo "🔍 Checking Cogniview status at $(date)"
    
    # Health check
    curl -s "https://cogniview-store.onrender.com/api/elk-data?type=health" | jq .
    
    # Recent errors
    echo "🚨 Recent errors:"
    curl -s "https://cogniview-store.onrender.com/api/elk-data?type=logs&level=error&days=0.1" | \
        jq -r '.data.logs.items[].message' | head -5
    
    sleep 300 # Check every 5 minutes
done
```

## Part 7: Troubleshooting

### Common Issues

#### 1. Build Fails on Render
```bash
# Check logs in Render dashboard
# Common fix: Update Node.js version in package.json
"engines": {
  "node": "18.x"
}
```

#### 2. API Returns 500 Error
- Check Supabase credentials
- Verify database tables exist
- Check Render environment variables

#### 3. ELK Connection Fails
- ELK is optional - API works without it
- Check Elasticsearch URL and credentials
- Verify network connectivity

#### 4. Local Sync Not Working
```bash
# Test API manually
curl "https://cogniview-store.onrender.com/api/elk-data?type=health"

# Check Python/Node.js installation
python --version
node --version

# Verify file permissions
ls -la cogniview_realtime_data/
```

### Support Commands

```bash
# Check website status
curl -I https://cogniview-store.onrender.com

# Test data API
curl "https://cogniview-store.onrender.com/api/elk-data?type=both&days=1&limit=10"

# Monitor sync status
cat cogniview_realtime_data/sync_status.json

# View recent logs
tail -20 cogniview_realtime_data/logs_readable.txt
```

## Part 8: Production Tips

### Performance Optimization
1. **Sync Interval**: Start with 30s, adjust based on traffic
2. **Data Limits**: Use `limit` parameter to control data size
3. **File Rotation**: Clean old files periodically
4. **Error Handling**: Monitor sync_status.json for issues

### Security
1. **API Keys**: Keep Supabase keys secure
2. **CORS**: API has CORS enabled for local development
3. **Rate Limiting**: Be respectful with API requests
4. **Data Privacy**: Local files contain user data - secure them

### Scaling
1. **Multiple Syncs**: Run different sync scripts for different data types
2. **Data Processing**: Process synced data with your preferred tools
3. **Alerting**: Set up notifications for critical errors
4. **Backup**: Regular backup of local data files

## Part 9: Success Checklist

- ✅ Website deployed to Render
- ✅ Environment variables configured
- ✅ API endpoints responding
- ✅ Local sync running
- ✅ Files updating automatically
- ✅ Data flowing correctly
- ✅ Error monitoring active

## Part 10: Next Steps

1. **Integrate with Data Prep Kit**: Use synced files as input
2. **Set up Monitoring**: Create dashboards for key metrics
3. **Automate Processing**: Schedule data cleaning jobs
4. **Scale Storage**: Move to cloud storage for production
5. **Add Features**: Implement custom data transformations

---

🎉 **Congratulations!** You now have a complete real-time data pipeline from your Render-hosted website to your local file system, ready for Data Prep Kit integration!

For support, check the sync logs or create an issue in your repository.