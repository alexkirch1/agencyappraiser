"use client"

import { useState } from "react"
import { Lock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface AdminLoginProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await onLogin(username, password)
    if (!result.success) {
      setError(result.error || "Invalid credentials.")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[340px]">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Agency Appraiser</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to the admin dashboard</p>
        </div>

        {/* Form card */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            {error && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label htmlFor="admin-user" className="mb-1.5 block text-xs font-medium text-foreground">
                  Username
                </label>
                <Input
                  id="admin-user"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label htmlFor="admin-pass" className="mb-1.5 block text-xs font-medium text-foreground">
                  Password
                </label>
                <Input
                  id="admin-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-9 text-sm"
                />
              </div>
              <Button type="submit" className="mt-1 w-full h-9 text-sm" disabled={loading}>
                <Lock className="mr-2 h-3.5 w-3.5" />
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Internal use only &mdash; Agency Appraiser
        </p>
      </div>
    </div>
  )
}
