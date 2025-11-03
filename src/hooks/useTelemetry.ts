'use client'

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Log, Metric } from '@/types/database'

export function useTelemetry() {
  /**
   * Log an event (user action or system event)
   */
  const logEvent = useCallback(async (
    eventName: string,
    metadata?: Record<string, any>,
    options?: {
      eventType?: 'user' | 'system' | 'error' | 'incident'
      severity?: 'info' | 'warning' | 'error' | 'critical'
    }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const logData: Log = {
        user_id: user?.id || null,
        event_name: eventName,
        event_type: options?.eventType || 'system',
        severity: options?.severity || 'info',
        message: `${eventName}: ${JSON.stringify(metadata || {})}`,
        metadata: metadata || {},
      }

      const { error } = await supabase.from('logs').insert([logData])

      if (error) {
        console.error('Failed to log event:', error)
      } else {
        console.log(`📊 Event logged: ${eventName}`)
      }
    } catch (error) {
      console.error('Telemetry error:', error)
    }
  }, [])

  /**
   * Record a performance or system metric
   */
  const recordMetric = useCallback(async (
    metricName: string,
    value: number,
    unit?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const metricData: Metric = {
        user_id: user?.id || null,
        metric_name: metricName,
        metric_value: value,
        unit: unit || 'count',
        metadata: metadata || {},
      }

      const { error } = await supabase.from('metrics').insert([metricData])

      if (error) {
        console.error('Failed to record metric:', error)
      } else {
        console.log(`📈 Metric recorded: ${metricName} = ${value}${unit || ''}`)
      }
    } catch (error) {
      console.error('Telemetry error:', error)
    }
  }, [])

  /**
   * Report a client-side error
   */
  const reportError = useCallback(async (
    error: Error | string,
    context?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const errorMessage = typeof error === 'string' ? error : error.message
      const errorStack = typeof error === 'string' ? undefined : error.stack

      const logData: Log = {
        user_id: user?.id || null,
        event_name: 'client_error',
        event_type: 'error',
        severity: 'error',
        message: errorMessage,
        metadata: {
          stack: errorStack,
          context,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
          timestamp: new Date().toISOString(),
        },
      }

      const { error: logError } = await supabase.from('logs').insert([logData])

      if (logError) {
        console.error('Failed to report error:', logError)
      } else {
        console.error(`🚨 Error reported: ${errorMessage}`)
      }
    } catch (err) {
      console.error('Failed to report error:', err)
    }
  }, [])

  /**
   * Simulate an incident for testing
   */
  const simulateIncident = useCallback(async (incidentType: string) => {
    await logEvent(`simulated_${incidentType}`, {
      simulated: true,
      type: incidentType,
    }, {
      eventType: 'incident',
      severity: 'critical',
    })

    // Also record synthetic metrics
    await recordMetric('cpu_usage', Math.random() * 100, 'percent', { simulated: true })
    await recordMetric('error_rate', Math.random() * 50, 'count', { simulated: true })
  }, [logEvent, recordMetric])

  return {
    logEvent,
    recordMetric,
    reportError,
    simulateIncident,
  }
}
