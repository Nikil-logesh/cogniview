import { NextRequest, NextResponse } from 'next/server'
import { searchLogs, searchMetrics, checkELKHealth } from '@/lib/elk'

// API endpoint for Data Prep Kit and real-time local sync
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const dataType = searchParams.get('type') || 'both' // logs, metrics, both, health, stream
    const days = parseFloat(searchParams.get('days') || '1') // Support fractional days (hours)
    const limit = parseInt(searchParams.get('limit') || '1000')
    const level = searchParams.get('level') || undefined
    const eventType = searchParams.get('event_type') || undefined
    const metricName = searchParams.get('metric_name') || undefined
    const format = searchParams.get('format') || 'json' // json, csv, txt
    const realtime = searchParams.get('realtime') === 'true' // Enable real-time mode
    
    // Health check endpoint
    if (dataType === 'health') {
      const health = await checkELKHealth()
      return NextResponse.json({
        status: 'ok',
        elk_healthy: health.healthy,
        timestamp: new Date().toISOString(),
        data_prep_kit_ready: true,
        realtime_sync_ready: true,
        api_endpoints: {
          logs: '/api/elk-data?type=logs',
          metrics: '/api/elk-data?type=metrics', 
          both: '/api/elk-data?type=both',
          realtime: '/api/elk-data?type=both&realtime=true&days=0.1'
        }
      })
    }

    const response: any = {
      timestamp: new Date().toISOString(),
      realtime_mode: realtime,
      query_params: {
        type: dataType,
        days,
        limit,
        level,
        event_type: eventType,
        metric_name: metricName,
        format,
        realtime
      },
      data: {},
      sync_info: {
        next_update_in_seconds: realtime ? 30 : 300,
        recommended_polling_interval: realtime ? '30s' : '5m',
        local_sync_command: `curl "${request.url}" > local_data.json`
      }
    }

    // Fetch logs if requested
    if (dataType === 'logs' || dataType === 'both') {
      const logs = await searchLogs({
        days,
        limit: dataType === 'both' ? Math.floor(limit / 2) : limit,
        level,
        event_type: eventType
      })
      
      response.data.logs = {
        count: logs.length,
        items: logs
      }
    }

    // Fetch metrics if requested
    if (dataType === 'metrics' || dataType === 'both') {
      const metrics = await searchMetrics({
        days,
        limit: dataType === 'both' ? Math.floor(limit / 2) : limit,
        metric_name: metricName
      })
      
      response.data.metrics = {
        count: metrics.length,
        items: metrics
      }
    }

    // Add summary for Data Prep Kit
    response.summary = {
      total_records: (response.data.logs?.count || 0) + (response.data.metrics?.count || 0),
      data_types: Object.keys(response.data),
      ready_for_cleaning: true,
      suggested_cleaning_operations: [
        'remove_duplicates',
        'normalize_timestamps',
        'extract_user_patterns',
        'classify_event_types',
        'detect_anomalies'
      ]
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('ELK Data API Error:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      elk_available: false
    }, { status: 500 })
  }
}

// OPTIONS for CORS (if needed for cross-origin requests)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}