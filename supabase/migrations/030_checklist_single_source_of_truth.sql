-- ============================================================================
-- Migration 030 — Checklist: single source of truth
--
-- Background:
--   Before this migration, the checklist app had TWO divergent item lists:
--     1. `apps/checklist/lib/templates.ts` (hardcoded) — used by /self
--     2. `frm_gate_check_templates` seeded by migration 021 — used by /app
--   They drifted. /self had 13+14+14 items with house_clean + 6 photos at the
--   end of every transition. /app had 10+13+14 with the cleanup rule missing.
--
-- From now on there is ONE LIST. The canonical source is
-- `apps/checklist/lib/templates.ts`. This migration mirrors that file into
-- the database, byte-for-byte, and adds the schema columns needed to encode
-- the photo requirements natively (min_photos + photo_guidance + photo_urls).
--
-- If you change the template, change BOTH `lib/templates.ts` AND this file
-- (or replace this file with a newer migration). They must stay identical.
-- ============================================================================

-- 1. Schema changes — add photo-requirement columns to template + items
ALTER TABLE frm_gate_check_templates
  ADD COLUMN IF NOT EXISTS max_photos     INT  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_photos     INT,
  ADD COLUMN IF NOT EXISTS photo_guidance TEXT;

ALTER TABLE frm_gate_check_items
  ADD COLUMN IF NOT EXISTS max_photos     INT  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_photos     INT,
  ADD COLUMN IF NOT EXISTS photo_guidance TEXT,
  ADD COLUMN IF NOT EXISTS photo_urls     TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: migrate existing single photo_url into the new array column
UPDATE frm_gate_check_items
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL
  AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL);

-- 2. Wipe the template table (it had the wrong/incomplete list)
DELETE FROM frm_gate_check_templates;

-- 3. Re-seed from lib/templates.ts — Framing Check-List (13 items)
INSERT INTO frm_gate_check_templates
  (transition, item_code, item_label, sort_order, is_blocking, max_photos, min_photos, photo_guidance) VALUES
  ('framing_to_roofing', 'wall_sheathing',    'Exterior OSB sheathing nailed and aligned on the rimboard',                                             1,  TRUE,  5, NULL, NULL),
  ('framing_to_roofing', 'safety_railings',   'Safety railings installed at the stair holes, windows, doors and temporary stairs',                     2,  TRUE,  5, NULL, NULL),
  ('framing_to_roofing', 'window_doors',      'Door/Window rough openings and locations as per plan',                                                  3,  TRUE,  5, NULL, NULL),
  ('framing_to_roofing', 'point_loads',       'Headers/lintels as per plan, all the point loads transferred to the foundation, including the truss ones', 4,  TRUE,  5, NULL, NULL),
  ('framing_to_roofing', 'stair_holes',       'Stair openings and landings are framed as per the stair layout',                                        5,  TRUE,  5, NULL, NULL),
  ('framing_to_roofing', 'bsmt_debris',       'Basement free of debris and lumber posts levelled and anchored to the footing with brackets',           6,  FALSE, 5, NULL, NULL),
  ('framing_to_roofing', 'no_joist_mech',     'No joist installed below mechanical walls, toilets, or shower panels',                                  7,  TRUE,  5, NULL, NULL),
  ('framing_to_roofing', 'hangers_nailed',    'Hangers fully nailed with construction screws and glue',                                                8,  TRUE,  5, NULL, NULL),
  ('framing_to_roofing', 'joist_blkn',        'Floor joist blocking nailed with horizontal angled nails + glue @ top/bottom',                          9,  FALSE, 5, NULL, NULL),
  ('framing_to_roofing', 'mech_walls_ground', 'Mechanical walls nailed to the ground next to the studs, even the shower walls',                       10,  TRUE,  5, NULL, NULL),
  ('framing_to_roofing', 'steel_beams',       'Steel beams supported on the foundation with 8" space for the steel posts',                            11,  TRUE,  5, NULL, NULL),
  ('framing_to_roofing', 'porch_beam',        'Porch beam and/or flat roofing installed, levelled and braced',                                        12,  FALSE, 5, NULL, NULL),
  ('framing_to_roofing', 'house_clean',       'Unit is free of debris or leftovers (attach pics)',                                                    13,  FALSE, 6, 6,    '6 photos required: front yard, backyard, garage, basement, main floor, upper floor');

