#!/bin/sh

# Use environment variables for Supabase URL and API Key
DB_URL="$SUPABASE_URL"
API_KEY="$SUPABASE_ANON_KEY"

# Make a GET request to a dummy table in your database
curl -H "apikey: $API_KEY" "$DB_URL/rest/v1/dummy_table?select=*"
