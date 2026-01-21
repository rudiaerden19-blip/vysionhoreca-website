/**
 * Structured Logger for Enterprise Monitoring
 * 
 * Features:
 * - JSON structured logs for easy parsing
 * - Log levels (debug, info, warn, error)
 * - Request context tracking
 * - Performance timing
 * - Safe for production (no sensitive data)
 * 
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('User logged in', { userId: '123', tenant: 'demo' })
 *   logger.error('Payment failed', { error: err.message, orderId: '456' })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  requestId?: string
  duration?: number
  service: string
}

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'credit_card',
  'creditcard',
  'card',
  'cvv',
  'ssn',
]

function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    
    // Check if this is a sensitive field
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]'
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? sanitizeData(item as Record<string, unknown>) 
          : item
      )
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      const nestedObj = value as Record<string, unknown>
      const sanitizedNested: Record<string, unknown> = {}
      for (const [nestedKey, nestedValue] of Object.entries(nestedObj)) {
        const nestedLowerKey = nestedKey.toLowerCase()
        if (SENSITIVE_FIELDS.some(field => nestedLowerKey.includes(field))) {
          sanitizedNested[nestedKey] = '[REDACTED]'
        } else if (typeof nestedValue === 'object' && nestedValue !== null) {
          sanitizedNested[nestedKey] = sanitizeData(nestedValue as Record<string, unknown>)
        } else {
          sanitizedNested[nestedKey] = nestedValue
        }
      }
      sanitized[key] = sanitizedNested
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? sanitizeData(context) : undefined,
    service: 'vysion-horeca',
  }
}

function formatLog(entry: LogEntry): string {
  // In production, output JSON for log aggregators
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry)
  }
  
  // In development, output readable format
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  }
  const reset = '\x1b[0m'
  const color = levelColors[entry.level]
  
  let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`
  if (entry.context) {
    output += ` ${JSON.stringify(entry.context)}`
  }
  return output
}

function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
  const minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
  return levels.indexOf(level) >= levels.indexOf(minLevel)
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('debug')) return
    const entry = createLogEntry('debug', message, context)
    console.debug(formatLog(entry))
  },

  info(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('info')) return
    const entry = createLogEntry('info', message, context)
    console.info(formatLog(entry))
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('warn')) return
    const entry = createLogEntry('warn', message, context)
    console.warn(formatLog(entry))
  },

  error(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('error')) return
    const entry = createLogEntry('error', message, context)
    console.error(formatLog(entry))
  },

  // Helper for timing operations
  time(label: string) {
    const start = Date.now()
    return {
      end: (context?: Record<string, unknown>) => {
        const duration = Date.now() - start
        this.info(`${label} completed`, { ...context, duration: `${duration}ms` })
        return duration
      },
    }
  },

  // Helper for API request logging
  request(method: string, path: string, context?: Record<string, unknown>) {
    this.info(`${method} ${path}`, context)
  },

  // Helper for API response logging
  response(method: string, path: string, status: number, duration: number) {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    this[level](`${method} ${path} -> ${status}`, { status, duration: `${duration}ms` })
  },
}

export default logger
