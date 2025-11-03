'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTelemetry } from '@/hooks/useTelemetry'
import Header from '@/components/Header'
import { useRouter } from 'next/navigation'
import { Log, Metric, CleanedLog } from '@/types/database'
import { format } from 'date-fns'

export default function MonitorPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { simulateIncident, logEvent } = useTelemetry()
  
  const [logs, setLogs] = useState<Log[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [cleanedLogs, setCleanedLogs] = useState<CleanedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [cleaningInProgress, setCleaningInProgress] = useState(false)
  const [activeTab, setActiveTab] = useState<'logs' | 'metrics' | 'cleaned'>('logs')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    fetchTelemetryData()
    logEvent('monitor_page_view', { page: 'monitor' }, { eventType: 'user' })
    
    // Set up real-time subscription for logs
    const logsSubscription = supabase
      .channel('logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, () => {
        fetchLogs()
      })
      .subscribe()

    const metricsSubscription = supabase
      .channel('metrics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metrics' }, () => {
        fetchMetrics()
      })
      .subscribe()

    return () => {
      logsSubscription.unsubscribe()
      metricsSubscription.unsubscribe()
    }
  }, [user])

  const fetchTelemetryData = async () => {
    setLoading(true)
    await Promise.all([fetchLogs(), fetchMetrics(), fetchCleanedLogs()])
    setLoading(false)
  }

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setLogs(data)
    }
  }

  const fetchMetrics = async () => {
    const { data, error } = await supabase
      .from('metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setMetrics(data)
    }
  }

  const fetchCleanedLogs = async () => {
    const { data, error } = await supabase
      .from('cleaned_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setCleanedLogs(data)
    }
  }

  const handleSimulateIncident = async (type: string) => {
    await simulateIncident(type)
    setTimeout(fetchTelemetryData, 500)
  }

  const handleCleanData = async () => {
    setCleaningInProgress(true)
    try {
      const response = await fetch('/api/clean-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()
      
      if (response.ok) {
        alert(`Successfully cleaned ${result.cleaned_count} log entries!`)
        await fetchCleanedLogs()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      alert('Failed to clean data: ' + (error as Error).message)
    } finally {
      setCleaningInProgress(false)
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getEventTypeColor = (type?: string) => {
    switch (type) {
      case 'incident': return 'bg-red-500 text-white'
      case 'error': return 'bg-orange-500 text-white'
      case 'user': return 'bg-blue-500 text-white'
      case 'system': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Calculate summary stats
  const totalLogs = logs.length
  const errorCount = logs.filter(l => l.severity === 'error' || l.severity === 'critical').length
  const avgMetricValue = metrics.length > 0 
    ? (metrics.reduce((sum, m) => sum + m.metric_value, 0) / metrics.length).toFixed(2)
    : '0'

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading telemetry data...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Telemetry Monitor</h1>
            <p className="text-gray-600">Real-time system monitoring and IBM Data Prep Kit integration</p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Events</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{totalLogs}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Error Count</div>
              <div className="text-3xl font-bold text-red-600 mt-2">{errorCount}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Metrics Recorded</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{metrics.length}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Cleaned Logs</div>
              <div className="text-3xl font-bold text-green-600 mt-2">{cleanedLogs.length}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleSimulateIncident('server_error')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                🚨 Simulate Server Error
              </button>
              <button
                onClick={() => handleSimulateIncident('high_latency')}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
              >
                ⚠️ Simulate High Latency
              </button>
              <button
                onClick={() => handleSimulateIncident('database_timeout')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition"
              >
                ⏱️ Simulate DB Timeout
              </button>
              <button
                onClick={handleCleanData}
                disabled={cleaningInProgress}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50"
              >
                {cleaningInProgress ? '🔄 Cleaning...' : '🧹 Clean Data with IBM Kit'}
              </button>
              <button
                onClick={fetchTelemetryData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'logs'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Event Logs ({logs.length})
                </button>
                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'metrics'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Metrics ({metrics.length})
                </button>
                <button
                  onClick={() => setActiveTab('cleaned')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'cleaned'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  IBM Cleaned Data ({cleanedLogs.length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Logs Tab */}
              {activeTab === 'logs' && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No logs yet. Start using the app to generate telemetry!</p>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className={`border-l-4 p-4 rounded ${getSeverityColor(log.severity)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getEventTypeColor(log.event_type)}`}>
                                {log.event_type}
                              </span>
                              <span className="font-semibold">{log.event_name}</span>
                              <span className="text-xs text-gray-500">
                                {log.created_at && format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{log.message}</p>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-gray-600 cursor-pointer">View metadata</summary>
                                <pre className="text-xs mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Metrics Tab */}
              {activeTab === 'metrics' && (
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {metrics.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                            No metrics recorded yet
                          </td>
                        </tr>
                      ) : (
                        metrics.map((metric) => (
                          <tr key={metric.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {metric.metric_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {metric.metric_value.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {metric.unit || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {metric.created_at && format(new Date(metric.created_at), 'MMM dd, HH:mm:ss')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cleaned Data Tab */}
              {activeTab === 'cleaned' && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {cleanedLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No cleaned data available yet.</p>
                      <button
                        onClick={handleCleanData}
                        disabled={cleaningInProgress}
                        className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50"
                      >
                        {cleaningInProgress ? 'Cleaning...' : '🧹 Clean Data with IBM Kit'}
                      </button>
                    </div>
                  ) : (
                    cleanedLogs.map((cleanedLog) => (
                      <div
                        key={cleanedLog.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="inline-block px-3 py-1 text-sm font-semibold text-purple-700 bg-purple-200 rounded">
                              {cleanedLog.category}
                            </span>
                            <span className="ml-2 text-sm font-medium text-gray-700">
                              {cleanedLog.cleaned_event_name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            Confidence: {(cleanedLog.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{cleanedLog.cleaned_message}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {cleanedLog.tags?.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Processed: {cleanedLog.processed_at && format(new Date(cleanedLog.processed_at), 'MMM dd, HH:mm:ss')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
