# Email Invitations with Brevo

Complete guide for setting up and using email invitations via Brevo (formerly Sendinblue).

**Status:** ✅ Working - Emails delivered successfully (may go to spam initially)

---

## 🚀 Quick Setup (5 minutes)

### 1. Create Brevo Account

1. Go to [brevo.com](https://www.brevo.com/)
2. Sign up for free (no credit card needed!)
3. Verify your email

### 2. Get API Key

1. Log in to Brevo dashboard
2. Go to **Settings** (top right) → **SMTP & API**
3. Click **API Keys** tab
4. Click **Generate a new API key**
5. Name it "Traveller Dashboard"
6. **Copy the key** (you only see it once!)

### 3. Configure Supabase

```bash
# Set Brevo API key
supabase secrets set BREVO_API_KEY=your-api-key-here

# Set sender email (use your verified email)
supabase secrets set BREVO_SENDER_EMAIL=your-email@example.com
supabase secrets set BREVO_SENDER_NAME="Traveller Dashboard"
```

### 4. Deploy Edge Function

```bash
cd /Users/tomgus1/dev/traveller-dashboard
supabase functions deploy invite-user
```

### 5. Test It

1. Open your app
2. Create a campaign
3. Invite a user
4. ✅ Email delivered!

**Note:** First emails often go to spam - recipients should check spam folder and mark as "Not Spam".

---

## 📧 How It Works

1. **User clicks "Invite"** → App calls Edge Function
2. **Edge Function**:
   - Creates invitation record in database
   - Sends HTML email via Brevo API
   - Returns success/error
3. **Recipient clicks link** → Redirected to app
4. **App accepts invitation** → User added to campaign

---

## 🔧 Advanced Configuration

### Email Templates (Optional)

Create custom branded emails in Brevo:

1. Go to **Campaigns** → **Templates** → **Email Templates**
2. Click **Create my first template**
3. Use drag-and-drop editor or HTML
4. Include these variables:
   - `{{params.campaignName}}` - Campaign name
   - `{{params.inviterName}}` - Who invited them
   - `{{params.acceptUrl}}` - Accept link
   - `{{params.role}}` - Their role
5. Save and note the **Template ID**

Then configure it:

```bash
supabase secrets set BREVO_TEMPLATE_ID=your-template-id
supabase functions deploy invite-user
```

### Custom Domain (Production)

For better deliverability:

1. Buy a domain (Namecheap, Google Domains, etc.)
2. Add it to Brevo (**Settings** → **Senders & IP**)
3. Configure DNS records (SPF, DKIM, DMARC) as shown in Brevo
4. Use `noreply@yourdomain.com` as sender

---

## 🐛 Troubleshooting

### Email Not Received?

**Check Brevo Dashboard:**

1. Go to https://app.brevo.com/statistics/email
2. Find your sent email
3. Check status:
   - ✅ **Delivered** - Check spam folder
   - ⏳ **Processing** - Wait a minute
   - ❌ **Failed** - Check error details

**Check Spam Folder:**

- First emails from new senders often go to spam
- Hotmail/Outlook has aggressive filtering
- Gmail may categorize as "Promotions"
- Mark as "Not Spam" to improve future delivery

**Check Supabase Logs:**

```bash
# View logs in Supabase Dashboard:
# Edge Functions → invite-user → Logs
```

Look for:

- `"Sending email via Brevo to: ..."`
- `"Brevo response status: 201"` (success)
- `"Brevo success! Message ID: ..."`

### Common Issues

#### Gmail Sender with DKIM/DMARC Warnings

**Problem:** Using Gmail as sender shows warnings in Brevo dashboard.

**Solution:** Gmail's DMARC policy blocks third-party senders.

**Options:**

1. **Use Brevo's default sender** (easiest for testing)
2. **Get a custom domain** (best for production)
3. **Accept lower deliverability** with Gmail

#### Invitation Created But No Email

**Check:**

1. Brevo API key is correct
2. Sender email is verified in Brevo
3. Edge Function deployed successfully
4. Check Supabase function logs for errors

**Fix:**

```bash
# Verify secrets are set
supabase secrets list

# Redeploy function
supabase functions deploy invite-user
```

#### Database Record Exists But Email Failed

The invitation was created but email sending failed. Check:

- Brevo dashboard for error details
- Supabase logs for "Brevo API error"
- Daily quota (300 emails/day on free tier)

---

## 📊 Free Tier Limits

**Brevo Free Tier:**

- ✅ 300 emails/day (perfect for invitations!)
- ✅ Unlimited contacts
- ✅ Email tracking and statistics
- ✅ Professional templates
- ✅ No credit card required

---

## ✅ Testing Checklist

- [ ] Brevo account created
- [ ] API key configured in Supabase
- [ ] Sender email verified in Brevo
- [ ] Edge Function deployed
- [ ] Test invitation sent
- [ ] Email received (check spam)
- [ ] Invitation link works
- [ ] User can sign up/in
- [ ] Campaign appears in user's list
- [ ] Correct role assigned

---

## 📚 What's Included

**Files:**

- `supabase/functions/invite-user/index.ts` - Edge Function with Brevo integration
- `database/fresh-start.sql` - Database schema with invitations table
- This file - Complete setup and troubleshooting guide

**Features:**

- HTML email with campaign details and accept button
- Database-only invitations (no Supabase Auth dependency)
- Template support (optional)
- Detailed logging for debugging
- Works with both local and GitHub Pages deployments

---

## 💡 Tips

**Improve Deliverability:**

- Use a custom domain with proper DNS records
- Ask recipients to whitelist your sender email
- Keep email content professional and concise
- Monitor Brevo statistics for bounces/blocks

**For Production:**

- Set up SPF, DKIM, and DMARC records
- Use branded email templates
- Monitor daily quota usage
- Consider upgrading if you need more emails

**Testing:**

- Use https://temp-mail.org/ for testing
- Check both desktop and mobile email clients
- Test spam folder behavior
- Verify links work in all email clients

---

Need help? Check [Brevo documentation](https://developers.brevo.com/) or [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions).
