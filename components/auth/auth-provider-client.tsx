"use client"

// This thin wrapper exists so that use-auth.ts (which contains async functions
// with await) is only ever compiled into a client bundle — never into the SSR
// root chunk. Importing AuthProvider directly from use-auth.ts in a Server
// Component (app/layout.tsx) caused Turbopack to include the async closures in
// the SSR chunk, triggering:
//   SyntaxError: await is only valid in async functions and the top level
//   bodies of modules
export { AuthProvider } from "@/lib/use-auth"
