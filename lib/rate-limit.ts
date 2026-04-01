/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window per IP address.
 * Note: resets on cold starts — suitable for abuse prevention, not billing.
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

// Clean up old entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, win] of store.entries()) {
      if (win.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

/**
 * @param key      Unique key (e.g. IP + route)
 * @param limit    Max requests per window
 * @param windowMs Window duration in milliseconds
 * @returns { allowed, remaining, resetAt }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  let win = store.get(key)

  if (!win || win.resetAt < now) {
    win = { count: 0, resetAt: now + windowMs }
    store.set(key, win)
  }

  win.count++
  const remaining = Math.max(0, limit - win.count)
  const allowed = win.count <= limit

  return { allowed, remaining, resetAt: win.resetAt }
}

/**
 * Extract the best available IP from a Next.js Request.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  )
}
