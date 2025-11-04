# Data Prep Kit Integration Guide

## Overview
This guide shows how your local Data Prep Kit project can consume data from the Cogniview e-commerce app for cleaning and classification.

## Architecture
```
Cogniview App → ELK Stack → HTTP API → Your Data Prep Kit
```

## Data Flow
1. **Cogniview App** generates logs and metrics during user interactions
2. **ELK Stack** stores and indexes the data (Elasticsearch)
3. **HTTP API** exposes clean JSON endpoints 
4. **Your Data Prep Kit** fetches data via HTTP requests for processing

## API Endpoints

### Base URL
- **Local Development**: `http://localhost:3000/api/elk-data`
- **Production (Render)**: `https://cogniview-store.onrender.com/api/elk-data`

### Available Endpoints

#### 1. Health Check
```bash
GET /api/elk-data?type=health
```

**Response:**
```json
{
  "status": "ok",
  "elk_healthy": true,
  "timestamp": "2025-11-04T10:30:00.000Z",
  "data_prep_kit_ready": true
}
```

#### 2. Get Logs Only
```bash
GET /api/elk-data?type=logs&days=7&limit=1000&level=error
```

**Response:**
```json
{
  "timestamp": "2025-11-04T10:30:00.000Z",
  "query_params": {
    "type": "logs",
    "days": 7,
    "limit": 1000,
    "level": "error"
  },
  "data": {
    "logs": {
      "count": 145,
      "items": [
        {
          "timestamp": "2025-11-04T10:25:00.000Z",
          "level": "error",
          "event_name": "payment_failed",
          "event_type": "user",
          "message": "Payment processing failed for order #12345",
          "user_id": "user_abc123",
          "source": "cogniview-app",
          "metadata": {
            "order_id": "12345",
            "amount": 99.99,
            "payment_method": "credit_card"
          }
        }
      ]
    }
  },
  "summary": {
    "total_records": 145,
    "data_types": ["logs"],
    "ready_for_cleaning": true,
    "suggested_cleaning_operations": [
      "remove_duplicates",
      "normalize_timestamps", 
      "extract_user_patterns",
      "classify_event_types",
      "detect_anomalies"
    ]
  }
}
```

#### 3. Get Metrics Only
```bash
GET /api/elk-data?type=metrics&days=30&limit=5000&metric_name=page_load_time
```

#### 4. Get Both Logs and Metrics
```bash
GET /api/elk-data?type=both&days=14&limit=2000
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `both` | Data type: `logs`, `metrics`, `both`, or `health` |
| `days` | number | `7` | Number of days back to fetch data |
| `limit` | number | `1000` | Maximum records to return |
| `level` | string | - | Log level filter: `info`, `warning`, `error` |
| `event_type` | string | - | Event type filter: `user`, `system`, `error`, `incident` |
| `metric_name` | string | - | Specific metric name to filter |

## Data Prep Kit Integration Examples

### Python Integration
```python
import requests
import pandas as pd
from datetime import datetime

