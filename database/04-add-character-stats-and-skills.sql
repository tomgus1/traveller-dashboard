-- Migration: 04-add_character_stats_and_skills.sql

-- Add characteristics and skills columns as JSONB
-- defaulting to all 0s for characteristics as requested
ALTER TABLE characters 
ADD COLUMN characteristics JSONB DEFAULT '{"STR": {"value": 0, "xp": 0}, "DEX": {"value": 0, "xp": 0}, "END": {"value": 0, "xp": 0}, "INT": {"value": 0, "xp": 0}, "EDU": {"value": 0, "xp": 0}, "SOC": {"value": 0, "xp": 0}}'::jsonb,
ADD COLUMN skills JSONB DEFAULT '[]'::jsonb;

-- Optional: Add constraint to ensure characteristics structure contains all required keys
ALTER TABLE characters
ADD CONSTRAINT check_characteristics_structure 
CHECK (
  characteristics ? 'STR' AND 
  characteristics ? 'DEX' AND 
  characteristics ? 'END' AND 
  characteristics ? 'INT' AND 
  characteristics ? 'EDU' AND 
  characteristics ? 'SOC'
);

-- Documentation: Expected 'skills' JSONB Structure
-- [
--   {
--     "name": "Pilot (Small Craft)",
--     "level": 1,
--     "xp": 0  -- Added for training progression (Cost = Next Level)
--   }
-- ]
