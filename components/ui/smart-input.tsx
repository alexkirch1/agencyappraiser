"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type SmartInputType = "currency" | "percent" | "year" | "count" | "decimal" | "number"

interface SmartInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  /** The kind of numeric field -- determines constraints */
  inputType?: SmartInputType
  /** Current value (number or null for empty) */
  value: number | null | string
  /** Called with the sanitised numeric value or null when cleared */
  onValueChange?: (value: number | null) => void
  /** Standard onChange for raw string (fallback) */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Custom min override */
  min?: number
  /** Custom max override */
  max?: number
  /** Allow negative values */
  allowNegative?: boolean
  /** Decimal places allowed (default: auto based on inputType) */
  decimals?: number
}

function getDefaults(inputType: SmartInputType) {
  switch (inputType) {
    case "percent":
      return { min: 0, max: 100, decimals: 2, allowNeg: false }
    case "year":
      return { min: 1900, max: new Date().getFullYear() + 1, decimals: 0, allowNeg: false }
    case "currency":
      return { min: 0, max: 999999999, decimals: 2, allowNeg: false }
    case "count":
      return { min: 0, max: 999999, decimals: 0, allowNeg: false }
    case "decimal":
      return { min: 0, max: 999999999, decimals: 4, allowNeg: true }
    case "number":
    default:
      return { min: -999999999, max: 999999999, decimals: 2, allowNeg: true }
  }
}

const SmartInput = React.forwardRef<HTMLInputElement, SmartInputProps>(
  (
    {
      inputType = "number",
      value,
      onValueChange,
      onChange,
      min: minProp,
      max: maxProp,
      allowNegative: allowNegProp,
      decimals: decimalsProp,
      className,
      placeholder,
      ...rest
    },
    ref
  ) => {
    const defaults = getDefaults(inputType)
    const min = minProp ?? defaults.min
    const max = maxProp ?? defaults.max
    const allowNeg = allowNegProp ?? defaults.allowNeg
    const decimals = decimalsProp ?? defaults.decimals

    // Track the raw display string so we don't fight the user mid-typing
    const [display, setDisplay] = React.useState(() => {
      if (value === null || value === "" || value === undefined) return ""
      return String(value)
    })

    // Sync external value changes
    React.useEffect(() => {
      if (value === null || value === "" || value === undefined) {
        setDisplay("")
      } else {
        const num = typeof value === "string" ? parseFloat(value) : value
        // Only update if the display doesn't already represent this number
        // (avoids clobbering "1." while typing "1.5")
        const displayNum = parseFloat(display)
        if (isNaN(num)) {
          setDisplay("")
        } else if (isNaN(displayNum) || displayNum !== num) {
          setDisplay(String(num))
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows, home/end
      const allowedKeys = [
        "Backspace", "Delete", "Tab", "Escape", "Enter",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "Home", "End",
      ]
      if (allowedKeys.includes(e.key)) return
      // Allow Ctrl/Cmd + A, C, V, X
      if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) return
      // Allow period/decimal if decimals > 0 and no existing decimal
      if (e.key === "." && decimals > 0) {
        if (display.includes(".")) e.preventDefault()
        return
      }
      // Allow minus if negative allowed and cursor at start
      if (e.key === "-" && allowNeg) {
        const input = e.currentTarget
        if (input.selectionStart !== 0 || display.includes("-")) e.preventDefault()
        return
      }
      // Block everything that isn't a digit
      if (!/^\d$/.test(e.key)) {
        e.preventDefault()
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value

      // Strip any characters that slipped through (e.g. paste)
      if (allowNeg) {
        raw = raw.replace(/[^0-9.\-]/g, "")
      } else {
        raw = raw.replace(/[^0-9.]/g, "")
      }

      // Prevent multiple decimals
      const parts = raw.split(".")
      if (parts.length > 2) {
        raw = parts[0] + "." + parts.slice(1).join("")
      }

      // Limit decimal places
      if (decimals === 0 && raw.includes(".")) {
        raw = raw.replace(".", "")
      } else if (parts.length === 2 && parts[1].length > decimals) {
        raw = parts[0] + "." + parts[1].slice(0, decimals)
      }

      setDisplay(raw)

      if (raw === "" || raw === "-" || raw === ".") {
        onValueChange?.(null)
        onChange?.(e)
        return
      }

      const num = parseFloat(raw)
      if (isNaN(num)) {
        onValueChange?.(null)
        onChange?.(e)
        return
      }

      // Emit raw value -- clamping happens on blur
      onValueChange?.(num)
      onChange?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (display === "" || display === "-" || display === ".") {
        setDisplay("")
        onValueChange?.(null)
        return
      }

      let num = parseFloat(display)
      if (isNaN(num)) {
        setDisplay("")
        onValueChange?.(null)
        return
      }

      // Clamp on blur
      if (num < min) num = min
      if (num > max) num = max

      // Format
      if (decimals === 0) {
        num = Math.round(num)
      }

      setDisplay(String(num))
      onValueChange?.(num)

    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text")
      // Strip everything except digits, decimal, minus
      const cleaned = text.replace(/[^0-9.\-]/g, "")
      if (cleaned !== text) {
        e.preventDefault()
        // Insert cleaned text
        const input = e.currentTarget
        const start = input.selectionStart ?? 0
        const end = input.selectionEnd ?? 0
        const newVal = display.slice(0, start) + cleaned + display.slice(end)
        setDisplay(newVal)
        const num = parseFloat(newVal)
        if (!isNaN(num)) onValueChange?.(num)
      }
    }

    return (
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
      />
    )
  }
)

SmartInput.displayName = "SmartInput"

export { SmartInput }
