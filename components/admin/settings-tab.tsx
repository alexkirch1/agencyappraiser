"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface SettingsTabProps {
  onClearAll: () => void
  dealCount: number
}

export function SettingsTab({ onClearAll, dealCount }: SettingsTabProps) {
  return (
    <div className="max-w-xl">
      <h2 className="mb-6 text-lg font-bold text-foreground">Settings</h2>

      <Card className="border-border">
        <CardContent className="p-6">
          <h3 className="mb-2 font-semibold text-foreground">Application Info</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-mono font-bold text-foreground">v30.46 (Next.js)</span>
            </div>
            <div className="flex justify-between">
              <span>Saved Deals</span>
              <span className="font-bold text-foreground">{dealCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <span className="font-bold text-foreground">Session (In-Memory)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 border-destructive/30">
        <CardContent className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            This will permanently delete all saved valuations from the current session.
            This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              if (
                confirm(
                  "DANGER: This will delete ALL saved valuations. Are you sure?"
                )
              ) {
                onClearAll()
              }
            }}
          >
            Clear All Deals
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
