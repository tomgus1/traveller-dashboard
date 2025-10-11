import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types/supabase";

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

// Role-based access control helpers
export const getUserCampaignRole = async (campaignId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("campaign_members")
    .select("role")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data.role;
};

export const canEditCharacter = async (characterId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: character } = await supabase
    .from("characters")
    .select("owner_id, campaign_id")
    .eq("id", characterId)
    .single();

  if (!character) return false;

  // Character owner can always edit
  if (character.owner_id === user.id) return true;

  // Admin can edit any character
  const role = await getUserCampaignRole(character.campaign_id);
  return role === "admin";
};

export const canEditSharedData = async (campaignId: string) => {
  const role = await getUserCampaignRole(campaignId);
  return role === "player" || role === "admin";
};

export const canViewCampaign = async (campaignId: string) => {
  const role = await getUserCampaignRole(campaignId);
  return role !== null;
};
