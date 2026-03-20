import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// Admin users — username (case-sensitive) : password
const ADMIN_USERS: Record<string, string> = {
  Alex:  "M0untain99",
  Trout: "M0untain!",
}

// A simple signed session value: base64(username|MARKER)
const MARKER = "aa-admin-v1"

function makeSession(username: string): string {
  return Buffer.from(`${username}|${MARKER}`).toString("base64")
}

function verifySession(value: string): string | null {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8")
    const [username, marker] = decoded.split("|")
    if (marker === MARKER && username && username in ADMIN_USERS) {
      return username
    }
  } catch {
    // invalid
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, username, password } = body

    if (action === "login") {
      const expected = ADMIN_USERS[username as string]
      if (expected && password === expected) {
        const cookieStore = await cookies()
        cookieStore.set("admin_session", makeSession(username), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
        })
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 })
    }

    if (action === "logout") {
      const cookieStore = await cookies()
      cookieStore.delete("admin_session")
      return NextResponse.json({ success: true })
    }

    if (action === "check") {
      const cookieStore = await cookies()
      const session = cookieStore.get("admin_session")
      const username = session?.value ? verifySession(session.value) : null
      if (username) {
        return NextResponse.json({ authenticated: true, username })
      }
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
