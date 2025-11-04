import { NextRequest, NextResponse } from 'next/server'
import { sendMetricToELK } from '@/lib/elk'

export async function POST(request: NextRequest) {
  try {
    const metricData = await request.json()
    
    // Send to ELK Stack
    const result = await sendMetricToELK(metricData)
    
    return NextResponse.json({ 
      success: true, 
      elk_result: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('ELK Metrics API Error:', error)
    
    // Don't fail the request if ELK is down
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'ELK metrics failed',
      fallback: 'logged_to_supabase_only'
    }, { status: 200 }) // Return 200 so client doesn't fail
  }
}