'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  stock: number
}

interface ShippingInfo {
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
}

interface ShippingMethod {
  id: string
  name: string
  cost: number
  estimatedDays: string
}

const shippingMethods: ShippingMethod[] = [
  { id: 'standard', name: 'Standard Shipping', cost: 10.00, estimatedDays: '5-7 business days' },
  { id: 'express', name: 'Express Shipping', cost: 25.00, estimatedDays: '2-3 business days' },
  { id: 'overnight', name: 'Overnight Shipping', cost: 45.00, estimatedDays: '1 business day' },
  { id: 'pickup', name: 'Store Pickup', cost: 0.00, estimatedDays: 'Available today' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [currentStep, setCurrentStep] = useState(1) // 1: Info, 2: Shipping, 3: Review, 4: Payment
  const [loading, setLoading] = useState(false)
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null)
  
  // Customer Info
  const [isGuest, setIsGuest] = useState(!user)
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  })
  
  const [billingAddressSame, setBillingAddressSame] = useState(true)
  const [billingInfo, setBillingInfo] = useState<ShippingInfo>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  })
  
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>(shippingMethods[0])
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    } else {
      router.push('/')
    }
  }, [])

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.08 // 8% tax
  const total = subtotal + selectedShipping.cost + tax - discount

  const handleShippingInfoChange = (field: keyof ShippingInfo, value: string) => {
    setShippingInfo(prev => ({ ...prev, [field]: value }))
  }

  const handleBillingInfoChange = (field: keyof ShippingInfo, value: string) => {
    setBillingInfo(prev => ({ ...prev, [field]: value }))
  }

  const validateStep1 = () => {
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.phone) {
      alert('Please fill in all required contact information')
      return false
    }
    if (!shippingInfo.address || !shippingInfo.city || !shippingInfo.state || !shippingInfo.zipCode) {
      alert('Please fill in all required address fields')
      return false
    }
    return true
  }

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const applyPromoCode = () => {
    // Simple promo code logic
    const codes: { [key: string]: number } = {
      'SAVE10': 10,
      'WELCOME20': 20,
      'FREESHIP': selectedShipping.cost,
    }
    
    if (codes[promoCode.toUpperCase()]) {
      setDiscount(codes[promoCode.toUpperCase()])
      alert(`Promo code applied! Saved $${codes[promoCode.toUpperCase()].toFixed(2)}`)
    } else {
      alert('Invalid promo code')
    }
  }

  const handlePlaceOrder = async () => {
    if (!paymentScreenshot) {
      alert('Please upload payment screenshot to complete your order')
      return
    }
    
    setLoading(true)
    
    try {
      // In a real app, you'd upload the screenshot to storage here
      // For now, we'll just process the order
      
      // Create orders for each cart item
      for (const item of cart) {
        const itemSubtotal = item.price * item.quantity
        const itemTotal = itemSubtotal + selectedShipping.cost - discount
        
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: item.id,
            product_name: item.name,
            price: item.price,
            quantity: item.quantity,
            user_id: user?.id || null,
            customer_email: shippingInfo.email,
            customer_name: shippingInfo.fullName,
            customer_phone: shippingInfo.phone,
            shipping_address_line1: shippingInfo.address,
            shipping_city: shippingInfo.city,
            shipping_state: shippingInfo.state,
            shipping_zip: shippingInfo.zipCode,
            shipping_country: shippingInfo.country,
            billing_address_line1: billingAddressSame ? shippingInfo.address : billingInfo.address,
            billing_city: billingAddressSame ? shippingInfo.city : billingInfo.city,
            billing_state: billingAddressSame ? shippingInfo.state : billingInfo.state,
            billing_zip: billingAddressSame ? shippingInfo.zipCode : billingInfo.zipCode,
            billing_country: billingAddressSame ? shippingInfo.country : billingInfo.country,
            same_as_shipping: billingAddressSame,
            shipping_method: selectedShipping.id,
            shipping_cost: selectedShipping.cost,
            subtotal: itemSubtotal,
            discount_amount: discount,
            promo_code: promoCode || null,
            total_amount: itemTotal,
            is_guest_order: isGuest,
            notes: `Payment screenshot uploaded: ${paymentScreenshot.name}`,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to place order for ${item.name}`)
        }
      }

      // Clear cart and payment info
      localStorage.removeItem('cart')
      setCart([])
      
      // Redirect to success page
      router.push('/order-success')
    } catch (error) {
      console.error('Order error:', error)
      alert('Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      setPaymentScreenshot(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPaymentPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  if (cart.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Continue Shopping
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Checkout</h1>

          {/* Progress Steps */}
          <div className="mb-8 flex justify-between items-center">
            {['Customer Info', 'Shipping', 'Review', 'Payment'].map((step, idx) => (
              <div key={idx} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep > idx + 1 ? 'bg-green-500' : currentStep === idx + 1 ? 'bg-blue-600' : 'bg-gray-300'
                } text-white font-bold text-sm`}>
                  {currentStep > idx + 1 ? '✓' : idx + 1}
                </div>
                <div className="ml-2 flex-1">
                  <p className={`font-semibold text-sm ${currentStep === idx + 1 ? 'text-blue-600' : 'text-gray-600'}`}>
                    {step}
                  </p>
                </div>
                {idx < 3 && <div className="flex-1 h-1 bg-gray-300 mx-2" />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2">
              {/* Step 1: Customer Information */}
              {currentStep === 1 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-2xl font-bold mb-6">Customer Information</h2>
                  
                  {!user && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700 mb-2">
                        Have an account?{' '}
                        <button
                          onClick={() => router.push('/login?redirect=/checkout')}
                          className="text-blue-600 font-semibold hover:underline"
                        >
                          Sign in
                        </button>
                      </p>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isGuest}
                          onChange={(e) => setIsGuest(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">Continue as guest</span>
                      </label>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.fullName}
                          onChange={(e) => handleShippingInfoChange('fullName', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={shippingInfo.email}
                          onChange={(e) => handleShippingInfoChange('email', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(e) => handleShippingInfoChange('phone', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <h3 className="text-xl font-semibold mt-6 mb-4">Shipping Address</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.address}
                        onChange={(e) => handleShippingInfoChange('address', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.city}
                          onChange={(e) => handleShippingInfoChange('city', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State/Province <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.state}
                          onChange={(e) => handleShippingInfoChange('state', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP/Postal Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.zipCode}
                          onChange={(e) => handleShippingInfoChange('zipCode', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={shippingInfo.country}
                          onChange={(e) => handleShippingInfoChange('country', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option>United States</option>
                          <option>Canada</option>
                          <option>Mexico</option>
                          <option>United Kingdom</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={billingAddressSame}
                          onChange={(e) => setBillingAddressSame(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">Billing address same as shipping</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Shipping Method */}
              {currentStep === 2 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-2xl font-bold mb-6">Select Shipping Method</h2>
                  
                  <div className="space-y-4">
                    {shippingMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedShipping.id === method.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShipping.id === method.id}
                          onChange={() => setSelectedShipping(method)}
                          className="mr-4"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{method.name}</p>
                          <p className="text-sm text-gray-600">{method.estimatedDays}</p>
                        </div>
                        <p className="font-bold text-lg">
                          {method.cost === 0 ? 'FREE' : `$${method.cost.toFixed(2)}`}
                        </p>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Review Order */}
              {currentStep === 3 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-2xl font-bold mb-6">Review Your Order</h2>
                  
                  {/* Shipping Info Summary */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-2">Shipping To:</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium">{shippingInfo.fullName}</p>
                      <p className="text-sm text-gray-600">{shippingInfo.email}</p>
                      <p className="text-sm text-gray-600">{shippingInfo.phone}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {shippingInfo.address}<br />
                        {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}<br />
                        {shippingInfo.country}
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-blue-600 text-sm mt-2 hover:underline"
                    >
                      Edit shipping information
                    </button>
                  </div>

                  {/* Shipping Method Summary */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-2">Shipping Method:</h3>
                    <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium">{selectedShipping.name}</p>
                        <p className="text-sm text-gray-600">{selectedShipping.estimatedDays}</p>
                      </div>
                      <p className="font-bold">
                        {selectedShipping.cost === 0 ? 'FREE' : `$${selectedShipping.cost.toFixed(2)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-blue-600 text-sm mt-2 hover:underline"
                    >
                      Change shipping method
                    </button>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Order Items:</h3>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center bg-gray-50 p-4 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          </div>
                          <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Payment Screenshot Upload */}
              {currentStep === 4 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-2xl font-bold mb-6">Payment Confirmation</h2>
                  
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">💳 Payment Instructions</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Please complete your payment and upload a screenshot as proof. We accept:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside mb-3">
                      <li>Bank Transfer / Wire Transfer</li>
                      <li>PayPal / Venmo</li>
                      <li>Zelle / Cash App</li>
                      <li>Credit/Debit Card</li>
                    </ul>
                    <div className="bg-white p-3 rounded border border-blue-300">
                      <p className="text-sm font-semibold text-gray-900">Total Amount Due:</p>
                      <p className="text-3xl font-bold text-blue-600">${total.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Payment Screenshot <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="payment-upload"
                      />
                      <label htmlFor="payment-upload" className="cursor-pointer">
                        {paymentPreview ? (
                          <div>
                            <img
                              src={paymentPreview}
                              alt="Payment screenshot"
                              className="max-h-64 mx-auto rounded-lg mb-4"
                            />
                            <p className="text-sm text-green-600 font-semibold">
                              ✓ {paymentScreenshot?.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Click to change
                            </p>
                          </div>
                        ) : (
                          <div>
                            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm text-gray-600 mb-1">
                              <span className="text-blue-600 font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                              PNG, JPG, GIF up to 5MB
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Security Badge */}
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Secure Upload</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span>Privacy Protected</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                {currentStep > 1 && (
                  <button
                    onClick={handlePrevStep}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    ← Back
                  </button>
                )}
                {currentStep < 4 ? (
                  <button
                    onClick={handleNextStep}
                    className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading || !paymentScreenshot}
                    className="ml-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Confirm & Place Order'}
                  </button>
                )}
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({cart.length} items)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>${selectedShipping.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (8%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                    <button
                      onClick={applyPromoCode}
                      className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Try: SAVE10, WELCOME20, FREESHIP
                  </p>
                </div>

                {/* Cart Items Preview */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3 text-sm">Items in your cart:</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.quantity}x {item.name}</span>
                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
