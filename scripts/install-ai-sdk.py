import subprocess
import sys
import os

os.chdir("/vercel/share/v0-project")

print("Installing AI SDK packages...")
result = subprocess.run(
    ["npm", "install", "ai@^6.0.0", "@ai-sdk/react@^3.0.0", "zod@^3.24.0", "--save"],
    capture_output=True,
    text=True
)
print(result.stdout)
if result.returncode != 0:
    print("STDERR:", result.stderr)
    sys.exit(1)
print("Done!")
