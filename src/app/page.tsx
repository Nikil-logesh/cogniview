'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { useTelemetry } from '@/hooks/useTelemetry'
import Header from '@/components/Header'

interface CartItem extends Product {
  quantity: number
}

type SortOption = 'price-asc' | 'price-desc' | 'name' | 'newest' | 'popular'

export default function Home() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [buyingProduct, setBuyingProduct] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [showFilters, setShowFilters] = useState(false)
  
  // Wishlist
  const [wishlist, setWishlist] = useState<number[]>([])
  
  // Quick View
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  
  const { user } = useAuth()
  const { logEvent, recordMetric, reportError } = useTelemetry()

  function addDebugLog(message: string) {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setDebugLog(prev => [...prev, logMessage].slice(-10)) // Keep last 10 logs
  }

  useEffect(() => {
    fetchProducts()
    logEvent('page_view', { page: 'home' }, { eventType: 'user' })
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
    
    // Load wishlist from localStorage
    const savedWishlist = localStorage.getItem('wishlist')
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist))
    }
  }, [])

  useEffect(() => {
    // Save cart to localStorage whenever it changes
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart))
    } else {
      localStorage.removeItem('cart')
    }
  }, [cart])

  useEffect(() => {
    // Auto-hide notification after 3 seconds
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Filter and Search Products
  useEffect(() => {
    let filtered = [...products]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Price range filter
    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
        filtered.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return dateB - dateA
        })
        break
      case 'popular':
      default:
        // Keep original order (or add popularity logic later)
        break
    }

    setFilteredProducts(filtered)
  }, [products, searchQuery, selectedCategory, priceRange, sortBy])

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist))
  }, [wishlist])

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ message, type })
  }

  async function fetchProducts() {
    const startTime = performance.now()
    addDebugLog('[LOAD] Fetching products from Supabase...')
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true })

      const endTime = performance.now()
      const fetchDuration = endTime - startTime

      if (error) throw error
      
      setProducts(data || [])
      addDebugLog(`[SUCCESS] Loaded ${data?.length || 0} products in ${fetchDuration.toFixed(0)}ms`)
      await recordMetric('product_fetch_latency', parseFloat(fetchDuration.toFixed(2)), 'ms')
      await logEvent('products_loaded', { count: data?.length || 0, duration: fetchDuration })
    } catch (error) {
      console.error('Error fetching products:', error)
      addDebugLog(`[ERROR] Failed to fetch products: ${error}`)
      await reportError(error as Error, { context: 'fetchProducts' })
      alert('Failed to load products. Please check your Supabase configuration.')
    } finally {
      setLoading(false)
    }
  }

  function handleBuyNow(product: Product, quantity: number = 1) {
    if (product.stock <= 0) {
      showNotification('Sorry, this product is out of stock!', 'error')
      return
    }

    // Add to cart
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity
        if (newQuantity > product.stock) {
          showNotification(`Only ${product.stock} units available!`, 'error')
          return prevCart
        }
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        )
      } else {
        if (quantity > product.stock) {
          showNotification(`Only ${product.stock} units available!`, 'error')
          return prevCart
        }
        return [...prevCart, { ...product, quantity }]
      }
    })

    // Log event
    logEvent('buy_now_clicked', { 
      product_id: product.id, 
      product_name: product.name,
      quantity 
    }, { eventType: 'user' })

    // Redirect to checkout page immediately
    setTimeout(() => {
      router.push('/checkout')
    }, 100) // Small delay to ensure cart state is updated
  }

  function addToCart(product: Product, quantity: number = 1) {
    if (product.stock <= 0) {
      showNotification('Sorry, this product is out of stock!', 'error')
      return
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity
        if (newQuantity > product.stock) {
          showNotification(`Only ${product.stock} units available!`, 'error')
          return prevCart
        }
        showNotification(`Updated ${product.name} quantity in cart`, 'success')
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        )
      } else {
        if (quantity > product.stock) {
          showNotification(`Only ${product.stock} units available!`, 'error')
          return prevCart
        }
        showNotification(`Added ${product.name} to cart`, 'success')
        return [...prevCart, { ...product, quantity }]
      }
    })

    logEvent('add_to_cart', { 
      product_id: product.id, 
      product_name: product.name,
      quantity 
    }, { eventType: 'user' })
  }

  function removeFromCart(productId: number) {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
    showNotification('Item removed from cart', 'success')
  }

  function updateCartQuantity(productId: number, newQuantity: number) {
    const product = products.find(p => p.id === productId)
    if (!product) return

    if (newQuantity > product.stock) {
      showNotification(`Only ${product.stock} units available!`, 'error')
      return
    }

    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  async function checkout() {
    if (cart.length === 0) {
      showNotification('Your cart is empty!', 'error')
      return
    }

    // Save cart and redirect to checkout page
    localStorage.setItem('cart', JSON.stringify(cart))
    addDebugLog('[CHECKOUT] Redirecting to checkout page...')
    router.push('/checkout')
  }

  function toggleWishlist(productId: number) {
    setWishlist(prev => {
      if (prev.includes(productId)) {
        showNotification('Removed from wishlist', 'success')
        return prev.filter(id => id !== productId)
      } else {
        showNotification('Added to wishlist', 'success')
        logEvent('wishlist_add', { product_id: productId }, { eventType: 'user' })
        return [...prev, productId]
      }
    })
  }

  function openQuickView(product: Product) {
    setQuickViewProduct(product)
    logEvent('product_quick_view', { product_id: product.id, product_name: product.name }, { eventType: 'user' })
  }

  function getCategories() {
    const categories = products
      .map(p => p.category)
      .filter((cat): cat is string => !!cat)
    return ['all', ...Array.from(new Set(categories))]
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      
      {/* Debug Panel */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 left-4 z-50 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700"
        title="Toggle Debug Panel"
      >
        🐛
      </button>

      {showDebug && (
        <div className="fixed bottom-16 left-4 z-50 bg-black bg-opacity-90 text-green-400 p-4 rounded-lg shadow-xl max-w-md max-h-96 overflow-y-auto font-mono text-xs">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-white">Debug Log</h3>
            <button onClick={() => setDebugLog([])} className="text-red-400 hover:text-red-300">Clear</button>
          </div>
          {debugLog.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            debugLog.map((log, idx) => (
              <div key={idx} className="border-b border-gray-700 py-1">{log}</div>
            ))
          )}
        </div>
      )}
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg animate-slide-in ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Shopping Cart Button */}
      <button
        onClick={() => setShowCart(!showCart)}
        className="fixed top-20 right-4 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {cartItemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {cartItemCount}
          </span>
        )}
      </button>

      {/* Shopping Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowCart(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Shopping Cart</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{item.name}</h3>
                        <button
                          onClick={() => removeFromCart(item.id!)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-blue-600 font-bold">${item.price.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateCartQuantity(item.id!, item.quantity - 1)}
                          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="px-4">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id!, item.quantity + 1)}
                          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                        <span className="ml-auto font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold mb-4">
                    <span>Total:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={checkout}
                    disabled={buyingProduct === -1}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Search */}
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Cogniview Store
            </h1>
            
            {/* Prominent Search Bar */}
            <div className="max-w-2xl mx-auto mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products by name, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-4 pr-12 text-lg border-2 border-gray-300 rounded-full focus:outline-none focus:border-blue-500 shadow-lg"
                />
                <svg
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-600 mt-2">
                  Found {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                </p>
              )}
            </div>

            {/* Filters and Sort Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-md">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <label className="font-semibold text-gray-700">Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getCategories().map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range Filter */}
              <div className="flex items-center gap-2">
                <label className="font-semibold text-gray-700">
                  Price: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Adjust
                </button>
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <label className="font-semibold text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="popular">Popular</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="text-gray-600">
                Showing {filteredProducts.length} of {products.length} products
              </div>
            </div>

            {/* Price Range Slider (expanded) */}
            {showFilters && (
              <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
                <label className="block font-semibold text-gray-700 mb-2">Price Range</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-24 px-3 py-2 border border-gray-300 rounded"
                    min="0"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-24 px-3 py-2 border border-gray-300 rounded"
                    min="0"
                  />
                  <button
                    onClick={() => setPriceRange([0, 2000])}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </header>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'No products found matching your filters. Try adjusting your search.'
                    : 'No products available. Please add products to your Supabase database.'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 relative"
                >
                  {/* Wishlist Heart Icon */}
                  <button
                    onClick={() => toggleWishlist(product.id!)}
                    className="absolute top-3 right-3 z-10 bg-white rounded-full p-2 shadow-md hover:scale-110 transition-transform"
                  >
                    <svg
                      className={`w-6 h-6 ${wishlist.includes(product.id!) ? 'fill-red-500 text-red-500' : 'fill-none text-gray-400'}`}
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  {/* Product Image Placeholder */}
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative cursor-pointer" onClick={() => openQuickView(product)}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                    {/* Quick View Badge */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 flex items-center justify-center transition-all">
                      <span className="opacity-0 hover:opacity-100 text-white font-semibold">Quick View</span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {/* Category Badge */}
                    {product.category && (
                      <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full mb-2">
                        {product.category}
                      </span>
                    )}
                    
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {product.name}
                    </h2>
                    
                    {/* Description snippet */}
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    
                    {/* Star Rating (Static for now) */}
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                      <span className="text-sm text-gray-600 ml-1">(4.5)</span>
                    </div>
                    
                    <p className="text-3xl font-bold text-blue-600 mb-3">
                      ${product.price.toFixed(2)}
                    </p>
                    
                    {/* Stock Indicator */}
                    <p className="text-sm text-gray-600 mb-4">
                      {product.stock > 10 ? (
                        <span className="text-green-600 font-semibold">✓ In Stock</span>
                      ) : product.stock > 0 ? (
                        <span className="text-orange-600 font-semibold">⚠ Only {product.stock} left!</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Out of Stock</span>
                      )}
                    </p>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToCart(product, 1)}
                        disabled={product.stock <= 0}
                        className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                          product.stock > 0
                            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => handleBuyNow(product, 1)}
                        disabled={product.stock <= 0 || buyingProduct === product.id}
                        className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                          product.stock > 0 && buyingProduct !== product.id
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {buyingProduct === product.id
                          ? 'Processing...'
                          : product.stock > 0
                          ? 'Buy Now'
                          : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Breadcrumbs */}
          <div className="mt-8 text-sm text-gray-600">
            <span>Home</span>
            {selectedCategory !== 'all' && (
              <>
                <span className="mx-2">›</span>
                <span className="font-semibold">{selectedCategory}</span>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-70" onClick={() => setQuickViewProduct(null)} />
          <div className="absolute inset-4 md:inset-10 lg:inset-20 bg-white rounded-lg shadow-2xl overflow-y-auto">
            <div className="relative p-8">
              {/* Close Button */}
              <button
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Product Image */}
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center h-96">
                  {quickViewProduct.image_url ? (
                    <img src={quickViewProduct.image_url} alt={quickViewProduct.name} className="max-h-full object-contain" />
                  ) : (
                    <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>

                {/* Product Details */}
                <div>
                  {quickViewProduct.category && (
                    <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full mb-3">
                      {quickViewProduct.category}
                    </span>
                  )}
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {quickViewProduct.name}
                  </h2>

                  {/* Star Rating */}
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                    <span className="text-gray-600 ml-2">(127 reviews)</span>
                  </div>

                  <p className="text-4xl font-bold text-blue-600 mb-6">
                    ${quickViewProduct.price.toFixed(2)}
                  </p>

                  {/* Stock Status */}
                  <div className="mb-6">
                    {quickViewProduct.stock > 10 ? (
                      <span className="text-green-600 font-semibold text-lg">✓ In Stock</span>
                    ) : quickViewProduct.stock > 0 ? (
                      <span className="text-orange-600 font-semibold text-lg">⚠ Only {quickViewProduct.stock} left!</span>
                    ) : (
                      <span className="text-red-600 font-semibold text-lg">✗ Out of Stock</span>
                    )}
                  </div>

                  {/* Description */}
                  {quickViewProduct.description && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700">{quickViewProduct.description}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        addToCart(quickViewProduct, 1)
                        setQuickViewProduct(null)
                      }}
                      disabled={quickViewProduct.stock <= 0}
                      className="flex-1 bg-gray-800 text-white py-4 rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => {
                        handleBuyNow(quickViewProduct, 1)
                        setQuickViewProduct(null)
                      }}
                      disabled={quickViewProduct.stock <= 0}
                      className="flex-1 bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Buy Now
                    </button>
                    <button
                      onClick={() => toggleWishlist(quickViewProduct.id!)}
                      className="px-6 py-4 border-2 border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50"
                    >
                      <svg
                        className={`w-6 h-6 ${wishlist.includes(quickViewProduct.id!) ? 'fill-red-500 text-red-500' : 'fill-none text-gray-400'}`}
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* Key Features */}
                  <div className="mt-8 border-t pt-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Key Features</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>✓ Free shipping on orders over $50</li>
                      <li>✓ 30-day money-back guarantee</li>
                      <li>✓ 1-year warranty included</li>
                      <li>✓ 24/7 customer support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

