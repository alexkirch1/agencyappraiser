import { execSync } from "child_process"

console.log("Installing AI SDK and zod...")
execSync("npm install ai@^6.0.0 @ai-sdk/react@^3.0.0 zod@^3.24.0 --save", {
  cwd: "/vercel/share/v0-project",
  stdio: "inherit",
})
console.log("Done.")
