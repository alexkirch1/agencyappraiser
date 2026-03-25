import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("[v0] DATABASE_URL environment variable is not set. Please add it in Settings → Vars.")
}

const sql = neon(DATABASE_URL ?? "")
export default sql
