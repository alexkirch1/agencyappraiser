import sql from "./db"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { nanoid } from "nanoid"

export interface SessionUser {
  id: number
  email: string
  name: string
  agency_name: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: number): Promise<string> {
  const token = nanoid(40)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt.toISOString()})
  `
  return token
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const rows = await sql`
    SELECT u.id, u.email, u.name, u.agency_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${token}
      AND s.expires_at > NOW()
  `
  return rows[0] as SessionUser | null
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null
  return getSessionUser(token)
}

export async function deleteSession(token: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${token}`
}
