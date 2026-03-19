import { NextResponse } from "next/server"

// Drip email is currently disabled.
export async function POST() {
  return NextResponse.json({ disabled: true }, { status: 200 })
}
