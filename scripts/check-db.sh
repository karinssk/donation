#!/bin/bash

# Helper script to check database status

# Load DB credentials from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DB_USER=${DB_USER:-lineuser}
DB_NAME=${DB_NAME:-line_donation}
DB_PASSWORD=${DB_PASSWORD}
DB_PORT=${DB_PORT:-3306}

echo "==================================="
echo "DATABASE STATUS CHECK"
echo "==================================="
echo ""

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Port: $DB_PORT"
echo ""

# Detect if using PostgreSQL or MySQL
if [ "$DB_PORT" = "5432" ] && command -v psql &> /dev/null; then
  # PostgreSQL
  echo "Using PostgreSQL"
  echo ""

  echo "==================================="
  echo "TABLES"
  echo "==================================="
  psql -U $DB_USER -d $DB_NAME -c "\dt"

  echo ""
  echo "==================================="
  echo "ADMINS"
  echo "==================================="
  psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM admins;"

  echo ""
  echo "==================================="
  echo "PROJECTS"
  echo "==================================="
  psql -U $DB_USER -d $DB_NAME -c "SELECT id, name, current_amount, status FROM projects;"

  echo ""
  echo "==================================="
  echo "KEYWORDS"
  echo "==================================="
  psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM keywords;"

  echo ""
  echo "==================================="
  echo "SETTINGS"
  echo "==================================="
  psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM settings;"

  echo ""
  echo "==================================="
  echo "RECENT DONATIONS"
  echo "==================================="
  psql -U $DB_USER -d $DB_NAME -c "SELECT id, project_id, display_name, amount_final, status, created_at FROM donations ORDER BY created_at DESC LIMIT 10;"

else
  # MySQL/MariaDB
  echo "Using MySQL/MariaDB"
  echo ""

  echo "==================================="
  echo "TABLES"
  echo "==================================="
  mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES;"

  echo ""
  echo "==================================="
  echo "ADMINS"
  echo "==================================="
  mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT * FROM admins;"

  echo ""
  echo "==================================="
  echo "PROJECTS"
  echo "==================================="
  mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT id, name, current_amount, status FROM projects;"

  echo ""
  echo "==================================="
  echo "KEYWORDS"
  echo "==================================="
  mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT * FROM keywords;"

  echo ""
  echo "==================================="
  echo "SETTINGS"
  echo "==================================="
  mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT * FROM settings;"

  echo ""
  echo "==================================="
  echo "RECENT DONATIONS"
  echo "==================================="
  mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT id, project_id, display_name, amount_final, status, created_at FROM donations ORDER BY created_at DESC LIMIT 10;"
fi
