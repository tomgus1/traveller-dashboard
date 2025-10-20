-- Create pending_invitations table for users who haven't signed up yet
CREATE TABLE pending_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'gm', 'player')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure unique email per campaign
    UNIQUE(email, campaign_id)
);

-- Add RLS policies for pending_invitations
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Users can see invitations for campaigns they're admin/gm of
CREATE POLICY "Campaign admins can view pending invitations" ON pending_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM campaign_members cm
            WHERE cm.campaign_id = pending_invitations.campaign_id
            AND cm.user_id = auth.uid()
            AND (cm.is_admin = true OR cm.is_gm = true)
        )
    );

-- Users can see their own pending invitations by email
CREATE POLICY "Users can view their own pending invitations" ON pending_invitations
    FOR SELECT USING (
        email = (
            SELECT email FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Campaign admins can create pending invitations
CREATE POLICY "Campaign admins can create pending invitations" ON pending_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM campaign_members cm
            WHERE cm.campaign_id = pending_invitations.campaign_id
            AND cm.user_id = auth.uid()
            AND (cm.is_admin = true OR cm.is_gm = true)
        )
    );

-- Campaign admins can update pending invitations (for acceptance)
CREATE POLICY "Campaign admins can update pending invitations" ON pending_invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM campaign_members cm
            WHERE cm.campaign_id = pending_invitations.campaign_id
            AND cm.user_id = auth.uid()
            AND (cm.is_admin = true OR cm.is_gm = true)
        )
    );

-- Users can update their own pending invitations (for acceptance)
CREATE POLICY "Users can update their own pending invitations" ON pending_invitations
    FOR UPDATE USING (
        email = (
            SELECT email FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Campaign admins can delete pending invitations
CREATE POLICY "Campaign admins can delete pending invitations" ON pending_invitations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM campaign_members cm
            WHERE cm.campaign_id = pending_invitations.campaign_id
            AND cm.user_id = auth.uid()
            AND (cm.is_admin = true OR cm.is_gm = true)
        )
    );

-- Create function to automatically process pending invitations when a user signs up
CREATE OR REPLACE FUNCTION process_pending_invitations()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new user profile is created, check for pending invitations
    INSERT INTO campaign_members (campaign_id, user_id, is_admin, is_gm, is_player)
    SELECT 
        pi.campaign_id,
        NEW.id,
        (pi.role = 'admin'),
        (pi.role = 'gm'),
        (pi.role = 'player')
    FROM pending_invitations pi
    WHERE pi.email = NEW.email
    AND pi.expires_at > NOW()
    AND pi.accepted_at IS NULL;
    
    -- Mark the pending invitations as accepted
    UPDATE pending_invitations
    SET accepted_at = NOW()
    WHERE email = NEW.email
    AND expires_at > NOW()
    AND accepted_at IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically process pending invitations
CREATE TRIGGER process_pending_invitations_trigger
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION process_pending_invitations();

-- Create function to send invitation emails (placeholder for now)
CREATE OR REPLACE FUNCTION send_campaign_invitation(
    p_email VARCHAR(255),
    p_campaign_id UUID,
    p_campaign_name VARCHAR(255),
    p_inviter_name VARCHAR(255),
    p_role VARCHAR(20)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- This is a placeholder function that would integrate with your email service
    -- For now, we'll just return true to indicate the "email was sent"
    -- In a real implementation, this would call your email service API
    
    -- You could integrate with services like:
    -- - Supabase Edge Functions
    -- - SendGrid
    -- - Mailgun
    -- - Resend
    -- etc.
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;