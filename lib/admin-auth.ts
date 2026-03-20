import { cookies } from "next/headers"

// Must match the MARKER and ADMIN_USERS in app/api/admin/auth/route.ts
const MARKER = "aa-admin-v1"
const ADMIN_USERS: Record<string, string> = {
  Alex:  "M0untain99",
  Trout: "M0untain!",
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("admin_session")
    if (!session?.value) return false
    const decoded = Buffer.from(session.value, "base64").toString("utf8")
    const [username, marker] = decoded.split("|")
    return marker === MARKER && !!username && username in ADMIN_USERS
  } catch {
    return false
  }
}
