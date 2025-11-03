export interface Product {
  id: number
  name: string
  description?: string
  price: number
  stock: number
  category?: string
  image_url?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Order {
  id?: number
  user_id?: string
  product_id: number
  product_name: string
  price: number
  quantity: number
  total_amount: number
  created_at?: string
}

export interface Log {
  id?: number
  user_id?: string | null
  event_name: string
  event_type?: 'user' | 'system' | 'error' | 'incident'
  severity?: 'info' | 'warning' | 'error' | 'critical'
  message: string
  metadata?: Record<string, any>
  created_at?: string
}

export interface Metric {
  id?: number
  user_id?: string | null
  metric_name: string
  metric_value: number
  unit?: string
  metadata?: Record<string, any>
  created_at?: string
}

export interface CleanedLog {
  id?: number
  original_log_id?: number
  cleaned_event_name: string
  normalized_severity: string
  category: string
  tags: string[]
  cleaned_message: string
  confidence_score: number
  processed_at?: string
  created_at?: string
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  role: 'customer' | 'admin' | 'monitor'
  created_at?: string
  updated_at?: string
}
