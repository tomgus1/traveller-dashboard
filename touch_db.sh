#!/bin/bash

# Use environment variables for Supabase URL and API Key
DB_URL="$SUPABASE_URL"
API_KEY="$SUPABASE_ANON_KEY"

# Verify environment variables are set
if [ -z "$DB_URL" ] || [ -z "$API_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set"
  exit 1
fi

# Make a GET request to keep the database connection alive
# Using campaigns table with limit=0 for minimal data transfer
curl -s -H "apikey: $API_KEY" "${DB_URL}/rest/v1/campaigns?select=id&limit=0" > /dev/null 2>&1

# Check if curl succeeded
if [ $? -eq 0 ]; then
  echo "✅ Database touched successfully at $(date)"
else
  echo "❌ Failed to touch database at $(date)"
  exit 1
fi
