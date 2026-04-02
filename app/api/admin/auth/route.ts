import { NextRequest, NextResponse } from "next/server"
import { validateAdminCredentials, signSession, verifySession } from "@/lib/admin-auth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, username, password, token } = body

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

      try {
        const valid = validateAdminCredentials(username.trim(), password.trim())
        if (!valid) {
          return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 })
        }

        const sessionToken = signSession(username.trim())
        return NextResponse.json({ success: true, token: sessionToken })
      } catch {
        return NextResponse.json({ success: false, error: "Server configuration error." }, { status: 500 })
      }
    }

    // ── Logout ──────────────────────────────────────────────────────────────
    if (action === "logout") {
      // Client handles clearing localStorage
      return NextResponse.json({ success: true })
    }

    // ── Check session ───────────────────────────────────────────────────────
    if (action === "check") {
      // Token passed in request body
      if (!token) {
        return NextResponse.json({ authenticated: false })
      }
      const resolvedUsername = verifySession(token)
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
