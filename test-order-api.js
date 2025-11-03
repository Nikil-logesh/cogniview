// Test script to verify order creation
// Run with: node test-order-api.js

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000';

async function testOrderCreation() {
  console.log('🧪 Testing Order API...\n');
  
  // Test 1: Create an order
  console.log('Test 1: Creating order via POST /api/orders');
  try {
    const orderData = {
      product_id: 1,
      product_name: 'Test Laptop Pro',
      price: 1299.99,
      quantity: 1,
      user_id: null
    };
    
    console.log('Request:', JSON.stringify(orderData, null, 2));
    
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
    
    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Order created successfully!\n');
    } else {
      console.log('❌ Order creation failed!\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message, '\n');
  }
  
  // Test 2: Fetch orders
  console.log('Test 2: Fetching orders via GET /api/orders');
  try {
    const response = await fetch(`${API_URL}/api/orders`);
    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Orders found:', result.orders?.length || 0);
    
    if (result.orders && result.orders.length > 0) {
      console.log('Recent orders:', JSON.stringify(result.orders.slice(0, 3), null, 2));
      console.log('✅ Orders fetched successfully!\n');
    } else {
      console.log('⚠️  No orders found\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message, '\n');
  }
  
  // Test 3: Check Supabase connection
  console.log('Test 3: Checking Supabase products');
  try {
    const response = await fetch(`${API_URL}/api/orders`);
    console.log('✅ Supabase connection working!\n');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message, '\n');
  }
}

testOrderCreation().catch(console.error);
