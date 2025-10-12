# Database Setup - Traveller Dashboard

This directory contains the clean, minimal database setup for the Traveller Dashboard application.

## What's Here

**`setup.sql`** - The ONLY file you need! Contains complete database schema and policies.

**`README.md`** - This documentation file.

## Database Tables

The application uses only 3 essential tables:

1. **`user_profiles`** - Additional user information beyond Supabase auth
   - Links to Supabase auth users
   - Stores display names and email

2. **`campaigns`** - Campaign management and metadata
   - Campaign name and description
   - Created by user reference
   - Timestamps for tracking

3. **`campaign_members`** - User roles and membership in campaigns
   - Links users to campaigns with roles (admin, gm, player)
   - Unique constraint to prevent duplicate memberships

## Setup Instructions

### For New Supabase Project

1. Copy the contents of `setup.sql`
2. Paste into your Supabase SQL Editor
3. Run the query
4. Done! ✅

### Row Level Security

The setup includes comprehensive RLS policies that:

- Allow users to view their own profiles and update them
- Allow campaign members to view campaigns they belong to
- Allow campaign creators to manage their campaigns
- Allow proper role-based access to membership management

## Why This Approach?

✅ **Single File Setup** - Everything in one place  
✅ **Clean and Simple** - Only what the app actually uses  
✅ **No Legacy Code** - Removed all unused tables and complex migrations  
✅ **Proven Working** - Based on actual application usage analysis  
✅ **Future Ready** - Easy to expand when new features are added

## Application Architecture

This database supports the clean architecture pattern used in the application:

- **Core Layer** - Business logic for campaigns and user management
- **Infrastructure Layer** - Supabase implementation
- **Presentation Layer** - React components and hooks

The database schema perfectly matches what the application actually needs, nothing more, nothing less.
