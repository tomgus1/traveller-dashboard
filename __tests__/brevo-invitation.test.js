/**
 * Test script for Brevo invitation system
 *
 * This tests the complete invitation flow:
 * 1. Create a test campaign
 * 2. Send an invitation via the Edge Function
 * 3. Verify the invitation was created in the database
 * 4. Check that email was sent via Brevo
 *
 * Usage:
 *   node test-brevo-invitation.js <your-email> <test-recipient-email>
 *
 * Example:
 *   node test-brevo-invitation.js admin@example.com friend@example.com
 */

import { createClient } from "@supabase/supabase-js";

// Get command line arguments
const [adminEmail, recipientEmail] = process.argv.slice(2);

if (!adminEmail || !recipientEmail) {
  console.error(
    "❌ Usage: node test-brevo-invitation.js <your-email> <recipient-email>"
  );
  console.error(
    "Example: node test-brevo-invitation.js you@example.com friend@example.com"
  );
  process.exit(1);
}

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing environment variables:");
  console.error("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set");
  process.exit(1);
}

console.log("\n🧪 Testing Brevo Invitation System\n");
console.log("Admin Email:", adminEmail);
console.log("Recipient Email:", recipientEmail);
console.log("─".repeat(60), "\n");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTest() {
  try {
    // Step 1: Sign in or create admin user
    console.log("📝 Step 1: Authenticating admin user...");

    let authResult = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: "TestPassword123!", // You'll need to use your actual password
    });

    if (authResult.error) {
      console.log("   ℹ️  User not found, this is a manual test.");
      console.log("   Please sign in to your app first with:", adminEmail);
      console.log("   Then run this script again.\n");
      return;
    }

    console.log("   ✅ Authenticated as:", authResult.data.user.email);
    const userId = authResult.data.user.id;

    // Step 2: Create a test campaign
    console.log("\n📝 Step 2: Creating test campaign...");

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        name: "Test Campaign - " + new Date().toISOString(),
        description: "Automated test campaign for Brevo invitations",
        created_by: userId,
      })
      .select()
      .single();

    if (campaignError) {
      throw new Error(`Failed to create campaign: ${campaignError.message}`);
    }

    console.log("   ✅ Campaign created:", campaign.name);
    console.log("   Campaign ID:", campaign.id);

    // Step 3: Call the Edge Function to send invitation
    console.log("\n📝 Step 3: Sending invitation via Edge Function...");

    const { data: inviteData, error: inviteError } =
      await supabase.functions.invoke("invite-user", {
        body: {
          email: recipientEmail,
          campaignId: campaign.id,
          role: "player",
          campaignName: campaign.name,
        },
      });

    if (inviteError) {
      throw new Error(`Failed to send invitation: ${inviteError.message}`);
    }

    if (inviteData.error) {
      throw new Error(
        `Invitation error: ${inviteData.error} - ${inviteData.details || ""}`
      );
    }

    console.log("   ✅ Invitation sent successfully!");
    console.log("   Invitation ID:", inviteData.invitationId);
    console.log("   Email Message ID:", inviteData.messageId);

    // Step 4: Verify invitation in database
    console.log("\n📝 Step 4: Verifying invitation in database...");

    const { data: dbInvitation, error: dbError } = await supabase
      .from("campaign_invitations")
      .select("*")
      .eq("id", inviteData.invitationId)
      .single();

    if (dbError) {
      throw new Error(`Failed to fetch invitation: ${dbError.message}`);
    }

    console.log("   ✅ Invitation found in database:");
    console.log("      Email:", dbInvitation.invited_email);
    console.log("      Status:", dbInvitation.status);
    console.log("      Roles:", JSON.stringify(dbInvitation.roles_offered));

    // Step 5: Test getting user invitations
    console.log("\n📝 Step 5: Testing get_user_invitations function...");

    const { data: userInvites, error: invitesError } = await supabase.rpc(
      "get_user_invitations",
      { p_user_email: recipientEmail }
    );

    if (invitesError) {
      throw new Error(`Failed to get invitations: ${invitesError.message}`);
    }

    console.log(
      "   ✅ Found",
      userInvites?.length || 0,
      "pending invitation(s)"
    );
    if (userInvites && userInvites.length > 0) {
      console.log("      Campaign:", userInvites[0].campaign_name);
      console.log("      Invited by:", userInvites[0].invited_by_name);
    }

    // Success!
    console.log("\n" + "═".repeat(60));
    console.log("✅ ALL TESTS PASSED!");
    console.log("═".repeat(60));
    console.log("\n📧 Next Steps:");
    console.log("   1. Check", recipientEmail, "inbox for invitation email");
    console.log('   2. Click the "Accept Invitation" button in the email');
    console.log("   3. Sign up/in and verify you can see the campaign");
    console.log("\n💡 Tip: Check your spam folder if you don't see the email!");
    console.log("\n📊 You can also check Brevo dashboard:");
    console.log("   https://app.brevo.com/statistics/email\n");

    // Cleanup
    console.log("🧹 Cleanup: Delete test campaign? (y/N)");
    // Note: In a real script, you might prompt for this
    // For now, leave the campaign so you can test acceptance
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

runTest();
