import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { hashPassword, createSession } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const { name, email, password, agencyName } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const rows = await sql`
      INSERT INTO users (name, email, password_hash, agency_name)
      VALUES (${name}, ${email.toLowerCase()}, ${passwordHash}, ${agencyName || null})
      RETURNING id, name, email, agency_name
    `
    const user = rows[0]
    const token = await createSession(user.id)

    const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, agency_name: user.agency_name } })
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    })
    return response
  } catch (err) {
    console.error("[v0] Register error:", err)
    return NextResponse.json({ error: "Registration failed." }, { status: 500 })
  }
}
