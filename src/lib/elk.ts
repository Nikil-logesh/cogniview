import { Client } from '@elastic/elasticsearch'

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_API_KEY ? {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  } : undefined,
  // For development with local Elasticsearch
  tls: {
    rejectUnauthorized: false
  }
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
    // Don't throw - continue app functionality even if ELK fails
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
    // Don't throw - continue app functionality even if ELK fails
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
      query: {
        bool: {
          must: mustFilters
        }
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: limit
    })

    // @ts-ignore - Handle different versions of Elasticsearch client
    const hits = response.hits?.hits || response.body?.hits?.hits || []
    return hits.map((hit: any) => hit._source)
  } catch (error) {
    console.error('ELK search failed:', error)
    // Return empty array if ELK is unavailable
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
      query: {
        bool: {
          must: mustFilters
        }
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: limit
    })

    // @ts-ignore - Handle different versions of Elasticsearch client
    const hits = response.hits?.hits || response.body?.hits?.hits || []
    return hits.map((hit: any) => hit._source)
  } catch (error) {
    console.error('ELK metrics search failed:', error)
    // Return empty array if ELK is unavailable
    return []
  }
}

// Health check for ELK
export async function checkELKHealth() {
  try {
    const response = await client.ping()
    // @ts-ignore - Handle different client versions
    return { healthy: response.statusCode === 200 || response.body === true || response === true, response }
  } catch (error) {
    console.error('ELK health check failed:', error)
    return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Initialize ELK indices (run once)
export async function initializeELKIndices() {
  try {
    // Create logs index if it doesn't exist
    const logsExists = await client.indices.exists({ index: 'cogniview-logs' })
    // @ts-ignore - Handle different client versions
    if (!logsExists.body && !logsExists) {
      await client.indices.create({
        index: 'cogniview-logs',
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            timestamp: { type: 'date' },
            level: { type: 'keyword' },
            event_name: { type: 'keyword' },
            event_type: { type: 'keyword' },
            message: { type: 'text' },
            user_id: { type: 'keyword' },
            source: { type: 'keyword' },
            metadata: { type: 'object' }
          }
        }
      })
    }

    // Create metrics index if it doesn't exist
    const metricsExists = await client.indices.exists({ index: 'cogniview-metrics' })
    // @ts-ignore - Handle different client versions
    if (!metricsExists.body && !metricsExists) {
      await client.indices.create({
        index: 'cogniview-metrics',
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            timestamp: { type: 'date' },
            metric_name: { type: 'keyword' },
            metric_value: { type: 'double' },
            unit: { type: 'keyword' },
            source: { type: 'keyword' },
            metadata: { type: 'object' }
          }
        }
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to initialize ELK indices:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}