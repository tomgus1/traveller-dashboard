-- Old-app finance rows that exist before migration 09 (as superuser).
-- Amounts are positive; the category gives the effect, as the old app did.
INSERT INTO public.campaign_finances (id, campaign_id, transaction_date, description, category, subcategory, amount, paid_by)
VALUES
  ('f1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2025-10-01', 'Mustering-out pay', 'Income', 'Mustering out', 1000, 'Kiri'),
  ('f1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '2025-10-03', 'Berthing', 'Expense', NULL, 250.50, NULL),
  ('f1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '2025-10-04', 'Moved to ship fund', 'Transfer', NULL, 300, NULL);

INSERT INTO public.ship_finances (id, campaign_id, transaction_date, description, category, amount, notes)
VALUES
  ('f2000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2025-10-01', 'Ship fund opened', 'Income', 50000, NULL),
  ('f2000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '2025-10-05', 'Maintenance', 'Expense', 3861, 'Annual service'),
  ('f2000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '2025-10-06', 'Refined fuel', 'Expense', 20000, NULL);
