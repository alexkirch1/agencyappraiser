import subprocess
import sys
import os

# Install dependencies if needed
for pkg in ["bcrypt", "psycopg2-binary"]:
    try:
        __import__(pkg.replace("-binary", "").replace("-", "_"))
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

import bcrypt
import psycopg2

password = "M0untain99!"
email = "alex@rockyquote.com"

hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
print(f"Generated hash for {email}")

# Verify
assert bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
print("Hash verification: OK")

# Connect to Neon using DATABASE_URL env var
db_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
if not db_url:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute(
    "UPDATE users SET name = %s, password_hash = %s WHERE email = %s RETURNING id, name, email",
    ("Alex", hashed, email)
)
row = cur.fetchone()
conn.commit()
cur.close()
conn.close()

if row:
    print(f"SUCCESS: Updated user id={row[0]}, name={row[1]}, email={row[2]}")
    print(f"\nLogin credentials:")
    print(f"  Email:    {email}")
    print(f"  Password: {password}")
else:
    print(f"ERROR: No user found with email {email}")
