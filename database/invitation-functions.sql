-- SQL functions for campaign invitation system
-- These functions provide a stable interface for the application to interact with campaign invitations

-- Function to create a campaign invitation
CREATE OR REPLACE FUNCTION create_campaign_invitation(
  p_campaign_id UUID,
  p_invited_email TEXT,
  p_invited_by UUID,
  p_roles_offered JSONB
) RETURNS UUID AS $$
DECLARE
  invitation_id UUID;
BEGIN
  INSERT INTO campaign_invitations (
    campaign_id,
    invited_email,
    invited_by,
    roles_offered,
    status,
    expires_at
  ) VALUES (
    p_campaign_id,
    p_invited_email,
    p_invited_by,
    p_roles_offered,
    'pending',
    NOW() + INTERVAL '7 days' -- Default 7-day expiration
  ) 
  RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user invitations with campaign details
CREATE OR REPLACE FUNCTION get_user_invitations(
  p_user_email TEXT
) RETURNS TABLE (
  id UUID,
  campaign_id UUID,
  invited_email TEXT,
  invited_by UUID,
  roles_offered JSONB,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  campaign_name TEXT,
  campaign_description TEXT,
  inviter_name TEXT,
  inviter_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.campaign_id,
    ci.invited_email,
    ci.invited_by,
    ci.roles_offered,
    ci.status,
    ci.created_at,
    ci.expires_at,
    c.name as campaign_name,
    c.description as campaign_description,
    up.display_name as inviter_name,
    up.email as inviter_email
  FROM campaign_invitations ci
  JOIN campaigns c ON ci.campaign_id = c.id
  JOIN user_profiles up ON ci.invited_by = up.id
  WHERE ci.invited_email = p_user_email
    AND ci.status = 'pending'
    AND ci.expires_at > NOW()
  ORDER BY ci.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept a campaign invitation
CREATE OR REPLACE FUNCTION accept_campaign_invitation(
  p_invitation_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details and verify it's still valid
  SELECT * INTO invitation_record
  FROM campaign_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > NOW();
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired';
  END IF;
  
  -- Add user to campaign with specified roles
  INSERT INTO campaign_members (
    campaign_id,
    user_id,
    role,
    is_admin,
    is_gm,
    is_player
  ) VALUES (
    invitation_record.campaign_id,
    p_user_id,
    'player', -- Default role for backward compatibility
    (invitation_record.roles_offered->>'isAdmin')::BOOLEAN,
    (invitation_record.roles_offered->>'isGm')::BOOLEAN,
    COALESCE((invitation_record.roles_offered->>'isPlayer')::BOOLEAN, true)
  );
  
  -- Update invitation status
  UPDATE campaign_invitations
  SET 
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = p_invitation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline a campaign invitation
CREATE OR REPLACE FUNCTION decline_campaign_invitation(
  p_invitation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE campaign_invitations
  SET status = 'declined'
  WHERE id = p_invitation_id
    AND status = 'pending';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_campaign_invitation(UUID, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_invitations(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_campaign_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_campaign_invitation(UUID) TO authenticated;