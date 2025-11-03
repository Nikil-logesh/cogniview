import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Order, Log } from '@/types/database'

// GET endpoint to retrieve orders
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        userId = user?.id || null
      } catch (e) {
        console.log('No valid auth token')
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // If user is authenticated, filter by user_id
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    }

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0
    })
  } catch (error) {
    console.error('Error processing orders request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from authorization header if present
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        userId = user?.id || null
      } catch (e) {
        // Continue without user ID
        console.log('No valid auth token')
      }
    }

    const body = await request.json()
    const { 
      product_id, 
      product_name, 
      price, 
      quantity = 1, 
      user_id,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_zip,
      shipping_country,
      billing_address_line1,
      billing_address_line2,
      billing_city,
      billing_state,
      billing_zip,
      billing_country,
      same_as_shipping,
      shipping_method,
      shipping_cost,
      subtotal,
      discount_amount,
      promo_code,
      total_amount,
      is_guest_order,
      notes
    } = body

    // Use user_id from body if not from header
    const finalUserId = userId || user_id || null

    // Validate input
    if (!product_id || !product_name || !price) {
      await logEvent('order_validation_failed', 'Missing required fields', finalUserId, 'warning')
      return NextResponse.json(
        { error: 'Missing required fields: product_id, product_name, and price are required' },
        { status: 400 }
      )
    }

    // Validate quantity
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      await logEvent('order_validation_failed', `Invalid quantity: ${quantity}`, finalUserId, 'warning')
      return NextResponse.json(
        { error: 'Quantity must be a positive integer' },
        { status: 400 }
      )
    }

    // Validate price
    if (price <= 0 || isNaN(price)) {
      await logEvent('order_validation_failed', `Invalid price: ${price}`, finalUserId, 'warning')
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      )
    }

    // Check product exists and get current stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock, price')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      await logEvent('order_failed', `Product not found: ${product_id}`, finalUserId, 'error')
      return NextResponse.json(
        { error: `Product with ID ${product_id} not found` },
        { status: 404 }
      )
    }

    // Verify stock availability
    if (product.stock < quantity) {
      await logEvent('order_failed', `Insufficient stock for product ${product_name}. Requested: ${quantity}, Available: ${product.stock}`, finalUserId, 'warning')
      return NextResponse.json(
        { error: `Insufficient stock. Only ${product.stock} units available` },
        { status: 400 }
      )
    }

    // Verify price matches (prevent price manipulation)
    if (Math.abs(product.price - price) > 0.01) {
      await logEvent('order_failed', `Price mismatch for product ${product_name}. Expected: ${product.price}, Received: ${price}`, finalUserId, 'error')
      return NextResponse.json(
        { error: 'Price mismatch. Please refresh and try again.' },
        { status: 400 }
      )
    }

    // Create order
    const calculatedTotal = total_amount || (price * quantity)
    const orderData: any = {
      user_id: finalUserId,
      product_id,
      product_name,
      price,
      quantity,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_zip,
      shipping_country,
      billing_address_line1,
      billing_address_line2,
      billing_city,
      billing_state,
      billing_zip,
      billing_country,
      same_as_shipping,
      shipping_method,
      shipping_cost: shipping_cost || 0,
      subtotal: subtotal || (price * quantity),
      discount_amount: discount_amount || 0,
      promo_code,
      total_amount: calculatedTotal,
      is_guest_order: is_guest_order || false,
      notes,
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single()

    if (orderError) {
      await logEvent('order_failed', `Failed to create order: ${orderError.message}`, finalUserId, 'error')
      console.error('Order creation error:', orderError)
      console.error('Order data attempted:', JSON.stringify(orderData, null, 2))
      return NextResponse.json(
        { 
          error: 'Failed to create order. Please try again.',
          details: orderError.message,
          hint: orderError.hint,
          code: orderError.code
        },
        { status: 500 }
      )
    }

    // Log order placed event
    await logEvent('order_placed', `Order #${order.id} placed for ${product_name}, quantity: ${quantity}, total: $${calculatedTotal.toFixed(2)}`, finalUserId, 'info')

    // Update product stock
    const newStock = product.stock - quantity
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', product_id)

    if (updateError) {
      await logEvent('stock_update_failed', `Failed to update stock for product ${product_name}: ${updateError.message}`, finalUserId, 'error')
      console.error('Stock update error:', updateError)
      // Note: Order was created but stock wasn't updated - this should be handled by monitoring
      return NextResponse.json({
        success: true,
        order,
        warning: 'Order created but stock update failed. Please contact support.'
      })
    }

    // Log stock updated event
    await logEvent('stock_updated', `Stock updated for ${product_name}, new stock: ${newStock}`, finalUserId, 'info')

    return NextResponse.json({
      success: true,
      order,
      message: 'Order placed successfully'
    })
  } catch (error) {
    console.error('Error processing order:', error)
    
    // Log the error
    try {
      await logEvent('order_critical_error', `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, 'error')
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process order', 
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
      },
      { status: 500 }
    )
  }
}

// Helper function to log events
async function logEvent(event_name: string, message: string, user_id?: string, severity: string = 'info') {
  const logData: Log = {
    user_id: user_id || null,
    event_name,
    event_type: 'system',
    severity: severity as any,
    message,
  }

  const { error } = await supabase
    .from('logs')
    .insert([logData])

  if (error) {
    console.error('Failed to log event:', error)
  }
}

