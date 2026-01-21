/**
 * Tests for the logger utility
 */
import { logger } from '@/lib/logger'

describe('Logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'debug').mockImplementation()
    jest.spyOn(console, 'info').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('log levels', () => {
    it('should log info messages', () => {
      logger.info('Test message', { key: 'value' })
      expect(console.info).toHaveBeenCalled()
    })

    it('should log warning messages', () => {
      logger.warn('Warning message')
      expect(console.warn).toHaveBeenCalled()
    })

    it('should log error messages', () => {
      logger.error('Error message', { code: 500 })
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('sensitive data sanitization', () => {
    it('should redact passwords', () => {
      logger.info('User login', { email: 'test@test.com', password: 'secret123' })
      
      const logCall = (console.info as jest.Mock).mock.calls[0][0]
      expect(logCall).toContain('[REDACTED]')
      expect(logCall).not.toContain('secret123')
    })

    it('should redact tokens', () => {
      logger.info('Auth', { accessToken: 'abc123', userId: '456' })
      
      const logCall = (console.info as jest.Mock).mock.calls[0][0]
      expect(logCall).toContain('[REDACTED]')
      expect(logCall).not.toContain('abc123')
      expect(logCall).toContain('456') // userId should NOT be redacted
    })

    it('should redact nested sensitive fields', () => {
      logger.info('Payment', { 
        user: { 
          id: '123', 
          creditCard: '4111111111111111' 
        } 
      })
      
      const logCall = (console.info as jest.Mock).mock.calls[0][0]
      expect(logCall).toContain('[REDACTED]')
      expect(logCall).not.toContain('4111111111111111')
    })
  })

  describe('time helper', () => {
    it('should track operation duration', async () => {
      const timer = logger.time('test-operation')
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const duration = timer.end({ result: 'success' })
      
      expect(duration).toBeGreaterThanOrEqual(10)
      expect(console.info).toHaveBeenCalled()
    })
  })
})
