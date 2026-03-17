"use client"

import { useState } from "react"
import { useAuth } from "@/lib/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Loader2, TrendingUp } from "lucide-react"

interface AuthModalProps {
  onClose: () => void
  defaultMode?: "login" | "register"
}

export function AuthModal({ onClose, defaultMode = "login" }: AuthModalProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<"login" | "register">(defaultMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({ name: "", email: "", password: "", agencyName: "" })
  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    let result: { error?: string }
    if (mode === "login") {
      result = await login(form.email, form.password)
    } else {
      result = await register(form.name, form.email, form.password, form.agencyName)
    }

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">
              Agency<span className="text-primary">Appraiser</span>
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-foreground">
          {mode === "login" ? "Sign in to your account" : "Create your account"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Access your saved valuations and history."
            : "Save valuations, track your agency's value over time."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "register" && (
            <>
              <div>
                <Label htmlFor="name" className="text-sm text-muted-foreground">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Alex Turner"
                  value={form.name}
                  onChange={e => update("name", e.target.value)}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="agencyName" className="text-sm text-muted-foreground">Agency Name (optional)</Label>
                <Input
                  id="agencyName"
                  placeholder="Turner Insurance Group"
                  value={form.agencyName}
                  onChange={e => update("agencyName", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@agency.com"
              value={form.email}
              onChange={e => update("email", e.target.value)}
              className="mt-1.5"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
              value={form.password}
              onChange={e => update("password", e.target.value)}
              className="mt-1.5"
              required
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
            className="font-medium text-primary hover:underline"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  )
}
