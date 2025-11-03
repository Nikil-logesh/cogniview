import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * IBM Data Prep Kit Integration Endpoint
 * 
 * This endpoint provides logs and metrics data to IBM Data Prep Kit
 * for cleaning, analysis, and AI processing with watsonx.ai
 * 
 * Usage:
 * - GET /api/ibm-logs?days=7&limit=1000
 * - Returns JSON with logs and metrics from the specified time period
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const days = parseInt(searchParams.get('days') || '7', 10)
    const limit = parseInt(searchParams.get('limit') || '1000', 10)
    const eventType = searchParams.get('event_type') || null
    const severity = searchParams.get('severity') || null

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    console.log(`Fetching logs: days=${days}, limit=${limit}, from=${startDate.toISOString()}`)

    // Build logs query
    let logsQuery = supabase
      .from('logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters if provided
    if (eventType) {
      logsQuery = logsQuery.eq('event_type', eventType)
    }
    if (severity) {
      logsQuery = logsQuery.eq('severity', severity)
    }

    // Fetch logs
    const { data: logs, error: logsError } = await logsQuery

    if (logsError) {
      console.error('Error fetching logs:', logsError)
      throw logsError
    }

    // Fetch metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
      throw metricsError
    }

    // Calculate summary statistics
    const errorCount = logs?.filter(log => log.severity === 'error').length || 0
    const warningCount = logs?.filter(log => log.severity === 'warning').length || 0
    const infoCount = logs?.filter(log => log.severity === 'info').length || 0

    // Get event type distribution
    const eventTypeCounts = logs?.reduce((acc: Record<string, number>, log) => {
      acc[log.event_type] = (acc[log.event_type] || 0) + 1
      return acc
    }, {}) || {}

    // Get metric statistics
    const metricStats = metrics?.reduce((acc: Record<string, { count: number; sum: number; avg: number }>, metric) => {
      if (!acc[metric.metric_name]) {
        acc[metric.metric_name] = { count: 0, sum: 0, avg: 0 }
      }
      acc[metric.metric_name].count++
      acc[metric.metric_name].sum += parseFloat(metric.metric_value)
      acc[metric.metric_name].avg = acc[metric.metric_name].sum / acc[metric.metric_name].count
      return acc
    }, {}) || {}

    // Return structured response for IBM Data Prep Kit
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      query: {
        days_requested: days,
        limit_requested: limit,
        filters: {
          event_type: eventType,
          severity: severity
        },
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
    }

    console.log(`Successfully fetched ${logs?.length || 0} logs and ${metrics?.length || 0} metrics`)

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow CORS for IBM Data Prep Kit
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Error in IBM logs endpoint:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch logs and metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