class CogniviewDataFetcher:
    def __init__(self, base_url="http://localhost:3000/api/elk-data"):
        self.base_url = base_url
    
    def fetch_data_for_cleaning(self, days=7, limit=5000):
        """Fetch data from Cogniview for Data Prep Kit processing"""
        
        # Health check first
        health = requests.get(f"{self.base_url}?type=health")
        if not health.json().get('elk_healthy'):
            print("⚠️ ELK Stack not healthy, using fallback data")
            return self.get_fallback_data()
        
        # Fetch both logs and metrics
        response = requests.get(f"{self.base_url}?type=both&days={days}&limit={limit}")
        data = response.json()
        
        print(f"✅ Fetched {data['summary']['total_records']} records")
        return data
    
    def clean_logs_data(self, data):
        """Clean logs data using Data Prep Kit"""
        logs = data['data'].get('logs', {}).get('items', [])
        
        # Convert to DataFrame for cleaning
        df = pd.DataFrame(logs)
        
        # Data Prep Kit cleaning operations
        df = self.remove_duplicates(df)
        df = self.normalize_timestamps(df)
        df = self.extract_user_patterns(df)
        df = self.classify_events(df)
        
        return df
    
    def clean_metrics_data(self, data):
        """Clean metrics data using Data Prep Kit"""
        metrics = data['data'].get('metrics', {}).get('items', [])
        
        # Convert to DataFrame
        df = pd.DataFrame(metrics)
        
        # Apply Data Prep Kit transformations
        df = self.detect_anomalies(df)
        df = self.normalize_metric_values(df)
        
        return df
    
    def remove_duplicates(self, df):
        """Remove duplicate records"""
        return df.drop_duplicates(subset=['timestamp', 'event_name', 'user_id'])
    
    def normalize_timestamps(self, df):
        """Standardize timestamp formats"""
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        return df
    
    def extract_user_patterns(self, df):
        """Extract user behavior patterns"""
        df['user_activity_score'] = df.groupby('user_id').cumcount() + 1
        return df
    
    def classify_events(self, df):
        """Classify events into categories"""
        classification_map = {
            'login': 'authentication',
            'logout': 'authentication', 
            'payment': 'transaction',
            'add_to_cart': 'shopping',
            'search': 'discovery',
            'error': 'system_issue'
        }
        
        df['event_category'] = df['event_name'].map(
            lambda x: next((v for k, v in classification_map.items() if k in x.lower()), 'other')
        )
        return df
    
    def detect_anomalies(self, df):
        """Detect anomalous metric values"""
        # Simple anomaly detection - can be enhanced with ML
        df['is_anomaly'] = df['metric_value'] > (df['metric_value'].mean() + 2 * df['metric_value'].std())
        return df
    
    def normalize_metric_values(self, df):
        """Normalize metric values by unit type"""
        # Group by unit and normalize
        for unit in df['unit'].unique():
            mask = df['unit'] == unit
            df.loc[mask, 'normalized_value'] = (
                df.loc[mask, 'metric_value'] - df.loc[mask, 'metric_value'].min()
            ) / (df.loc[mask, 'metric_value'].max() - df.loc[mask, 'metric_value'].min())
        
        return df

# Usage Example
if __name__ == "__main__":
    # Initialize Data Prep Kit with Cogniview
    fetcher = CogniviewDataFetcher()
    
    # Fetch data for the last 30 days
    raw_data = fetcher.fetch_data_for_cleaning(days=30, limit=10000)
    
    # Clean and process the data
    clean_logs = fetcher.clean_logs_data(raw_data)
    clean_metrics = fetcher.clean_metrics_data(raw_data)
    
    # Save cleaned data
    clean_logs.to_csv('cleaned_cogniview_logs.csv', index=False)
    clean_metrics.to_csv('cleaned_cogniview_metrics.csv', index=False)
    
    print(f"✅ Cleaned {len(clean_logs)} log records")
    print(f"✅ Cleaned {len(clean_metrics)} metric records")
    
    # Display sample insights
    print("\n📊 Log Event Categories:")
    print(clean_logs['event_category'].value_counts())
    
    print("\n📈 Metric Anomalies Detected:")
    print(f"{clean_metrics['is_anomaly'].sum()} out of {len(clean_metrics)} metrics")
```

### Node.js Integration
```javascript
const axios = require('axios');
const fs = require('fs');

class CogniviewDataPrepKit {
    constructor(baseUrl = 'http://localhost:3000/api/elk-data') {
        this.baseUrl = baseUrl;
    }

    async fetchAndCleanData(days = 7, limit = 5000) {
        try {
            // Health check
            const health = await axios.get(`${this.baseUrl}?type=health`);
            if (!health.data.elk_healthy) {
                console.warn('⚠️ ELK Stack not healthy');
                return null;
            }

            // Fetch data
            const response = await axios.get(`${this.baseUrl}?type=both&days=${days}&limit=${limit}`);
            const data = response.data;

            console.log(`✅ Fetched ${data.summary.total_records} records`);

            // Clean the data
            const cleanedData = {
                logs: this.cleanLogs(data.data.logs?.items || []),
                metrics: this.cleanMetrics(data.data.metrics?.items || []),
                metadata: {
                    processed_at: new Date().toISOString(),
                    total_records: data.summary.total_records,
                    cleaning_operations: [
                        'deduplication',
                        'timestamp_normalization', 
                        'event_classification',
                        'anomaly_detection'
                    ]
                }
            };

            // Save cleaned data
            fs.writeFileSync('cleaned_cogniview_data.json', JSON.stringify(cleanedData, null, 2));
            
            return cleanedData;
        } catch (error) {
            console.error('Data Prep Kit Error:', error.message);
            return null;
        }
    }

