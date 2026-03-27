import subprocess
import sys
import os

# Walk up from cwd to find package.json
cwd = os.getcwd()
print(f"CWD: {cwd}")

# Try known paths
candidates = [
    cwd,
    "/app",
    "/workspace",
    "/project",
    os.path.join(cwd, "v0-project"),
]

project_dir = None
for c in candidates:
    if os.path.exists(os.path.join(c, "package.json")):
        project_dir = c
        break

if not project_dir:
    # List cwd contents to debug
    print(f"CWD contents: {os.listdir(cwd)}")
    sys.exit(1)

print(f"Project dir: {project_dir}")

result = subprocess.run(
    ["npm", "install", "ai@^6.0.0", "@ai-sdk/react@^3.0.0", "zod@^3.24.0", "--save"],
    capture_output=True,
    text=True,
    cwd=project_dir
)
print(result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout)
if result.returncode != 0:
    print("STDERR:", result.stderr[-2000:])
    sys.exit(1)
print("Done!")
