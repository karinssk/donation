#!/bin/bash

echo "=================================="
echo "LINE Donation System - MySQL Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Rename files to use MySQL versions
echo -e "${YELLOW}Step 1: Switching to MySQL...${NC}"

# Backup original PostgreSQL files
if [ -f "src/db/database.ts" ]; then
    mv src/db/database.ts src/db/database-postgres.ts.bak
    echo "✓ Backed up PostgreSQL database.ts"
fi

if [ -f "src/db/schema.sql" ]; then
    mv src/db/schema.sql src/db/schema-postgres.sql.bak
    echo "✓ Backed up PostgreSQL schema.sql"
fi

if [ -f "src/scripts/migrate.ts" ]; then
    mv src/scripts/migrate.ts src/scripts/migrate-postgres.ts.bak
    echo "✓ Backed up PostgreSQL migrate.ts"
fi

# Use MySQL versions
cp src/db/database-mysql.ts src/db/database.ts
cp src/db/schema-mysql.sql src/db/schema.sql
cp src/scripts/migrate-mysql.ts src/scripts/migrate.ts

echo -e "${GREEN}✓ Switched to MySQL files${NC}"
echo ""

# Step 2: Install MySQL dependencies
echo -e "${YELLOW}Step 2: Installing MySQL dependencies...${NC}"
npm uninstall pg @types/pg 2>/dev/null
npm install mysql2
npm install --save-dev @types/mysql2

echo -e "${GREEN}✓ MySQL dependencies installed${NC}"
echo ""

# Step 3: Update .env
echo -e "${YELLOW}Step 3: Updating .env file...${NC}"

if [ -f ".env" ]; then
    # Update DB_PORT to 3306
    sed -i 's/DB_PORT=5432/DB_PORT=3306/g' .env
    echo "✓ Updated DB_PORT to 3306"
else
    echo -e "${RED}✗ .env file not found. Please create it from .env.example${NC}"
    exit 1
fi

echo -e "${GREEN}✓ .env updated${NC}"
echo ""

# Step 4: Build TypeScript
echo -e "${YELLOW}Step 4: Building TypeScript...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed. Please check errors above.${NC}"
    exit 1
fi

echo ""

# Step 5: Run migration
echo -e "${YELLOW}Step 5: Running database migration...${NC}"
npm run db:migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration successful${NC}"
else
    echo -e "${RED}✗ Migration failed. Please check errors above.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=================================="
echo "Setup Complete! 🎉"
echo "==================================${NC}"
echo ""
echo "Next steps:"
echo "1. Add your first admin:"
echo "   ./scripts/add-admin.sh YOUR_LINE_USER_ID 'Your Name'"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Test the connection:"
echo "   curl http://localhost:3000/health"
echo ""
