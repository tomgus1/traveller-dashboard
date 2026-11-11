-- Data that exists before migration 06 (inserted as superuser, bypassing RLS).
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'alice@example.com'),   -- referee (GM)
  ('b0000000-0000-0000-0000-000000000002', 'bob@example.com'),     -- player
  ('e0000000-0000-0000-0000-000000000005', 'pat@example.com'),     -- player
  ('d0000000-0000-0000-0000-000000000004', 'mallory@example.com')  -- outsider
ON CONFLICT DO NOTHING;

INSERT INTO public.campaigns (id, name, created_by)
VALUES ('11111111-1111-1111-1111-111111111111', 'Far Horizon Crew', 'a0000000-0000-0000-0000-000000000001');

INSERT INTO public.campaign_members (campaign_id, user_id, role, is_admin, is_gm, is_player) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'admin', true, true, false),
  ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000002', 'player', false, false, true),
  ('11111111-1111-1111-1111-111111111111', 'e0000000-0000-0000-0000-000000000005', 'player', false, false, true);

INSERT INTO public.characters (id, campaign_id, name, character_name, owner_id, characteristics, skills) VALUES
  ('cb000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Kiri', 'Kiri Tamsen',
   'b0000000-0000-0000-0000-000000000002',
   '{"STR":{"value":7,"xp":0},"DEX":{"value":10,"xp":0},"END":{"value":8,"xp":0},"INT":{"value":9,"xp":0},"EDU":{"value":7,"xp":0},"SOC":{"value":7,"xp":0}}',
   '[{"name":"Pilot (spacecraft)","level":2},{"name":"Vacc Suit","level":0,"xp":3},{"name":"","level":1}]'),
  ('cf000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Oren', 'Oren Vask',
   'e0000000-0000-0000-0000-000000000005', '{"STR":{"value":9},"DEX":{"value":8},"END":{"value":7},"INT":{"value":7},"EDU":{"value":10},"SOC":{"value":6}}', 'null'),
  ('cc000000-0000-0000-0000-000000000003', NULL, 'Bram', NULL,
   'b0000000-0000-0000-0000-000000000002', NULL, NULL);

INSERT INTO public.character_weapons (character_id, name, damage, range, weight, cost, notes)
VALUES ('cb000000-0000-0000-0000-000000000001', 'Autopistol', '3D-3', '10', 0.75, 200, '');
INSERT INTO public.character_ammo (character_id, type, quantity, max_quantity, weapon_compatibility)
VALUES ('cb000000-0000-0000-0000-000000000001', 'Autopistol magazine', 15, 15, 'Autopistol'),
       ('cb000000-0000-0000-0000-000000000001', 'Odd rounds', -2, 0, NULL);
INSERT INTO public.character_armour (character_id, name, protection, weight, cost)
VALUES ('cb000000-0000-0000-0000-000000000001', 'Mesh', 2, 2, 150);
INSERT INTO public.character_inventory (character_id, item_name, quantity, weight, value, description)
VALUES ('cb000000-0000-0000-0000-000000000001', 'Commdot', 1, NULL, 10.4, 'Hidden in collar');
INSERT INTO public.character_finance (character_id, description, amount, transaction_date)
VALUES ('cb000000-0000-0000-0000-000000000001', 'Mustering out', 1000, '2025-10-01'),
       ('cb000000-0000-0000-0000-000000000001', 'Berthing', -250.5, '2025-10-03');
