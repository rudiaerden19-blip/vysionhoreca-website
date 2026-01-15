'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  category_id: string
  category_name: string
  is_available: boolean
  is_popular: boolean
  is_new: boolean
  is_spicy: boolean
  is_vegetarian: boolean
  is_vegan: boolean
  allergens: string[]
  options: any[]
}

interface Category {
  id: string
  name: string
  sort_order: number
}

export default function MenuPage({ params }: { params: { tenant: string } }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [cart, setCart] = useState<any[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  useEffect(() => {
    // Demo categories
    setCategories([
      { id: '1', name: 'Populair', sort_order: 0 },
      { id: '2', name: 'Frieten', sort_order: 1 },
      { id: '3', name: 'Snacks', sort_order: 2 },
      { id: '4', name: 'Burgers', sort_order: 3 },
      { id: '5', name: 'Sauzen', sort_order: 4 },
      { id: '6', name: 'Dranken', sort_order: 5 },
    ])

    // Demo menu items
    setMenuItems([
      {
        id: '1',
        name: 'Grote Friet',
        description: 'Krokante verse frieten, ruim portie',
        price: 4.50,
        image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
        category_id: '2',
        category_name: 'Frieten',
        is_available: true,
        is_popular: true,
        is_new: false,
        is_spicy: false,
        is_vegetarian: true,
        is_vegan: true,
        allergens: [],
        options: [],
      },
      {
        id: '2',
        name: 'Bicky Burger',
        description: 'De echte Bicky met pickles, ui en Bickysaus',
        price: 5.50,
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
        category_id: '4',
        category_name: 'Burgers',
        is_available: true,
        is_popular: true,
        is_new: false,
        is_spicy: false,
        is_vegetarian: false,
        is_vegan: false,
        allergens: ['gluten', 'ei', 'melk'],
        options: [],
      },
      {
        id: '3',
        name: 'Frikandel Speciaal',
        description: 'Frikandel met curry, mayo en uitjes',
        price: 4.00,
        image_url: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400',
        category_id: '3',
        category_name: 'Snacks',
        is_available: true,
        is_popular: true,
        is_new: false,
        is_spicy: false,
        is_vegetarian: false,
        is_vegan: false,
        allergens: ['gluten'],
        options: [],
      },
      {
        id: '4',
        name: 'Kipnuggets (6 st)',
        description: 'Krokante kipnuggets met saus naar keuze',
        price: 6.00,
        image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400',
        category_id: '3',
        category_name: 'Snacks',
        is_available: true,
        is_popular: false,
        is_new: true,
        is_spicy: false,
        is_vegetarian: false,
        is_vegan: false,
        allergens: ['gluten', 'ei'],
        options: [],
      },
      {
        id: '5',
        name: 'Cheese Burger Deluxe',
        description: 'Dubbele burger met cheddar, bacon en BBQ saus',
        price: 9.50,
        image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400',
        category_id: '4',
        category_name: 'Burgers',
        is_available: true,
        is_popular: true,
        is_new: false,
        is_spicy: false,
        is_vegetarian: false,
        is_vegan: false,
        allergens: ['gluten', 'melk', 'ei'],
        options: [],
      },
      {
        id: '6',
        name: 'Veggie Burger',
        description: 'Huisgemaakte groenteburger met verse groenten',
        price: 7.50,
        image_url: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400',
        category_id: '4',
        category_name: 'Burgers',
        is_available: true,
        is_popular: false,
        is_new: true,
        is_spicy: false,
        is_vegetarian: true,
        is_vegan: false,
        allergens: ['gluten', 'ei'],
        options: [],
      },
      {
        id: '7',
        name: 'Cola 33cl',
        description: 'Verfrissende Coca-Cola',
        price: 2.50,
        image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
        category_id: '6',
        category_name: 'Dranken',
        is_available: true,
        is_popular: false,
        is_new: false,
        is_spicy: false,
        is_vegetarian: true,
        is_vegan: true,
        allergens: [],
        options: [],
      },
      {
        id: '8',
        name: 'Stoofvleessaus',
        description: 'Huisgemaakte Vlaamse stoofvleessaus',
        price: 3.00,
        image_url: 'https://images.unsplash.com/photo-1607116667981-80f49cdf2c42?w=400',
        category_id: '5',
        category_name: 'Sauzen',
        is_available: true,
        is_popular: true,
        is_new: false,
        is_spicy: false,
        is_vegetarian: false,
        is_vegan: false,
        allergens: ['gluten', 'selderij'],
        options: [],
      },
    ])

    setLoading(false)
  }, [params.tenant])

  const addToCart = (item: MenuItem, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) {
        return prev.map(c => 
          c.item.id === item.id 
            ? { ...c, quantity: c.quantity + quantity }
            : c
        )
      }
      return [...prev, { item, quantity }]
    })
    setSelectedItem(null)
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId))
  }

  const cartTotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0)
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)

  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : activeCategory === 'popular'
      ? menuItems.filter(i => i.is_popular)
      : menuItems.filter(i => i.category_id === activeCategory)

  const allergenIcons: Record<string, { icon: string, color: string, label: string }> = {
    gluten: { icon: '🌾', color: 'bg-amber-100 text-amber-800', label: 'Gluten' },
    ei: { icon: '🥚', color: 'bg-yellow-100 text-yellow-800', label: 'Ei' },
    melk: { icon: '🥛', color: 'bg-blue-100 text-blue-800', label: 'Melk' },
    noten: { icon: '🥜', color: 'bg-orange-100 text-orange-800', label: 'Noten' },
    soja: { icon: '🫘', color: 'bg-green-100 text-green-800', label: 'Soja' },
    vis: { icon: '🐟', color: 'bg-cyan-100 text-cyan-800', label: 'Vis' },
    schaaldieren: { icon: '🦐', color: 'bg-red-100 text-red-800', label: 'Schaaldieren' },
    selderij: { icon: '🥬', color: 'bg-lime-100 text-lime-800', label: 'Selderij' },
    mosterd: { icon: '🟡', color: 'bg-yellow-100 text-yellow-800', label: 'Mosterd' },
    sesam: { icon: '⚪', color: 'bg-stone-100 text-stone-800', label: 'Sesam' },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/shop/${params.tenant}`} className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Terug</span>
          </Link>
          <h1 className="font-bold text-xl text-gray-900">Menu</h1>
          <div className="w-16"></div>
        </div>
      </header>

      {/* Categories Bar */}
      <div className="sticky top-[60px] z-40 bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 py-4 overflow-x-auto scrollbar-hide">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory('all')}
              className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alles
            </motion.button>
            {categories.map((cat, index) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat.id === '1' ? 'popular' : cat.id)}
                className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
                  activeCategory === (cat.id === '1' ? 'popular' : cat.id)
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {item.is_new && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        NIEUW
                      </span>
                    )}
                    {item.is_popular && (
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        🔥 POPULAIR
                      </span>
                    )}
                    {item.is_vegetarian && (
                      <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        🌱
                      </span>
                    )}
                  </div>
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white font-bold px-4 py-2 rounded-full">
                        Uitverkocht
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-orange-500 transition-colors">
                      {item.name}
                    </h3>
                    <span className="text-xl font-bold text-orange-500">
                      €{item.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  {item.allergens.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.allergens.map(allergen => (
                        <span 
                          key={allergen}
                          className={`text-xs px-2 py-1 rounded-full ${allergenIcons[allergen]?.color || 'bg-gray-100 text-gray-600'}`}
                        >
                          {allergenIcons[allergen]?.icon || '⚠️'} {allergenIcons[allergen]?.label || allergen}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="relative h-64">
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg"
                >
                  <span className="text-2xl">×</span>
                </button>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  {selectedItem.is_new && (
                    <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">NIEUW</span>
                  )}
                  {selectedItem.is_popular && (
                    <span className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full">🔥 POPULAIR</span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedItem.name}</h2>
                  <span className="text-2xl font-bold text-orange-500">€{selectedItem.price.toFixed(2)}</span>
                </div>
                <p className="text-gray-600 mb-6">{selectedItem.description}</p>

                {selectedItem.allergens.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Allergenen</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.allergens.map(allergen => (
                        <span 
                          key={allergen}
                          className={`text-sm px-3 py-1.5 rounded-full ${allergenIcons[allergen]?.color || 'bg-gray-100 text-gray-600'}`}
                        >
                          {allergenIcons[allergen]?.icon || '⚠️'} {allergenIcons[allergen]?.label || allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addToCart(selectedItem)}
                  disabled={!selectedItem.is_available}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>🛒</span>
                  <span>Toevoegen aan bestelling</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">€{selectedItem.price.toFixed(2)}</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Button */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl shadow-orange-500/40 flex items-center gap-4 z-40"
          >
            <span className="bg-white text-orange-500 w-8 h-8 rounded-full flex items-center justify-center font-bold">{cartCount}</span>
            <span>Bekijk bestelling</span>
            <span className="border-l border-white/30 pl-4">€{cartTotal.toFixed(2)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Slide Panel */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl"
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Je bestelling</h2>
                  <button onClick={() => setCartOpen(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto max-h-[60vh]">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🛒</span>
                    <p className="text-gray-500">Je bestelling is leeg</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(({ item, quantity }) => (
                      <motion.div key={item.id} layout className="flex gap-4 bg-gray-50 rounded-xl p-4">
                        <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <p className="text-orange-500 font-bold">€{(item.price * quantity).toFixed(2)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-gray-500">Aantal: {quantity}</span>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-sm hover:underline">Verwijder</button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Subtotaal</span>
                    <span className="text-xl font-bold text-gray-900">€{cartTotal.toFixed(2)}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors"
                  >
                    Afrekenen →
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
