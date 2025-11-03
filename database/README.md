# Database Setup# Database Setup - Traveller Dashboard# Database Setup - Traveller Dashboard

Complete database setup for the Traveller Dashboard.This directory contains the complete database setup for the Traveller Dashboard application.This directory contains the clean, minimal database setup for the Traveller Dashboard application.

## Quick Setup## Files## What's Here

Run these files **in order** in your Supabase SQL Editor:- **`fresh-start.sql`** - Complete database setup from scratch (USE THIS!)**`setup.sql`** - The ONLY file you need! Contains complete database schema, policies, and email invitation system.

### 1. Create Tables- `README.md` - This documentation file

````sql

-- File: 01-create-tables.sql**`README.md`** - This documentation file.

-- Run this first

```## Quick Setup



Creates:## Quick Setup

- All database tables (users, campaigns, characters, invitations, etc.)

- Custom types (user_role enum)1. Open your **Supabase SQL Editor**

- Triggers for role synchronization

2. Copy and paste the entire contents of `fresh-start.sql`1. **Run the setup script** in your Supabase SQL editor:

### 2. Add Policies & Functions

```sql3. Run the script

-- File: 02-policies-functions.sql

-- Run this after step 1 completes   ```sql

````

`````

Adds:

- Row Level Security (RLS) policiesThe script will: -- Copy and paste the contents of setup.sql into your Supabase SQL editor

- Essential database functions

- Access control rules- ✅ Drop all existing tables, functions, and policies (clean slate) ```



## Why Two Files?- ✅ Create a complete, working database schema



Splitting prevents **"relation does not exist"** errors. Part 1 creates all tables first, then Part 2 adds policies that reference those tables.- ✅ Set up Row Level Security policies (no infinite recursion)2. **Configure Supabase Email Templates** (optional):



## What's Created- ✅ Create all necessary functions with correct parameter names - Go to Authentication > Email Templates in your Supabase dashboard



### Tables- ✅ Enable email invitations (compatible with Supabase Auth) - Customize the "Invite user" template for campaign invitations

- Enable SMTP settings if you want custom email delivery

**Core:**

- `user_profiles` - User account data (username, display_name, etc.)## What's Included

- `campaigns` - Game campaigns

- `campaign_members` - Campaign membership with roles## How Email Invitations Work

- `characters` - Player characters

**Tables:**

**Character Data:**

- `character_finance` - Financial transactions- `user_profiles` - User information with username and display_name### For Existing Users

- `character_inventory` - Inventory items

- `character_weapons` - Weapons- `campaigns` - Traveller campaigns

- `character_armour` - Armour

- `character_ammo` - Ammunition- `campaign_members` - Campaign membership with admin/gm/player roles- Users are added directly to campaigns immediately



**System:**- `characters` - Player characters

- `campaign_invitations` - Email invitation system (works with Brevo)

- `character_finance` - Financial transactions### For New Users

### Key Features

- `character_inventory` - Inventory items

✅ **Dual Role System** - Both `role TEXT` (app uses) and `is_admin/is_gm/is_player BOOLEAN` (policies use) with automatic sync trigger

- `character_weapons` - Weapons- An invitation record is created in `campaign_invitations`

✅ **Non-Recursive RLS Policies** - Simple policies that prevent infinite loops

- `character_armour` - Armour- When the user signs up, they're automatically added to campaigns they were invited to

✅ **Email Invitations** - Ready for Brevo email integration

- `character_ammo` - Ammunition- You can use Supabase's native "Invite user" email template to notify them

✅ **Profile Completion Tracking** - Knows when users finish setup

- `campaign_invitations` - Email invitations

✅ **Campaign Creator Auto-Admin** - Campaign creators automatically get admin role

### Database Functions Available

### Functions

**Features:**

- `get_user_profile_data(user_id)` - Get user profile

- `create_user_profile(user_id, email, display_name, username)` - Create/update profile- Dual role system (both `role` column and boolean columns)- `accept_campaign_invitation(invitation_id)` - Accept an invitation

- `create_standalone_character(...)` - Create character

- `get_user_invitations(email)` - Get pending invitations- Automatic role synchronization via trigger- `decline_campaign_invitation(invitation_id)` - Decline an invitation

- `accept_invitation(invitation_id)` - Accept invitation and join campaign

- `get_user_campaign_role(campaign_id, user_id)` - Get user's role in campaign- Simple, non-recursive RLS policies- `get_user_invitations(email)` - Get pending invitations for an email



## Role System- Email-compatible (no conflicting triggers)



**Campaign Creator:**- Profile completion tracking## Email Integration Options

- Automatically becomes admin

- Full control over their campaigns**Functions:**### Option 1: Manual Invitation (Current)

- Can manage all members and characters

- `get_user_profile_data(user_id)` - Get user profile

**Campaign Members:**

- `admin` - Full permissions (same as creator)- `create_user_profile(user_id, email, display_name, username)` - Create profile- Create invitation records in database

- `gm` - Game Master, can assist with campaign management

- `player` - Regular player, manages own characters- `create_standalone_character(...)` - Create character- Manually invite users via Supabase Auth dashboard if needed



## Permissions- `get_user_invitations(email)` - Get pending invitations- Users are auto-added to campaigns when they sign up



| Action | Creator/Admin | GM | Player |- `accept_invitation(invitation_id)` - Accept invitation

|--------|--------------|-----|--------|

| Create campaign | ✅ | ✅ | ✅ |- `get_user_campaign_role(campaign_id, user_id)` - Get user's role### Option 2: Automated with Supabase SMTP

| Edit campaign | ✅ | ❌ | ❌ |

| Invite users | ✅ | ❌ | ❌ |## Role System- Set up custom SMTP in Supabase

| Manage members | ✅ | ❌ | ❌ |

| View all characters | ✅ | ✅ | Own only |- Customize email templates

| Edit all characters | ✅ | ❌ | Own only |

**Campaign Members have dual role format:**- Use Supabase's `auth.admin.inviteUserByEmail()` in Edge Functions

## Migration Safe

````sql

Both files can be run multiple times safely:

- Part 1 drops and recreates everything (clean slate)role = 'admin' | 'gm' | 'player'  -- App uses thisThe current setup uses **Option 1** - simple, reliable, and uses Supabase's native infrastructure.

- Part 2 replaces policies and functions

is_admin = true/false              -- Policies use this

**⚠️ WARNING:** Part 1 will **delete all existing data**. Use only for fresh setups or when you want to start over.

is_gm = true/false## Database Schema

## Next Steps

is_player = true/false

After running both files:

```- `campaign_invitations` - Tracks pending invitations

