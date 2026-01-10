#!/bin/bash

# Helper script to add admin users

if [ -z "$1" ]; then
  echo "Usage: ./scripts/add-admin.sh <LINE_USER_ID> [DISPLAY_NAME]"
  echo "Example: ./scripts/add-admin.sh Uxxxxxxxxxxxxx 'Admin Name'"
  exit 1
fi

LINE_USER_ID=$1
DISPLAY_NAME=${2:-"Admin"}

# Load DB credentials from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DB_USER=${DB_USER:-lineuser}
DB_NAME=${DB_NAME:-line_donation}
DB_PASSWORD=${DB_PASSWORD}

echo "Adding admin user..."
echo "LINE User ID: $LINE_USER_ID"
echo "Display Name: $DISPLAY_NAME"

# Detect if using PostgreSQL or MySQL
if command -v psql &> /dev/null && [ "${DB_PORT:-5432}" = "5432" ]; then
  # PostgreSQL
  psql -U $DB_USER -d $DB_NAME -c "INSERT INTO admins (line_user_id, display_name) VALUES ('$LINE_USER_ID', '$DISPLAY_NAME') ON CONFLICT (line_user_id) DO UPDATE SET display_name = '$DISPLAY_NAME';"
else
  # MySQL/MariaDB
  mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "INSERT INTO admins (line_user_id, display_name) VALUES ('$LINE_USER_ID', '$DISPLAY_NAME') ON DUPLICATE KEY UPDATE display_name = '$DISPLAY_NAME';"
fi

if [ $? -eq 0 ]; then
  echo "✓ Admin added successfully!"
else
  echo "✗ Failed to add admin"
  exit 1
fi
