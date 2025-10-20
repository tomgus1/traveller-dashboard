import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local. Current: URL=${!!supabaseUrl}, KEY=${!!supabaseAnonKey}`
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Role-based access control helpers for campaigns
export const getUserCampaignRole = async (campaignId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("campaign_members")
    .select("is_admin, is_gm, is_player")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (error) return null;

  // Return the highest priority role
  if (data.is_admin) return "admin";
  if (data.is_gm) return "gm";
  if (data.is_player) return "player";
  return null;
};

export const canViewCampaign = async (campaignId: string) => {
  const role = await getUserCampaignRole(campaignId);
  return role !== null;
};
