import { neon } from "@neondatabase/serverless"

// During build, DATABASE_URL may not be present — use a placeholder that won't throw at import time.
// At runtime on Vercel, DATABASE_URL is always set.
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@placeholder/placeholder"

const sql = neon(DATABASE_URL)
export default sql
