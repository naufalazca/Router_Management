/**
 * JWT Utility Functions
 *
 * Provides functions to decode and validate JWT tokens
 * without using external libraries for minimal bundle size.
 */

export interface JwtPayload {
  sub?: string
  userId?: string
  username?: string
  role?: string
  iat?: number
  exp?: number
  [key: string]: any
}

/**
 * Decode a JWT token without verification (for client-side use only)
 * Note: This does not verify the signature, only decodes the payload.
 * Signature verification should always happen on the server.
 *
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode base64url payload
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    // Add padding if needed
    const paddedPayload = payload.padEnd(
      payload.length + (4 - (payload.length % 4)) % 4,
      '=',
    )

    const decoded = atob(paddedPayload)
    return JSON.parse(decoded) as JwtPayload
  }
  catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Check if a JWT token is expired
 *
 * @param token - JWT token string
 * @returns true if token is expired or invalid, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token)

  if (!decoded || !decoded.exp) {
    // Token without exp claim is considered invalid
    return true
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000
  const currentTime = Date.now()

  // Add 5 second buffer to account for clock skew
  const buffer = 5000

  return currentTime >= (expirationTime - buffer)
}

/**
 * Get time until token expires in milliseconds
 *
 * @param token - JWT token string
 * @returns Milliseconds until expiry, or 0 if already expired/invalid
 */
export function getTokenExpiryTime(token: string): number {
  const decoded = decodeJwt(token)

  if (!decoded || !decoded.exp) {
    return 0
  }

  const expirationTime = decoded.exp * 1000
  const currentTime = Date.now()
  const timeLeft = expirationTime - currentTime

  return Math.max(0, timeLeft)
}

/**
 * Get user information from JWT token
 *
 * @param token - JWT token string
 * @returns User payload or null
 */
export function getUserFromToken(token: string): JwtPayload | null {
  return decodeJwt(token)
}
