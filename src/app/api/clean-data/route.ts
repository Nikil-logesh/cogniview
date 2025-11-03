import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { CleanedLog } from '@/types/database'

/**
 * IBM Data Prep Kit Integration API
 * This endpoint simulates data cleaning and normalization
 * In production, this would call the actual IBM Data Prep Kit API
 */
export async function POST(request: NextRequest) {
  try {
    // Fetch recent uncleaned logs
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (logsError) throw logsError

    if (!logs || logs.length === 0) {
      return NextResponse.json({
        success: true,
        cleaned_count: 0,
        message: 'No logs to clean'
      })
    }

    // Check if IBM Data Prep Kit API is configured
    const ibmApiKey = process.env.IBM_DATA_PREP_KIT_API_KEY
    const ibmEndpoint = process.env.IBM_DATA_PREP_KIT_ENDPOINT

    let cleanedLogs: CleanedLog[] = []

    if (ibmApiKey && ibmEndpoint && ibmApiKey !== 'your_ibm_api_key_here') {
      // Production: Call actual IBM Data Prep Kit API
      try {
        cleanedLogs = await callIBMDataPrepKit(logs, ibmApiKey, ibmEndpoint)
      } catch (error) {
        console.error('IBM API call failed, using local cleaning:', error)
        cleanedLogs = simulateDataCleaning(logs)
      }
    } else {
      // Development: Simulate data cleaning locally
      console.log('IBM API not configured, using local simulation')
      cleanedLogs = simulateDataCleaning(logs)
    }

    // Insert cleaned logs into database
    const { error: insertError } = await supabase
      .from('cleaned_logs')
      .insert(cleanedLogs)

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      cleaned_count: cleanedLogs.length,
      message: `Successfully cleaned ${cleanedLogs.length} log entries`
    })
  } catch (error) {
    console.error('Error cleaning data:', error)
    return NextResponse.json(
      { error: 'Failed to clean data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Simulate IBM Data Prep Kit cleaning logic
 * This mimics what the actual IBM service would do:
 * - Parse and normalize timestamps
 * - Categorize events
 * - Tag and classify
 * - Calculate confidence scores
 */
function simulateDataCleaning(logs: any[]): CleanedLog[] {
  return logs.map((log) => {
    const eventName = log.event_name.toLowerCase()
    
    // Determine category
    let category = 'system_health'
    if (eventName.includes('user') || eventName.includes('login') || eventName.includes('signup') || eventName.includes('purchase')) {
      category = 'user_activity'
    } else if (eventName.includes('error') || eventName.includes('failed') || eventName.includes('incident')) {
      category = 'incident_alert'
    }

    // Normalize severity
    const severityMap: Record<string, string> = {
      'info': 'INFO',
      'warning': 'WARNING',
      'error': 'ERROR',
      'critical': 'CRITICAL',
    }
    const normalized_severity = severityMap[log.severity] || 'INFO'

    // Generate tags
    const tags: string[] = []
    if (log.event_type) tags.push(log.event_type)
    if (log.severity) tags.push(log.severity)
    if (eventName.includes('order')) tags.push('e-commerce')
    if (eventName.includes('stock')) tags.push('inventory')
    if (eventName.includes('latency') || eventName.includes('performance')) tags.push('performance')
    if (eventName.includes('error') || eventName.includes('failed')) tags.push('failure')
    if (eventName.includes('success')) tags.push('success')

    // Clean and enhance message
    let cleaned_message = log.message
    try {
      // Try to extract structured data from message
      const metadata = log.metadata || {}
      if (Object.keys(metadata).length > 0) {
        cleaned_message = `${log.event_name}: ${JSON.stringify(metadata, null, 0)}`
      }
    } catch (e) {
      // Keep original message if parsing fails
    }

    // Calculate confidence score based on data quality
    let confidence = 0.85
    if (log.metadata && Object.keys(log.metadata).length > 0) confidence += 0.10
    if (log.user_id) confidence += 0.05
    confidence = Math.min(confidence, 1.0)

    return {
      original_log_id: log.id,
      cleaned_event_name: capitalizeWords(log.event_name.replace(/_/g, ' ')),
      normalized_severity,
      category,
      tags,
      cleaned_message,
      confidence_score: confidence,
    }
  })
}

/**
 * Call actual IBM Data Prep Kit API (Production)
 */
async function callIBMDataPrepKit(logs: any[], apiKey: string, endpoint: string): Promise<CleanedLog[]> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: logs,
      operations: [
        'normalize_timestamps',
        'categorize_events',
        'extract_entities',
        'tag_classification',
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`IBM API returned ${response.status}`)
  }

  const result = await response.json()
  
  // Map IBM response to our cleaned log format
  return result.cleaned_data.map((item: any) => ({
    original_log_id: item.id,
    cleaned_event_name: item.event_name,
    normalized_severity: item.severity,
    category: item.category,
    tags: item.tags || [],
    cleaned_message: item.message,
    confidence_score: item.confidence || 0.8,
  }))
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase())
}
