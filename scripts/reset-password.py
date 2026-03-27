import subprocess
import sys

# Install bcrypt if needed
try:
    import bcrypt
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "bcrypt", "-q"])
    import bcrypt

password = "Agency@2024"
hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

print(f"Password: {password}")
print(f"Hash:     {hashed}")

# Verify it works
assert bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
print("Verification: OK")
print()
print("Run this SQL in Neon:")
print(f"UPDATE users SET password_hash = '{hashed}' WHERE email = 'alex@rockyquote.com';")
