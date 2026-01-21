/**
 * Tests for the cache utility
 */
import { cache, cacheKey, CACHE_TTL } from '@/lib/cache'

describe('Cache', () => {
  beforeEach(() => {
    cache.clear()
  })

  describe('getOrFetch', () => {
    it('should fetch data on first call', async () => {
      const fetcher = jest.fn().mockResolvedValue({ id: 1, name: 'Test' })
      
      const result = await cache.getOrFetch('test-key', fetcher)
      
      expect(result).toEqual({ id: 1, name: 'Test' })
      expect(fetcher).toHaveBeenCalledTimes(1)
    })

    it('should return cached data on second call', async () => {
      const fetcher = jest.fn().mockResolvedValue({ id: 1, name: 'Test' })
      
      await cache.getOrFetch('test-key', fetcher)
      const result = await cache.getOrFetch('test-key', fetcher)
      
      expect(result).toEqual({ id: 1, name: 'Test' })
      expect(fetcher).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should respect TTL and refetch after expiry', async () => {
      jest.useFakeTimers()
      
      const fetcher = jest.fn()
        .mockResolvedValueOnce({ version: 1 })
        .mockResolvedValueOnce({ version: 2 })
      
      // First call
      await cache.getOrFetch('test-key', fetcher, 1000) // 1 second TTL
      
      // Advance time past TTL
      jest.advanceTimersByTime(1500)
      
      // Second call should refetch
      const result = await cache.getOrFetch('test-key', fetcher, 1000)
      
      expect(result).toEqual({ version: 2 })
      expect(fetcher).toHaveBeenCalledTimes(2)
      
      jest.useRealTimers()
    })
  })

  describe('invalidate', () => {
    it('should remove specific cache entry', async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: 'test' })
      
      await cache.getOrFetch('key-1', fetcher)
      cache.invalidate('key-1')
      
      await cache.getOrFetch('key-1', fetcher)
      
      expect(fetcher).toHaveBeenCalledTimes(2)
    })
  })

  describe('invalidatePattern', () => {
    it('should remove all matching cache entries', async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: 'test' })
      
      await cache.getOrFetch('tenant:demo:settings', fetcher)
      await cache.getOrFetch('tenant:demo:products', fetcher)
      await cache.getOrFetch('tenant:other:settings', fetcher)
      
      cache.invalidatePattern('tenant:demo')
      
      const stats = cache.getStats()
      expect(stats.size).toBe(1)
      expect(stats.keys).toContain('tenant:other:settings')
    })
  })

  describe('cacheKey', () => {
    it('should create proper cache keys', () => {
      expect(cacheKey('settings', 'demo')).toBe('settings:demo')
      expect(cacheKey('products', 'demo', 'active')).toBe('products:demo:active')
    })
  })

  describe('CACHE_TTL', () => {
    it('should have reasonable TTL values', () => {
      expect(CACHE_TTL.TENANT_SETTINGS).toBeGreaterThanOrEqual(60000)
      expect(CACHE_TTL.MENU_PRODUCTS).toBeLessThanOrEqual(60000)
      expect(CACHE_TTL.SHOP_STATUS).toBeLessThanOrEqual(30000)
    })
  })
})
