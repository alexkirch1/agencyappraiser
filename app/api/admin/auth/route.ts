import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const ADMIN_USER = process.env.ADMIN_USER || "admin"
const ADMIN_PASS = process.env.ADMIN_PASS || "admin"
const SESSION_SECRET = process.env.SESSION_SECRET || "agency-appraiser-admin-secret-2024"

function generateToken(username: string): string {
  const payload = `${username}:${Date.now()}:${SESSION_SECRET}`
  return Buffer.from(payload).toString("base64")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, username, password } = body

    if (action === "login") {
      if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = generateToken(username)
        const cookieStore = await cookies()
        cookieStore.set("admin_session", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24, // 24 hours
          path: "/",
        })
        return NextResponse.json({ success: true })
      }
      return NextResponse.json(
        { success: false, error: "Invalid credentials." },
        { status: 401 }
      )
    }

    if (action === "logout") {
      const cookieStore = await cookies()
      cookieStore.delete("admin_session")
      return NextResponse.json({ success: true })
    }

    if (action === "check") {
      const cookieStore = await cookies()
      const session = cookieStore.get("admin_session")
      if (session?.value) {
        try {
          const decoded = Buffer.from(session.value, "base64").toString()
          const parts = decoded.split(":")
          if (parts.length >= 3 && parts[2] === SESSION_SECRET) {
            return NextResponse.json({ authenticated: true, username: parts[0] })
          }
        } catch {
          // Invalid token
        }
      }
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
