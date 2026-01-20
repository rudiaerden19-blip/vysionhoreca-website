import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Check if Upstash is configured
const isConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Create Redis client only if configured
const redis = isConfigured 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Rate limiter for login attempts: 5 attempts per minute per IP
export const loginRateLimiter = redis 
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'ratelimit:login',
    })
  : null

// Rate limiter for registration: 3 registrations per hour per IP
export const registerRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      prefix: 'ratelimit:register',
    })
  : null

// Rate limiter for contact form: 5 messages per hour per IP
export const contactRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'ratelimit:contact',
    })
  : null

// Generic rate limiter for other APIs: 60 requests per minute per IP
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'ratelimit:api',
    })
  : null

// Helper function to check rate limit
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining?: number; reset?: number }> {
  // If rate limiting is not configured, allow all requests
  if (!limiter) {
    return { success: true }
  }

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    // If rate limiting fails, allow the request but log the error
    console.error('Rate limit check failed:', error)
    return { success: true }
  }
}

// Helper to get client IP from request headers
export function getClientIP(request: Request): string {
  // Try various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Fallback
  return 'unknown'
}
