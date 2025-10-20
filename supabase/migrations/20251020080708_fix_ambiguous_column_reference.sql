-- Fix ambiguous column reference in create_standalone_character function
-- This addresses the "column reference 'player_name' is ambiguous" error

CREATE OR REPLACE FUNCTION public.create_standalone_character(
  user_id UUID,
  char_name TEXT,
  player_name TEXT DEFAULT NULL,
  character_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_character_id UUID;
  result JSON;
BEGIN
  INSERT INTO characters (campaign_id, name, player_name, character_name, owner_id)
  VALUES (NULL, char_name, player_name, character_name, user_id)
  RETURNING id INTO new_character_id;
  
  -- Use table alias to avoid ambiguous column references
  SELECT json_build_object(
    'id', c.id,
    'campaign_id', c.campaign_id,
    'name', c.name,
    'player_name', c.player_name,
    'character_name', c.character_name,
    'owner_id', c.owner_id,
    'created_at', c.created_at,
    'updated_at', c.updated_at
  )
  INTO result
  FROM characters c
  WHERE c.id = new_character_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;