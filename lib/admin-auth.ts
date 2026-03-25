import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"

// ---------------------------------------------------------------------------
// Admin credentials — stored in env var as JSON: {"Alex":"pass1","Trout":"pass2"}
// Fall back to empty object (no access) if not configured.
// ---------------------------------------------------------------------------
function getAdminUsers(): Record<string, string> {
  const raw = process.env.ADMIN_CREDENTIALS
  if (!raw) {
    console.error("[admin-auth] ADMIN_CREDENTIALS env var is not set — admin login is disabled.")
    return {}
  }
  try {
    return JSON.parse(raw) as Record<string, string>
  } catch {
    console.error("[admin-auth] ADMIN_CREDENTIALS is not valid JSON — admin login is disabled.")
    return {}
  }
}

// ---------------------------------------------------------------------------
// Session signing — HMAC-SHA256 with ADMIN_SESSION_SECRET
// Token format: base64(username):base64(hmac)
// ---------------------------------------------------------------------------
const SESSION_COOKIE = "admin_session"

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    console.error("[admin-auth] ADMIN_SESSION_SECRET is not set — sessions will not be cryptographically secure.")
    // Use a hard-to-guess but deterministic fallback so the app still runs in dev
    return "dev-insecure-secret-please-set-ADMIN_SESSION_SECRET"
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
// Validate a login attempt — timing-safe password comparison
// ---------------------------------------------------------------------------
export function validateAdminCredentials(username: string, password: string): boolean {
  const users = getAdminUsers()
  const expected = users[username]
  if (!expected) return false

  try {
    // Timing-safe comparison
    const expectedBuf = Buffer.from(expected)
    const providedBuf = Buffer.from(password)
    if (expectedBuf.length !== providedBuf.length) return false
    return timingSafeEqual(expectedBuf, providedBuf)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// isAdminAuthenticated — reads the session cookie and verifies the HMAC
// ---------------------------------------------------------------------------
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get(SESSION_COOKIE)
    if (!session?.value) return false
    return verifySession(session.value) !== null
  } catch {
    return false
  }
}
