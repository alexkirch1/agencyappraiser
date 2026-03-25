import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateAdminCredentials, signSession, verifySession } from "@/lib/admin-auth"

const SESSION_COOKIE = "admin_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, username, password } = body

    // ── Login ───────────────────────────────────────────────────────────────
    if (action === "login") {
      if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        !username.trim() ||
        !password.trim()
      ) {
        return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 })
      }

      const valid = validateAdminCredentials(username.trim(), password)
      if (!valid) {
        // Same error message for both "user not found" and "wrong password" — avoids username enumeration
        return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 })
      }

      const token = signSession(username.trim())
      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      })
      return NextResponse.json({ success: true })
    }

    // ── Logout ──────────────────────────────────────────────────────────────
    if (action === "logout") {
      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      })
      return NextResponse.json({ success: true })
    }

    // ── Check session ───────────────────────────────────────────────────────
    if (action === "check") {
      const cookieStore = await cookies()
      const session = cookieStore.get(SESSION_COOKIE)
      const resolvedUsername = session?.value ? verifySession(session.value) : null
      if (resolvedUsername) {
        return NextResponse.json({ authenticated: true, username: resolvedUsername })
      }
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
