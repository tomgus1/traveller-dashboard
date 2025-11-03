# Supabase Email Invitations Setup Guide

## 🎯 Overview
This setup uses Supabase's native SMTP server and email templates to handle campaign invitations without any third-party services.

## 📋 Prerequisites

### 1. Supabase Email Configuration
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Settings > Email Templates
3. Customize the "Invite user" template if desired
4. Ensure SMTP is configured (Supabase provides this by default)

### 2. Deploy the Edge Function
The Edge Function has service role permissions to send invitations.

## 🚀 Deployment Steps

### Step 1: Deploy the Edge Function
```bash
# Make sure you're in the project root
cd /Users/tomgus1/dev/traveller-dashboard

# Deploy the invite-user Edge Function
npx supabase functions deploy invite-user

# Or if you have Supabase CLI linked:
supabase functions deploy invite-user
```

### Step 2: Set Environment Variables
The Edge Function needs these environment variables (usually set automatically):
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (has admin permissions)

These are typically available by default in Edge Functions.

### Step 3: Test the Integration
1. Try inviting a user with an email that doesn't exist in your system
2. Check that the invitation email is sent
3. Have the user sign up using the invitation link
4. Verify they are automatically added to the campaign

## 📧 How It Works

### For Existing Users
1. User email is found in `user_profiles`
2. User is added directly to the campaign
3. No email needed

### For New Users
1. User email not found in system
2. Edge Function calls `supabase.auth.admin.inviteUserByEmail()`
3. Supabase sends invitation email using native templates
4. Email includes campaign metadata in user data
5. When user signs up, `useAuthInvitationHandler` hook detects invitation
6. User is automatically added to the campaign with correct role

## 🔧 Customization

### Email Template Customization
1. Go to Supabase Dashboard > Authentication > Email Templates
2. Select "Invite user" template
3. Customize the subject and body
4. Use variables like `{{ .Email }}`, `{{ .SiteURL }}`, etc.
5. The invitation link will redirect to your app with campaign parameters

### Campaign Data in Invitation
The invitation includes this metadata:
```json
{
  "campaign_id": "uuid",
  "campaign_name": "Campaign Name",
  "role": "player|gm|admin",
  "invited_via": "campaign_invitation"
}
```

### Redirect URL
Users are redirected to: `your-domain.com/auth?invited_to_campaign=ID&role=ROLE`

## 🛠️ Troubleshooting

### Common Issues

1. **"Failed to send invitation: User not allowed"**
   - Edge Function may not be deployed
   - Service role key might be missing
   - Check Supabase function logs

2. **Users not automatically added to campaign**
   - Check browser console for errors
   - Verify `useAuthInvitationHandler` is working
   - Check URL parameters after signup

3. **Edge Function not found**
   - Ensure function is deployed: `supabase functions deploy invite-user`
   - Check function name matches the URL path

### Debug Steps
1. Check Supabase Edge Function logs in dashboard
2. Test the Edge Function directly using curl or Postman
3. Verify environment variables are set in Edge Function
4. Check browser network tab for fetch requests

## 🎉 Benefits

### ✅ Native Supabase Integration
- Uses Supabase's built-in SMTP server
- No third-party email service needed
- Professional email templates included
- GDPR compliant by default

### ✅ Automatic Campaign Assignment
- New users are automatically added to campaigns
- Invitation data preserved during signup
- Seamless user experience

### ✅ Security
- Service role permissions only in Edge Function
- Client-side code uses anon key only
- Invitation data encrypted in user metadata

## 🚀 Going Live

### For Production:
1. **Deploy Edge Function** to production Supabase project
2. **Customize email templates** with your branding
3. **Set up custom domain** for professional emails (optional)
4. **Test the complete flow** with real email addresses

### Email Limits:
- Supabase includes email in free tier
- Check your project's email usage in dashboard
- Consider upgrading if you need higher limits

The email invitation system now uses 100% Supabase native infrastructure! 🎮✨