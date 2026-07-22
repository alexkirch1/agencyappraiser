"use client"
// SSR stub — the real implementation is loaded client-side only via
// next/dynamic({ ssr: false }) in admin-dashboard.tsx.
// This file must NOT import horizon-tab-v2 — doing so causes Turbopack to
// follow the export chain and compile all async/await xlsx code into the
// SSR chunk, producing SyntaxError at runtime.
export function HorizonTab() { return null }
