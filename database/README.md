# Database Setup - Traveller Dashboard

This directory contains the clean, minimal database setup for the Traveller Dashboard application.

## What's Here

**`setup.sql`** - The ONLY file you need! Contains complete database schema and policies.

**`README.md`** - This documentation file.

## Database Tables

The application uses 4 core tables plus character data tables:

### Core Tables

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

4. **`characters`** - Player characters within campaigns
   - Character names (both player name and character name)
   - Linked to campaigns and owned by users
   - Campaign-specific character management

### Character Data Tables

5. **`character_finance`** - Financial transactions per character per campaign
6. **`character_inventory`** - Inventory items per character per campaign
7. **`character_weapons`** - Weapons per character per campaign
8. **`character_armour`** - Armour per character per campaign
9. **`character_ammo`** - Ammunition per character per campaign

## Role System

### 🎭 Simplified Role Hierarchy

**CAMPAIGN CREATOR (Auto-Admin)**

- Automatically becomes admin when creating a campaign
- Can add/remove members with any role
- Can change member roles (admin, gm, player)
- Can edit/delete the campaign
- Can manage all characters in the campaign
- Full administrative control over their campaigns

**CAMPAIGN MEMBERS**

- **admin**: Same permissions as campaign creator (rarely used)
- **gm**: Game Master - can assist with campaign management
- **player**: Regular player - can manage their own characters

### 🔐 Security Implementation

- **Campaign Isolation**: Each campaign is completely isolated with creator having full control
- **Character Management**: Players manage their own characters; creators manage all characters in their campaigns
- **Membership Control**: Only campaign creators can add/remove members and assign roles
- **Data Access**: Campaign members can view campaign data; creators can modify everything

## Setup Instructions

### For New Supabase Project OR Migration

1. Copy the contents of `setup.sql`
2. Paste into your Supabase SQL Editor
3. Run the query
4. Done! ✅

**🔄 Migration Safe**: This script can be run multiple times safely. It will:

- Create tables if they don't exist
- Update policies to the latest version
- Add any missing user profiles for existing users
- Set up automatic user profile creation for new signups

### For Existing Projects

Simply run `setup.sql` again - it will:

- Skip creating tables that already exist
- Update security policies to fix any issues
- Ensure all existing users have proper profiles
- Add the user profile creation trigger

### Row Level Security

The setup includes comprehensive RLS policies that:

- Allow users to view their own profiles and update them
- Allow campaign members to view campaigns they belong to
- Allow campaign creators to manage their campaigns
- Allow proper role-based access to membership management

## Why This Approach?

✅ **Simplified Role System** - Campaign creators are auto-admins with full control  
✅ **Campaign Isolation** - Each campaign is independently managed by its creator  
✅ **Single File Setup** - Everything in one place  
✅ **Migration Safe** - Can be run multiple times without issues  
✅ **Auto User Profiles** - Automatically creates profiles for new users  
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
