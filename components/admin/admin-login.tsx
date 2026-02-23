"use client"

import { useState } from "react"
import { Lock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

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
      <Card className="w-full max-w-sm border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
          <p className="text-sm text-muted-foreground">Please verify your credentials.</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="admin-user" className="mb-1.5 block text-sm font-medium text-foreground">
                Username
              </label>
              <Input
                id="admin-user"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="admin-pass" className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="admin-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
