/**
 * Silence console.log in production for security and performance
 * Keep console.error for critical issues
 */

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.info = () => {};
  // Keep console.warn and console.error for debugging critical issues
}
