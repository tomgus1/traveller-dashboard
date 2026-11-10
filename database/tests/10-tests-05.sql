-- Runs each query as a given user (NULL = anon) and checks the outcome.
-- expect: 'error' | 'rows=N'  (DML must use RETURNING so rows can be counted)
CREATE SCHEMA t;
CREATE TABLE t.results (n SERIAL, label TEXT, pass BOOLEAN, detail TEXT);

CREATE FUNCTION t.check(label TEXT, uid UUID, q TEXT, expect TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE cnt BIGINT; outcome TEXT;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', COALESCE(uid::TEXT, ''), true);
    IF uid IS NULL THEN SET LOCAL ROLE anon; ELSE SET LOCAL ROLE authenticated; END IF;
    EXECUTE 'WITH x AS (' || q || ') SELECT count(*) FROM x' INTO cnt;
    RESET ROLE;
    outcome := 'rows=' || cnt;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    outcome := 'error';
    INSERT INTO t.results (label, pass, detail) VALUES (label, expect = 'error', 'error: ' || SQLERRM);
    RETURN;
  END;
  INSERT INTO t.results (label, pass, detail) VALUES (label, outcome = expect, outcome);
END;
$$;

-- Users (trigger creates profiles)
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'alice@example.com'),   -- campaign creator
  ('b0000000-0000-0000-0000-000000000002', 'bob@example.com'),     -- player
  ('c0000000-0000-0000-0000-000000000003', 'Carol@Example.com'),   -- invitee
  ('d0000000-0000-0000-0000-000000000004', 'mallory@example.com'); -- attacker

\set A '''a0000000-0000-0000-0000-000000000001'''
\set B '''b0000000-0000-0000-0000-000000000002'''
\set C '''c0000000-0000-0000-0000-000000000003'''
\set M '''d0000000-0000-0000-0000-000000000004'''
\set CAMP '''11111111-1111-1111-1111-111111111111'''

-- ---------- legitimate flows (client code paths) ----------
SELECT t.check('alice creates campaign', :A,
  $q$INSERT INTO campaigns (id, name, created_by) VALUES ('11111111-1111-1111-1111-111111111111','Spinward', 'a0000000-0000-0000-0000-000000000001') RETURNING 1$q$, 'rows=1');
