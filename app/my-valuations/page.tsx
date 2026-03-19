import { redirect } from "next/navigation"

// User accounts and saved valuations are no longer supported.
// Redirect any traffic that lands here to the full calculator.
export default function MyValuationsPage() {
  redirect("/calculator")
}
