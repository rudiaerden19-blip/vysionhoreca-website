// =====================================================
// SIMPLE IN-MEMORY CACHE FOR API RESPONSES
// Reduces database calls significantly
// =====================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly defaultTTL = 30000 // 30 seconds default

  /**
   * Get cached data or fetch fresh data
   * @param key - Cache key
   * @param fetcher - Function to fetch data if not cached
   * @param ttl - Time to live in milliseconds (default 30s)
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key)

    // Return cached data if still valid
    if (cached && cached.expiresAt > now) {
      return cached.data as T
    }

    // Fetch fresh data
    const data = await fetcher()
    
    // Store in cache
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    })

    return data
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Singleton instance
export const cache = new SimpleCache()

// Cache TTL constants
export const CACHE_TTL = {
  TENANT_SETTINGS: 60000,     // 1 minute - rarely changes
  MENU_CATEGORIES: 60000,     // 1 minute
  MENU_PRODUCTS: 30000,       // 30 seconds
  OPENING_HOURS: 300000,      // 5 minutes - very static
  DELIVERY_SETTINGS: 60000,   // 1 minute
  PRODUCT_OPTIONS: 60000,     // 1 minute
  REVIEWS: 120000,            // 2 minutes
  SHOP_STATUS: 30000,         // 30 seconds - needs to be fresh
}

// Helper to create cache keys
export function cacheKey(type: string, ...parts: string[]): string {
  return `${type}:${parts.join(':')}`
}
