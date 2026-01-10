#!/bin/bash

# Copy SQL files to dist directory for migration
mkdir -p dist/db
cp src/db/schema.sql dist/db/schema.sql 2>/dev/null || cp src/db/schema-mysql.sql dist/db/schema.sql

echo "✓ SQL files copied to dist/"
