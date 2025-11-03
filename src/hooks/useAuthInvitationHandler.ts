import { useEffect } from 'react';
import { supabase } from '../infrastructure/database/supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export const useAuthInvitationHandler = () => {
  useEffect(() => {
    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      // Handle new user signup from invitation
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;
        
        // Check if user was invited to a campaign
        const urlParams = new URLSearchParams(window.location.search);
        const invitedToCampaign = urlParams.get('invited_to_campaign');
        const role = urlParams.get('role');
        
        // Also check user metadata for invitation data
        const campaignId = invitedToCampaign || user.user_metadata?.campaign_id;
        const campaignRole = role || user.user_metadata?.role;
        
        if (campaignId && campaignRole) {
          try {
            // Add user to the campaign
            const { error } = await supabase
              .from('campaign_members')
              .insert({
                campaign_id: campaignId,
                user_id: user.id,
                is_admin: campaignRole === 'admin',
                is_gm: campaignRole === 'gm',
                is_player: campaignRole === 'player',
              });

            if (!error) {
              // Clean up URL parameters
              const newUrl = window.location.pathname;
              window.history.replaceState({}, '', newUrl);
            }
          } catch {
            // Silently fail - user can be manually added later
          }
        }
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      subscription.unsubscribe();
    };
  }, []);
};