-- Reshape the 01-04 schema to look like the live DB (per src/infrastructure/types/supabase.ts)
DROP TRIGGER IF EXISTS handle_role_insert ON campaign_members;
ALTER TABLE campaign_members DROP COLUMN role;
ALTER TABLE campaign_members DROP CONSTRAINT campaign_members_campaign_id_user_id_key;

ALTER TABLE campaign_invitations ADD COLUMN expires_at TIMESTAMPTZ;  -- nullable, no default

CREATE TABLE pending_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);
CREATE POLICY "legacy wide open" ON pending_invitations FOR ALL USING (true);

-- Legacy RPCs with the live signatures (bodies deliberately insecure)
CREATE FUNCTION accept_campaign_invitation(p_invitation_id UUID, p_user_id UUID) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER AS $$ SELECT true $$;
CREATE FUNCTION decline_campaign_invitation(p_invitation_id UUID) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER AS $$ SELECT true $$;
CREATE FUNCTION create_campaign_invitation(p_campaign_id UUID, p_invited_by UUID, p_invited_email TEXT, p_roles_offered JSONB) RETURNS TEXT
LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'x' $$;
CREATE FUNCTION send_campaign_invitation(p_campaign_id UUID, p_campaign_name TEXT, p_email TEXT, p_inviter_name TEXT, p_role TEXT) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER AS $$ SELECT true $$;
CREATE FUNCTION debug_campaign_permissions() RETURNS TEXT
LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'x' $$;
-- Overload of a name the migration drops, to exercise drop-by-name
CREATE FUNCTION get_user_invitations(p_user_email TEXT, p_extra INT) RETURNS INT
LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$;

-- Pre-existing data: an invite with no expiry, created before the migration
INSERT INTO auth.users (id, email) VALUES ('e0000000-0000-0000-0000-000000000005', 'olduser@example.com');
INSERT INTO campaigns (id, name, created_by) VALUES ('22222222-2222-2222-2222-222222222222', 'Legacy', 'e0000000-0000-0000-0000-000000000005');
INSERT INTO campaign_invitations (campaign_id, invited_email, invited_by) VALUES ('22222222-2222-2222-2222-222222222222', 'pending@example.com', 'e0000000-0000-0000-0000-000000000005');
