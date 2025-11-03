// Quick test script to check if Supabase emails are working
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("Testing Supabase email invitation...");
console.log("URL:", supabaseUrl);
console.log("Key starts with:", supabaseAnonKey?.substring(0, 20) + "...");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test the Edge Function with real data
async function testInvite() {
  try {
    // First get a real campaign ID
    const { data: campaigns, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, name")
      .limit(1);

    if (campaignError || !campaigns.length) {
      console.error("No campaigns found:", campaignError);
      return;
    }

    const campaign = campaigns[0];
    console.log("Testing with campaign:", campaign.name, campaign.id);

    // Test the Edge Function
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: {
        email: "test@example.com",
        campaignId: campaign.id,
        role: "player",
      },
    });

    console.log("Edge Function Response:");
    console.log("Data:", data);
    console.log("Error:", error);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testInvite();
