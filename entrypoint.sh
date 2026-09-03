#!/bin/bash
set -e

DB_FILE="/app/data/ppr.db"
TEMPLATE="/app/data-template/ppr.db"

# If database doesn't exist on volume, copy the pre-seeded template
if [ ! -f "$DB_FILE" ]; then
  echo "First boot: copying pre-seeded database..."
  cp "$TEMPLATE" "$DB_FILE"
  echo "Database ready."
else
  echo "Database already exists. Skipping initialization."
fi

# Start the Next.js production server
echo "Starting PPR AI server on port 3000..."
exec node server.js
