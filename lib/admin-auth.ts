import { headers } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"

// ---------------------------------------------------------------------------
// Admin credentials — simple env vars, no JSON required.
// ADMIN_USERNAME and ADMIN_PASSWORD are the primary source.
// Falls back to hardcoded defaults so the app always works in dev.
// ---------------------------------------------------------------------------
function getAdminUsers(): Record<string, string> {
  const users: Record<string, string> = {}

  // Primary admin credentials — must be set via environment variables
  const u1 = process.env.ADMIN_USERNAME
  const p1 = process.env.ADMIN_PASSWORD
  if (u1 && p1) users[u1] = p1

  // Optional second admin
  const u2 = process.env.ADMIN_USERNAME_2
  const p2 = process.env.ADMIN_PASSWORD_2
  if (u2 && p2) users[u2] = p2

  if (Object.keys(users).length === 0) {
    console.error("[admin-auth] No admin credentials configured. Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables.")
  }

  return users
}

// ---------------------------------------------------------------------------
// Session signing — HMAC-SHA256 with ADMIN_SESSION_SECRET
// Token format: base64(username):base64(hmac)
// ---------------------------------------------------------------------------
function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error("[admin-auth] ADMIN_SESSION_SECRET environment variable is not set. Admin sessions cannot be signed.")
  }
  return secret
}

export function signSession(username: string): string {
  const secret = getSecret()
  const payload = Buffer.from(username).toString("base64url")
  const hmac = createHmac("sha256", secret).update(payload).digest("base64url")
  return `${payload}.${hmac}`
}

export function verifySession(token: string): string | null {
  try {
    const [payload, hmac] = token.split(".")
    if (!payload || !hmac) return null

    const secret = getSecret()
    const expected = createHmac("sha256", secret).update(payload).digest("base64url")

    // Timing-safe comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expected)
    const providedBuf = Buffer.from(hmac)
    if (expectedBuf.length !== providedBuf.length) return null
    if (!timingSafeEqual(expectedBuf, providedBuf)) return null

    const username = Buffer.from(payload, "base64url").toString("utf8")
    // Validate that the username still exists in credentials
    const users = getAdminUsers()
    if (!(username in users)) return null
    return username
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Validate a login attempt — direct string comparison
// ---------------------------------------------------------------------------
export function validateAdminCredentials(username: string, password: string): boolean {
  const users = getAdminUsers()
  const expected = users[username]
  if (!expected) return false
  // Timing-safe comparison to prevent username enumeration via timing attacks
  try {
    const expectedBuf = Buffer.from(expected)
    const providedBuf = Buffer.from(password)
    if (expectedBuf.length !== providedBuf.length) return false
    return timingSafeEqual(expectedBuf, providedBuf)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// isAdminAuthenticated — reads the Authorization header and verifies the HMAC
// ---------------------------------------------------------------------------
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const headerStore = await headers()
    const authHeader = headerStore.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) return false
    const token = authHeader.slice(7)
    return verifySession(token) !== null
  } catch {
    return false
  }
}
