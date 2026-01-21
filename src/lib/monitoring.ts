/**
 * Application Monitoring & Metrics
 * 
 * Lightweight monitoring that works with any APM provider.
 * Currently logs to console, can be extended to:
 * - Sentry
 * - DataDog
 * - New Relic
 * - Vercel Analytics
 * 
 * Usage:
 *   import { metrics, trackError } from '@/lib/monitoring'
 *   
 *   // Track an error
 *   trackError(error, { userId: '123', action: 'checkout' })
 *   
 *   // Track a metric
 *   metrics.increment('orders.created', { tenant: 'demo' })
 *   metrics.timing('api.response', 150, { endpoint: '/api/orders' })
 */

import { logger } from './logger'

// Error tracking
export function trackError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  logger.error('Unhandled error', {
    error: errorMessage,
    stack: errorStack,
    ...context,
  })

  // TODO: Send to Sentry/DataDog if configured
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context })
  // }
}

// Simple metrics tracking
export const metrics = {
  /**
   * Increment a counter metric
   */
  increment(name: string, tags?: Record<string, string>, value = 1): void {
    logger.debug(`Metric: ${name}`, { type: 'counter', value, tags })
    
    // TODO: Send to DataDog/StatsD if configured
    // statsd.increment(name, value, tags)
  },

  /**
   * Record a timing/duration metric
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    logger.debug(`Metric: ${name}`, { type: 'timing', duration: durationMs, tags })
    
    // TODO: Send to DataDog/StatsD if configured
    // statsd.timing(name, durationMs, tags)
  },

  /**
   * Record a gauge metric (current value)
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    logger.debug(`Metric: ${name}`, { type: 'gauge', value, tags })
    
    // TODO: Send to DataDog/StatsD if configured
    // statsd.gauge(name, value, tags)
  },

  /**
   * Track API endpoint performance
   */
  apiCall(
    method: string,
    endpoint: string,
    status: number,
    durationMs: number,
    tenant?: string
  ): void {
    this.timing('api.response_time', durationMs, {
      method,
      endpoint,
      status: String(status),
      tenant: tenant || 'unknown',
    })

    this.increment('api.requests', {
      method,
      endpoint,
      status: String(status),
    })

    // Track errors separately
    if (status >= 500) {
      this.increment('api.errors.5xx', { method, endpoint })
    } else if (status >= 400) {
      this.increment('api.errors.4xx', { method, endpoint })
    }
  },

  /**
   * Track database query performance
   */
  dbQuery(operation: string, table: string, durationMs: number): void {
    this.timing('db.query_time', durationMs, { operation, table })
    this.increment('db.queries', { operation, table })

    // Warn on slow queries
    if (durationMs > 1000) {
      logger.warn('Slow database query detected', {
        operation,
        table,
        duration: `${durationMs}ms`,
      })
    }
  },

  /**
   * Track business events
   */
  businessEvent(event: string, tenant: string, metadata?: Record<string, unknown>): void {
    logger.info(`Business event: ${event}`, { tenant, ...metadata })
    this.increment(`business.${event}`, { tenant })
  },
}

// Performance timing helper
export function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = Date.now()
  return fn().finally(() => {
    metrics.timing(name, Date.now() - start, tags)
  })
}

const monitoring = { trackError, metrics, withTiming }
export default monitoring