1. ✅ Database ready

2. 📧 Configure Brevo for email invitations (see `EMAIL_SETUP.md`)- Automatic triggers handle user signup and campaign assignment

3. 🚀 Deploy the Edge Function (`supabase functions deploy invite-user`)

4. 🎉 Start inviting users to campaigns!Automatic trigger keeps them synchronized!- All tables have proper RLS policies for security



## Troubleshooting



**"relation does not exist" error:****Permissions:**## Running setup.sql

- Make sure you ran Part 1 first and it completed successfully

- Check that you're running Part 2 in the same database- **Campaign Creator**: Auto-admin, full control



**Policies not working:**- **Admin**: Manage campaign and membersThe setup.sql file is designed to be **idempotent** - you can run it multiple times safely:

- Verify RLS is enabled on all tables (Part 2 does this)

- Check Supabase logs for policy errors- **GM**: Assist with campaign management



**Email invitations not working:**- **Player**: Manage own characters- Uses `CREATE TABLE IF NOT EXISTS`

- Database schema is ready! Check `EMAIL_SETUP.md` for Brevo configuration

- Uses `CREATE OR REPLACE FUNCTION`

---

## URL Configuration- Handles data migrations safely

Need help? Check the main `README.md` or `EMAIL_SETUP.md` for email-specific setup.

- Preserves existing data

The database works with both:

- Local: `http://localhost:5173/traveller-dashboard/`This means you can update the schema by editing setup.sql and re-running it without losing data.

- GitHub Pages: `https://tomgus1.github.io/traveller-dashboard/`

## Database Tables

## Notes

The application uses 4 core tables plus character data tables:

- The script is safe to run multiple times (drops everything first)

- No infinite recursion in policies### Core Tables

- Compatible with Supabase email invitations

- All functions have correct parameter names matching app expectations1. **`user_profiles`** - User profile management and metadata

- Links to Supabase auth users
- Stores display names, usernames, and profile completion status
- Includes unique username constraints and validation

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
`````