    cleanLogs(logs) {
        return logs
            .filter(this.removeDuplicates)
            .map(this.normalizeTimestamp)
            .map(this.classifyEvent);
    }

    cleanMetrics(metrics) {
        return metrics
            .map(this.normalizeTimestamp)
            .map(this.detectAnomalies);
    }

    removeDuplicates(log, index, array) {
        return array.findIndex(l => 
            l.timestamp === log.timestamp && 
            l.event_name === log.event_name && 
            l.user_id === log.user_id
        ) === index;
    }

    normalizeTimestamp(record) {
        const date = new Date(record.timestamp);
        return {
            ...record,
            normalized_timestamp: date.toISOString(),
            hour: date.getHours(),
            day_of_week: date.getDay()
        };
    }

    classifyEvent(log) {
        const eventCategories = {
            'login': 'authentication',
            'logout': 'authentication',
            'payment': 'transaction', 
            'add_to_cart': 'shopping',
            'search': 'discovery',
            'error': 'system_issue'
        };

        const category = Object.entries(eventCategories)
            .find(([key]) => log.event_name.toLowerCase().includes(key))?.[1] || 'other';

        return { ...log, event_category: category };
    }

    detectAnomalies(metric) {
        // Simple anomaly detection - enhance with your ML models
        const isAnomaly = Math.abs(metric.metric_value) > 1000; // Simple threshold
        
        return { 
            ...metric, 
            is_anomaly: isAnomaly,
            anomaly_score: isAnomaly ? 0.8 : 0.1 
        };
    }
}

// Usage
async function runDataPrepKit() {
    const dataPrepKit = new CogniviewDataPrepKit();
    const cleanedData = await dataPrepKit.fetchAndCleanData(30, 10000);
    
    if (cleanedData) {
        console.log('✅ Data cleaning completed');
        console.log(`📊 Processed ${cleanedData.logs.length} logs and ${cleanedData.metrics.length} metrics`);
    }
}

runDataPrepKit();
```

## Real-time Data Pipeline

You can set up a scheduled job in your Data Prep Kit to automatically fetch and clean data:

```bash
# Cron job (every hour)
0 * * * * cd /path/to/your/data-prep-kit && python cogniview_integration.py

# Or use a scheduler in your Data Prep Kit
```

## Testing the Integration

### 1. Test API Connectivity
```bash
curl "http://localhost:3000/api/elk-data?type=health"
```

### 2. Fetch Sample Data
```bash
curl "http://localhost:3000/api/elk-data?type=logs&days=1&limit=10"
```

### 3. Get Metrics for Analysis
```bash
curl "http://localhost:3000/api/elk-data?type=metrics&days=7&limit=100"
```

## Data Cleaning Suggestions

Based on the e-commerce nature of Cogniview, your Data Prep Kit should focus on:

1. **User Behavior Analysis**: Clean and classify user interaction patterns
2. **Performance Metrics**: Normalize page load times, API response times
3. **Error Pattern Detection**: Identify and categorize system errors
4. **Transaction Analysis**: Clean payment and order data
5. **Search Optimization**: Analyze search queries and results
6. **Anomaly Detection**: Identify unusual user behavior or system performance

## Next Steps

1. **Deploy Cogniview to Render** (so your Data Prep Kit can access it)
2. **Set up Elasticsearch** (local or cloud instance)
3. **Test the API endpoints** from your Data Prep Kit
4. **Implement your cleaning algorithms** using the provided data structure
5. **Schedule automated data fetching** in your Data Prep Kit

The API is designed to be simple and reliable - your Data Prep Kit just needs to make HTTP requests to get clean, structured data for processing!