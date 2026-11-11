-- =====================================================================
-- 08: Shared campaign state
--
-- Adds:
--   campaign_state           one JSON document per campaign: ship, party
--                            funds and ledger, ship's locker, cargo,
--                            contracts, trades, travel, worlds, missions,
--                            journal. Every member of the campaign can read
--                            and edit it (it replaces the spreadsheet a
--                            group would share).
--   campaign_referee_notes   the referee's private notes: NPCs, secrets,
--                            plot. Referees only.
--
-- Each campaign gets its state automatically, including existing ones.
-- The document's shape is defined by
-- crates/traveller-model/src/campaign_state.rs.
--
-- Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.campaign_state (
  campaign_id UUID PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{"version": 1}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_state_data_is_object CHECK (jsonb_typeof(data) = 'object'),
  -- Generous for a long campaign's journal; stops runaway writes.
  CONSTRAINT campaign_state_data_size CHECK (pg_column_size(data) < 1048576)
);

CREATE TABLE IF NOT EXISTS public.campaign_referee_notes (
  campaign_id UUID PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_referee_notes_size CHECK (length(notes) <= 50000)
);

DROP TRIGGER IF EXISTS campaign_state_touch ON public.campaign_state;
CREATE TRIGGER campaign_state_touch BEFORE UPDATE ON public.campaign_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS campaign_referee_notes_touch ON public.campaign_referee_notes;
CREATE TRIGGER campaign_referee_notes_touch BEFORE UPDATE ON public.campaign_referee_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Every campaign gets an empty state.
CREATE OR REPLACE FUNCTION public.create_campaign_state()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.campaign_state (campaign_id) VALUES (NEW.id)
  ON CONFLICT (campaign_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_campaign_state() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS campaigns_create_state ON public.campaigns;
CREATE TRIGGER campaigns_create_state AFTER INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.create_campaign_state();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

ALTER TABLE public.campaign_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_referee_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read campaign state" ON public.campaign_state;
CREATE POLICY "Members read campaign state"
  ON public.campaign_state FOR SELECT TO authenticated
  USING (public.is_campaign_member(campaign_id));

DROP POLICY IF EXISTS "Members update campaign state" ON public.campaign_state;
CREATE POLICY "Members update campaign state"
  ON public.campaign_state FOR UPDATE TO authenticated
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));
-- No INSERT or DELETE for clients: the trigger creates it and it goes with
-- the campaign.

DROP POLICY IF EXISTS "Referees manage campaign notes" ON public.campaign_referee_notes;
CREATE POLICY "Referees manage campaign notes"
  ON public.campaign_referee_notes FOR ALL TO authenticated
  USING (public.is_campaign_referee(campaign_id))
  WITH CHECK (public.is_campaign_referee(campaign_id));

REVOKE ALL ON public.campaign_state FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.campaign_referee_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.campaign_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_referee_notes TO authenticated;

-- Existing campaigns get their state now.
INSERT INTO public.campaign_state (campaign_id)
SELECT id FROM public.campaigns
ON CONFLICT (campaign_id) DO NOTHING;

COMMIT;
