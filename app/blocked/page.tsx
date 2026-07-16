import type { Metadata } from "next"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Access Limited — US Only",
  description: "Agency Appraiser is currently limited to US agencies.",
}

export default function BlockedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      {/* Main content container */}
      <div className="w-full max-w-2xl">
        {/* Icon and header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 rounded-full border border-border bg-secondary/50 p-4">
            <Globe className="h-12 w-12 text-muted-foreground" />
          </div>

          <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">
            Access Limited
          </h1>

          <p className="text-lg text-muted-foreground">
            Geographic Restriction
          </p>
        </div>

        {/* Message card */}
        <div className="mb-10 rounded-lg border border-border bg-card p-8">
          <p className="text-base leading-relaxed text-foreground">
            Valuations are currently limited to US agencies. To comply with local regulations and carrier mandates, this tool is only accessible within the United States.
          </p>
        </div>

        {/* Support section */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error:
          </p>
          <Link href="/contact-support">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Contact Support
            </Button>
          </Link>
        </div>

        {/* Additional info */}
        <div className="mt-12 rounded-lg border border-border bg-secondary/30 p-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Note:</span> If you are in the United States and seeing this message, this may be a false positive due to your VPN or proxy settings. Please disable any VPN or proxy services and try again.
          </p>
        </div>
      </div>
    </div>
  )
}