-- 4. Re-seed — Trusses Check-List (14 items)
INSERT INTO frm_gate_check_templates
  (transition, item_code, item_label, sort_order, is_blocking, max_photos, min_photos, photo_guidance) VALUES
  ('roofing_to_trades', 'temp_bracing',    'All temporary bracing, blocks and scaffolding removed',  1,  TRUE,  5, NULL, NULL),
  ('roofing_to_trades', 'house_clean2',    'House and garage free of debris & all leftovers piled up', 2, FALSE, 5, NULL, NULL),
  ('roofing_to_trades', 'girder_truss',    'Girder truss point load installed',                       3,  TRUE,  5, NULL, NULL),
  ('roofing_to_trades', 'insulation_stop', 'Insulation stop installed',                               4,  FALSE, 5, NULL, NULL),
  ('roofing_to_trades', 'drywall_backing', 'Backing for drywall @ ceiling',                           5,  FALSE, 5, NULL, NULL),
  ('roofing_to_trades', 'guardrails',      'Guardrails re-installed on windows',                      6,  TRUE,  5, NULL, NULL),
  ('roofing_to_trades', 'stair_hole',      'Stair hole platform removed & guardrails installed',      7,  TRUE,  5, NULL, NULL),
  ('roofing_to_trades', 'osb_sheathing',   'OSB sheathing and debris picked from around the unit',    8,  FALSE, 5, NULL, NULL),
  ('roofing_to_trades', 'fascias',         'Fascias lined & straight',                                9,  FALSE, 5, NULL, NULL),
  ('roofing_to_trades', 'hangers',         'Hangers installed, even lower',                          10,  TRUE,  5, NULL, NULL),
  ('roofing_to_trades', 'truss_bracing',   'All the truss bracing installed',                        11,  TRUE,  5, NULL, NULL),
  ('roofing_to_trades', 'gypsum_garage',   'Gypsum board installed @ garage',                        12,  FALSE, 5, NULL, NULL),
  ('roofing_to_trades', 'vents',           'Vents cut off',                                          13,  FALSE, 5, NULL, NULL),
  ('roofing_to_trades', 'house_clean',     'Unit is free of debris or leftovers',                    14,  FALSE, 6, 6,    '6 photos required: front yard, backyard, garage, basement, main floor, upper floor');

-- 5. Re-seed — Backing Check-List (14 items)
INSERT INTO frm_gate_check_templates
  (transition, item_code, item_label, sort_order, is_blocking, max_photos, min_photos, photo_guidance) VALUES
  ('backframe_to_final', 'attic_hatch',       'Attic hatch is installed',                                     1, FALSE, 5, NULL, NULL),
  ('backframe_to_final', 'strapping',         'Strapping is levelled on the ceiling sides',                   2, FALSE, 5, NULL, NULL),
  ('backframe_to_final', 'bathroom_backing',  'Main bathroom grab bar reinforcement added',                   3, FALSE, 5, NULL, NULL),
  ('backframe_to_final', 'stairways',         'Stairways framed with consistent review on both sides',        4, TRUE,  5, NULL, NULL),
  ('backframe_to_final', 'mech_walls',        'All the mech walls are framed and nailed to the ground',       5, TRUE,  5, NULL, NULL),
  ('backframe_to_final', 'fireplace',         'Fireplaces fully framed, levelled and straightened',           6, TRUE,  5, NULL, NULL),
  ('backframe_to_final', 'i_joists_cut',      'I-joists supported where the top plates were cut-off',         7, TRUE,  5, NULL, NULL),
  ('backframe_to_final', 'bsmt_plates',       'Basement plates installed on top/bottom for insulation',       8, TRUE,  5, NULL, NULL),
  ('backframe_to_final', 'bsmt_backing',      'Basement EP, LT, WM, HWT backing walls',                       9, FALSE, 5, NULL, NULL),
  ('backframe_to_final', 'garage_ceiling',    'Garage dropped ceiling fully framed',                         10, FALSE, 5, NULL, NULL),
  ('backframe_to_final', 'garage_jambs',      'Garage jambs installed and levelled',                         11, FALSE, 5, NULL, NULL),
  ('backframe_to_final', 'porch_ceiling',     'Porch dropped ceiling or strapped',                           12, FALSE, 5, NULL, NULL),
  ('backframe_to_final', 'porch_posts',       'Porch PT posts installed',                                    13, FALSE, 5, NULL, NULL),
  ('backframe_to_final', 'house_clean',       'Unit is free of debris or leftovers',                         14, FALSE, 6, 6,    '6 photos required: front yard, backyard, garage, basement, main floor, upper floor');
