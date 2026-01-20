import { NextResponse } from 'next/server'

/**
 * Standardized API response helpers for consistent error handling
 */

export type ApiError = {
  error: string
  code?: string
  details?: string
}

export type ApiSuccess<T = unknown> = {
  success: true
  data?: T
  message?: string
}

// Standard HTTP status codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Standard error messages (Dutch)
export const ErrorMessages = {
  // Auth errors
  INVALID_CREDENTIALS: 'Onjuiste inloggegevens',
  UNAUTHORIZED: 'Je moet ingelogd zijn',
  FORBIDDEN: 'Geen toegang tot deze resource',
  SESSION_EXPIRED: 'Je sessie is verlopen. Log opnieuw in.',
  
  // Validation errors
  MISSING_FIELDS: 'Niet alle velden zijn ingevuld',
  INVALID_EMAIL: 'Ongeldig emailadres',
  WEAK_PASSWORD: 'Wachtwoord moet minimaal 8 tekens zijn',
  
  // Resource errors
  NOT_FOUND: 'Niet gevonden',
  ALREADY_EXISTS: 'Bestaat al',
  
  // Rate limiting
  RATE_LIMITED: 'Te veel verzoeken. Probeer het later opnieuw.',
  
  // Server errors
  SERVER_ERROR: 'Er is een fout opgetreden. Probeer het later opnieuw.',
  DATABASE_ERROR: 'Database fout. Neem contact op met support.',
  SERVICE_UNAVAILABLE: 'Service tijdelijk niet beschikbaar',
} as const

/**
 * Create a success response
 */
export function successResponse<T>(
  data?: T,
  message?: string,
  status: number = HttpStatus.OK
) {
  return NextResponse.json(
    { success: true, data, message },
    { status }
  )
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status: number = HttpStatus.BAD_REQUEST,
  code?: string
) {
  return NextResponse.json(
    { error, code },
    { status }
  )
}

/**
 * Common error responses
 */
export const ApiErrors = {
  badRequest: (message: string = ErrorMessages.MISSING_FIELDS) => 
    errorResponse(message, HttpStatus.BAD_REQUEST),
    
  unauthorized: (message: string = ErrorMessages.UNAUTHORIZED) => 
    errorResponse(message, HttpStatus.UNAUTHORIZED),
    
  forbidden: (message: string = ErrorMessages.FORBIDDEN) => 
    errorResponse(message, HttpStatus.FORBIDDEN),
    
  notFound: (message: string = ErrorMessages.NOT_FOUND) => 
    errorResponse(message, HttpStatus.NOT_FOUND),
    
  conflict: (message: string = ErrorMessages.ALREADY_EXISTS) => 
    errorResponse(message, HttpStatus.CONFLICT),
    
  rateLimited: (message: string = ErrorMessages.RATE_LIMITED) => 
    errorResponse(message, HttpStatus.RATE_LIMITED),
    
  serverError: (message: string = ErrorMessages.SERVER_ERROR) => 
    errorResponse(message, HttpStatus.SERVER_ERROR),
    
  serviceUnavailable: (message: string = ErrorMessages.SERVICE_UNAVAILABLE) => 
    errorResponse(message, HttpStatus.SERVICE_UNAVAILABLE),
}

/**
 * Log error and return standard response
 * Use this in catch blocks
 */
export function handleApiError(error: unknown, context: string) {
  console.error(`${context}:`, error)
  return ApiErrors.serverError()
}
