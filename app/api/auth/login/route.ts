import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { verifyPassword, createSession } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`
    const user = rows[0]
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    const token = await createSession(user.id)
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, agency_name: user.agency_name },
    })
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    })
    return response
  } catch (err) {
    console.error("[v0] Login error:", err)
    return NextResponse.json({ error: "Login failed." }, { status: 500 })
  }
}
