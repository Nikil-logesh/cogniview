'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

export default function OrderSuccessPage() {
  const router = useRouter()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-lg shadow-xl p-12">
            {/* Success Icon */}
            <div className="mb-6">
              <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Order Placed Successfully!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Thank you for your purchase. Your order has been received and is being processed.
            </p>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <p className="text-sm text-gray-600 mb-2">
                You will receive an order confirmation email shortly.
              </p>
              <p className="text-sm text-gray-600">
                You can track your order status in your account.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/orders')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                View My Orders
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Continue Shopping
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-8 pt-8 border-t">
              <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-blue-600 text-sm font-bold">1</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    You'll receive an order confirmation email
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-blue-600 text-sm font-bold">2</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    We'll process and prepare your order for shipping
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-blue-600 text-sm font-bold">3</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    You'll get a shipping notification with tracking information
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
