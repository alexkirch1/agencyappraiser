"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Lock, CheckCircle2 } from "lucide-react"

interface Props {
  onSubmit: (data: { name: string; email: string; phone: string; agencyName: string }) => void
  onClose?: () => void
  title?: string
  description?: string
}

export function LeadCaptureModal({ onSubmit, onClose, title, description }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [agencyName, setAgencyName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "Name is required"
    if (!email.trim()) newErrors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({ name, email, phone, agencyName })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose() }}>
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            {title || "Unlock Your Valuation"}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {description || "Enter your details to view your detailed agency valuation report."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="lc-name" className="text-sm text-muted-foreground">Full Name *</Label>
              <Input
                id="lc-name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="lc-email" className="text-sm text-muted-foreground">Email Address *</Label>
              <Input
                id="lc-email"
                type="email"
                placeholder="john@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="lc-phone" className="text-sm text-muted-foreground">Phone (Optional)</Label>
              <Input
                id="lc-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lc-agency" className="text-sm text-muted-foreground">Agency Name (Optional)</Label>
              <Input
                id="lc-agency"
                type="text"
                placeholder="Smith Insurance Group"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" size="lg" className="mt-2 w-full gap-2">
              <CheckCircle2 className="h-4 w-4" />
              View My Valuation
            </Button>
            <p className="text-center text-xs text-muted-foreground/70">
              Your information is kept private and never shared with third parties.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