SELECT t.check('alice adds self as admin (role only)', :A,
  $q$INSERT INTO campaign_members (campaign_id, user_id, role) VALUES ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','admin') RETURNING 1$q$, 'rows=1');
SELECT t.check('alice adds bob as player', :A,
  $q$INSERT INTO campaign_members (campaign_id, user_id, role) VALUES ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','player') RETURNING 1$q$, 'rows=1');
SELECT t.check('bob sees alice profile (co-member)', :B,
  $q$SELECT 1 FROM user_profiles WHERE id = 'a0000000-0000-0000-0000-000000000001'$q$, 'rows=1');
SELECT t.check('bob sees campaign roster', :B,
  $q$SELECT 1 FROM campaign_members WHERE campaign_id = '11111111-1111-1111-1111-111111111111'$q$, 'rows=2');
SELECT t.check('bob updates own display name', :B,
  $q$UPDATE user_profiles SET display_name = 'Bob', updated_at = now() WHERE id = 'b0000000-0000-0000-0000-000000000002' RETURNING 1$q$, 'rows=1');
SELECT t.check('bob creates character in campaign', :B,
  $q$INSERT INTO characters (campaign_id, name, owner_id) VALUES ('11111111-1111-1111-1111-111111111111','Jamison','b0000000-0000-0000-0000-000000000002') RETURNING 1$q$, 'rows=1');
SELECT t.check('bob creates standalone character via RPC', :B,
  $q$SELECT create_standalone_character('b0000000-0000-0000-0000-000000000002','Solo')$q$, 'rows=1');
SELECT t.check('bob adds party finance (03 tables)', :B,
  $q$INSERT INTO campaign_finances (campaign_id, description, category, amount) VALUES ('11111111-1111-1111-1111-111111111111','Fuel','Expense',-500) RETURNING 1$q$, 'rows=1');
SELECT t.check('alice promotes bob to gm via booleans', :A,
  $q$UPDATE campaign_members SET is_admin=false, is_gm=true, is_player=false WHERE user_id='b0000000-0000-0000-0000-000000000002' RETURNING 1$q$, 'rows=1');
SELECT t.check('trigger derived role=gm for bob', :A,
  $q$SELECT 1 FROM campaign_members WHERE user_id='b0000000-0000-0000-0000-000000000002' AND role='gm' AND is_gm AND NOT is_player$q$, 'rows=1');
SELECT t.check('alice invites carol as admin (direct insert)', :A,
  $q$INSERT INTO campaign_invitations (campaign_id, invited_email, invited_by, roles_offered) VALUES ('11111111-1111-1111-1111-111111111111','carol@example.com','a0000000-0000-0000-0000-000000000001','{"isAdmin":true,"isGm":false,"isPlayer":false}') RETURNING 1$q$, 'rows=1');
SELECT t.check('carol lists own invitations (case-insensitive email)', :C,
  $q$SELECT * FROM get_user_invitations('carol@example.com')$q$, 'rows=1');
SELECT t.check('carol sees invitation via table policy', :C,
  $q$SELECT 1 FROM campaign_invitations$q$, 'rows=1');

-- ---------- attacks ----------
SELECT t.check('ATTACK mallory inserts self as admin', :M,
  $q$INSERT INTO campaign_members (campaign_id, user_id, is_admin) VALUES ('11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000004',true) RETURNING 1$q$, 'error');
SELECT t.check('ATTACK bob self-promotes to admin', :B,
  $q$UPDATE campaign_members SET is_admin = true WHERE user_id='b0000000-0000-0000-0000-000000000002' RETURNING 1$q$, 'rows=0');
SELECT t.check('ATTACK bob self-promotes via role column', :B,
  $q$UPDATE campaign_members SET role = 'admin' WHERE user_id='b0000000-0000-0000-0000-000000000002' RETURNING 1$q$, 'rows=0');
SELECT t.check('ATTACK bob removes alice (creator)', :B,
  $q$DELETE FROM campaign_members WHERE user_id='a0000000-0000-0000-0000-000000000001' RETURNING 1$q$, 'rows=0');
SELECT t.check('ATTACK mallory lists all profiles', :M,
  $q$SELECT 1 FROM user_profiles$q$, 'rows=1');
SELECT t.check('ATTACK anon lists profiles', NULL,
  $q$SELECT 1 FROM user_profiles$q$, 'rows=0');
SELECT t.check('ATTACK mallory lists campaign_members', :M,
  $q$SELECT 1 FROM campaign_members$q$, 'rows=0');
SELECT t.check('ATTACK mallory reads campaign', :M,
  $q$SELECT 1 FROM campaigns$q$, 'rows=0');
SELECT t.check('ATTACK mallory reads characters', :M,
  $q$SELECT 1 FROM characters$q$, 'rows=0');
SELECT t.check('ATTACK mallory changes own profile email', :M,
  $q$UPDATE user_profiles SET email = 'alice@example.com' WHERE id='d0000000-0000-0000-0000-000000000004' RETURNING 1$q$, 'error');
SELECT t.check('ATTACK mallory inserts profile', :M,
  $q$INSERT INTO user_profiles (id, email) VALUES ('d0000000-0000-0000-0000-000000000004','x@example.com') RETURNING 1$q$, 'error');
SELECT t.check('ATTACK mallory creates character for alice', :M,
  $q$SELECT create_standalone_character('a0000000-0000-0000-0000-000000000001','Puppet')$q$, 'error');
SELECT t.check('ATTACK mallory character into alice campaign', :M,
  $q$INSERT INTO characters (campaign_id, name, owner_id) VALUES ('11111111-1111-1111-1111-111111111111','Spy','d0000000-0000-0000-0000-000000000004') RETURNING 1$q$, 'error');
SELECT t.check('mallory creates own standalone character', :M,
  $q$INSERT INTO characters (campaign_id, name, owner_id) VALUES (NULL,'Mine','d0000000-0000-0000-0000-000000000004') RETURNING 1$q$, 'rows=1');
SELECT t.check('ATTACK mallory moves character into alice campaign', :M,
  $q$UPDATE characters SET campaign_id='11111111-1111-1111-1111-111111111111' WHERE owner_id='d0000000-0000-0000-0000-000000000004' RETURNING 1$q$, 'error');
SELECT t.check('ATTACK mallory reads carol invitations via param', :M,
  $q$SELECT * FROM get_user_invitations('carol@example.com')$q$, 'rows=0');
SELECT t.check('ATTACK mallory creates invitation for herself', :M,
  $q$INSERT INTO campaign_invitations (campaign_id, invited_email, invited_by) VALUES ('11111111-1111-1111-1111-111111111111','mallory@example.com','d0000000-0000-0000-0000-000000000004') RETURNING 1$q$, 'error');
SELECT t.check('ATTACK mallory accepts carol invitation', :M,
  $q$SELECT accept_campaign_invitation((SELECT id FROM public.campaign_invitations WHERE invited_email = 'carol@example.com'), 'd0000000-0000-0000-0000-000000000004')$q$, 'error');
SELECT t.check('ATTACK mallory accepts on carol behalf (p_user_id)', :M,
  $q$SELECT accept_campaign_invitation(gen_random_uuid(), 'c0000000-0000-0000-0000-000000000003')$q$, 'error');
SELECT t.check('ATTACK mallory adds party finance', :M,
  $q$INSERT INTO campaign_finances (campaign_id, description, category, amount) VALUES ('11111111-1111-1111-1111-111111111111','Steal','Income',99999) RETURNING 1$q$, 'error');
SELECT t.check('ATTACK anon calls get_user_invitations', NULL,
  $q$SELECT * FROM get_user_invitations('carol@example.com')$q$, 'error');
SELECT t.check('ATTACK anon calls helper', NULL,
  $q$SELECT * FROM is_campaign_admin('11111111-1111-1111-1111-111111111111')$q$, 'error');
SELECT t.check('dropped: get_campaign_data', :M,
  $q$SELECT get_campaign_data('11111111-1111-1111-1111-111111111111')$q$, 'error');
SELECT t.check('dropped: create_user_profile', :M,
  $q$SELECT create_user_profile('a0000000-0000-0000-0000-000000000001','evil@example.com')$q$, 'error');

-- ---------- invitation acceptance & membership management ----------
-- carol's invitation id must be read as superuser (t.check runs the RPC as carol)
SELECT t.check('carol accepts invitation', :C,
  format($q$SELECT accept_campaign_invitation(%L, 'c0000000-0000-0000-0000-000000000003')$q$,
         (SELECT id FROM public.campaign_invitations WHERE invited_email = 'carol@example.com')), 'rows=1');
SELECT t.check('carol is now admin member', :C,
  $q$SELECT 1 FROM campaign_members WHERE user_id='c0000000-0000-0000-0000-000000000003' AND is_admin AND role='admin'$q$, 'rows=1');
SELECT t.check('carol cannot re-accept', :C,
  format($q$SELECT accept_campaign_invitation(%L)$q$, (SELECT id FROM public.campaign_invitations WHERE invited_email = 'carol@example.com')), 'error');
SELECT t.check('carol (admin) cannot demote creator alice', :C,
  $q$UPDATE campaign_members SET is_admin=false, is_player=true WHERE user_id='a0000000-0000-0000-0000-000000000001' RETURNING 1$q$, 'rows=0');
SELECT t.check('alice demotes admin carol to player', :A,
  $q$UPDATE campaign_members SET is_admin=false, is_gm=false, is_player=true WHERE user_id='c0000000-0000-0000-0000-000000000003' RETURNING role$q$, 'rows=1');
SELECT t.check('carol demotion stuck (role=player)', :A,
  $q$SELECT 1 FROM campaign_members WHERE user_id='c0000000-0000-0000-0000-000000000003' AND role='player' AND NOT is_admin$q$, 'rows=1');
SELECT t.check('alice (creator) deletes bob character', :A,
  $q$DELETE FROM characters WHERE name='Jamison' RETURNING 1$q$, 'rows=1');
SELECT t.check('bob leaves campaign', :B,
  $q$DELETE FROM campaign_members WHERE user_id='b0000000-0000-0000-0000-000000000002' RETURNING 1$q$, 'rows=1');
SELECT t.check('bob no longer sees alice profile', :B,
  $q$SELECT 1 FROM user_profiles WHERE id='a0000000-0000-0000-0000-000000000001'$q$, 'rows=0');

SELECT n, CASE WHEN pass THEN 'PASS' ELSE 'FAIL' END AS result, label, detail FROM t.results ORDER BY n;
SELECT count(*) FILTER (WHERE pass) AS passed, count(*) FILTER (WHERE NOT pass) AS failed FROM t.results;
