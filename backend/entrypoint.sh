#!/bin/sh
set -e

echo "Starting Backend Entrypoint..."

# Wait for MySQL
DB_HOST="${DATABASE_HOST:-db}"
DB_PORT="${DATABASE_PORT:-3306}"
DB_WAIT_TIMEOUT="${DATABASE_WAIT_TIMEOUT:-120}"
echo "Waiting for mysql host '${DB_HOST}' on port ${DB_PORT}..."
# Simple wait loop using python
python << END
import socket
import time
import sys

host = "${DB_HOST}"
port = int("${DB_PORT}")
timeout = int("${DB_WAIT_TIMEOUT}")
start = time.time()
while True:
    try:
        with socket.create_connection((host, port), timeout=2):
            print("MySQL is responding.")
            sys.exit(0)
    except OSError:
        if time.time() - start > timeout:
            print("Timeout waiting for MySQL.")
            sys.exit(1)
        time.sleep(1)
        print(f"Waiting for {host}...")
END

echo "MySQL started. Running migrations..."
python manage.py makemigrations
python manage.py migrate
echo "Migrations applied."

echo "Seeding test data..."
python seed.py
echo "Seed complete."

echo "Starting server..."
exec "$@"
