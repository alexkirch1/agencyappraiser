"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminLogin } from "@/components/admin/admin-login"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

const ADMIN_TOKEN_KEY = "admin_session_token"

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) {
        setAuthenticated(false)
        setChecking(false)
        return
      }
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", token }),
      })
      const data = await res.json()
      setAuthenticated(data.authenticated)
      if (!data.authenticated) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
      }
    } catch {
      setAuthenticated(false)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogin = async (username: string, password: string) => {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username, password }),
    })
    const data = await res.json()
    if (data.success && data.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      setAuthenticated(true)
      return { success: true }
    }
    return { success: false, error: data.error || "Login failed" }
  }

  const handleLogout = async () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    setAuthenticated(false)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (!authenticated) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return <AdminDashboard onLogout={handleLogout} />
}
