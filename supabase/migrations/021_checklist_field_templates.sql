-- ============================================================================
-- Migration: Seed gate check templates from field notebooks
-- Replaces PT test items for framing_to_roofing with EN production items.
-- Seeds roofing_to_trades (Trusses) and backframe_to_final (Backing).
-- ============================================================================

-- 1. Remove ALL existing templates (replace with field notebook versions)
DELETE FROM frm_gate_check_templates;

-- 2. Seed framing_to_roofing — Framing Check-List (10 items from spec)
INSERT INTO frm_gate_check_templates (transition, item_code, item_label, sort_order, is_blocking) VALUES
  ('framing_to_roofing', 'wall_sheathing',   'Wall sheathing alignment + tna blocks + nail @ bottom',                              1,  TRUE),
  ('framing_to_roofing', 'leftovers_floor',  'All leftovers filled in front of 1st/2nd floor and basement free of debris',          2,  FALSE),
  ('framing_to_roofing', 'safety_railings',  'Safety railings installed @ stair holes, windows, doors & temp stair',                3,  TRUE),
  ('framing_to_roofing', 'window_doors',     'All windows & doors openings and location as per plan',                               4,  TRUE),
  ('framing_to_roofing', 'walls_location',   'All walls installed @ the right location, even shower and mech walls',                5,  TRUE),
  ('framing_to_roofing', 'point_loads',      'All point loads installed & carried down to foundation, including the trusses ones',   6,  TRUE),
  ('framing_to_roofing', 'stair_holes',      'Stairs holes & landings framed as per plan with hanger and posts installed',           7,  TRUE),
  ('framing_to_roofing', 'steel_beams',      'Steel beams supported to the foundation with 8" space for the steel posts',           8,  TRUE),
  ('framing_to_roofing', 'i24_joists',       'I24-joists fully nailed with screws & glue',                                          9,  TRUE),
  ('framing_to_roofing', 'joist_blkn',       'Joist blkn nailed with horizontal angled nails + glue @ top/bottom',                 10,  FALSE);

-- 3. Seed roofing_to_trades — Trusses Check-List (13 items)
INSERT INTO frm_gate_check_templates (transition, item_code, item_label, sort_order, is_blocking) VALUES
  ('roofing_to_trades', 'temp_bracing',     'All temporary bracing, blocks and scaffolding removed',              1,  TRUE),
  ('roofing_to_trades', 'house_clean2',     'House and garage free of debris & all leftovers piled up',           2,  FALSE),
  ('roofing_to_trades', 'girder_truss',     'Girder truss point load installed',                                  3,  TRUE),
  ('roofing_to_trades', 'insulation_stop',  'Insulation stop installed',                                          4,  FALSE),
  ('roofing_to_trades', 'drywall_backing',  'Backing for drywall @ ceiling',                                      5,  FALSE),
  ('roofing_to_trades', 'guardrails',       'Guardrails re-installed on windows',                                 6,  TRUE),
  ('roofing_to_trades', 'stair_hole',       'Stair hole platform removed & guardrails installed',                 7,  TRUE),
  ('roofing_to_trades', 'osb_sheathing',    'OSB sheathing and debris picked from around the unit',               8,  FALSE),
  ('roofing_to_trades', 'fascias',          'Fascias lined & straight',                                           9,  FALSE),
  ('roofing_to_trades', 'hangers',          'Hangers installed, even lower',                                      10,  TRUE),
  ('roofing_to_trades', 'truss_bracing',    'All the truss bracing installed',                                    11,  TRUE),
  ('roofing_to_trades', 'gypsum_garage',    'Gypsum board installed @ garage',                                    12,  FALSE),
  ('roofing_to_trades', 'vents',            'Vents cut off',                                                      13,  FALSE);

-- 4. Seed backframe_to_final — Backing Check-List (14 items)
INSERT INTO frm_gate_check_templates (transition, item_code, item_label, sort_order, is_blocking) VALUES
  ('backframe_to_final', 'porch_ceiling',     'Porch dropped ceiling or strapped',                        1,  FALSE),
  ('backframe_to_final', 'mech_walls',        'All mech walls framed',                                    2,  TRUE),
  ('backframe_to_final', 'i_joists_cut',      'I-joists supported where top plates were cut',             3,  TRUE),
  ('backframe_to_final', 'strapping',         'Strapping leveled',                                        4,  FALSE),
  ('backframe_to_final', 'bsmt_backing',      'Basement backing walls: EPW, laundry',                     5,  FALSE),
  ('backframe_to_final', 'bsmt_plates',       'Bsmt plates installed @ top/bottom',                       6,  TRUE),
  ('backframe_to_final', 'bathroom_backing',  'Main bathroom railing backing',                            7,  FALSE),
  ('backframe_to_final', 'fireplace',         'Fireplace framed',                                         8,  TRUE),
  ('backframe_to_final', 'tv_backing',        'TV backing, closet, shelves & bath blkn',                  9,  FALSE),
  ('backframe_to_final', 'garage_ceiling',    'Garage dropped ceiling',                                  10,  FALSE),
  ('backframe_to_final', 'garage_jambs',      'Garage jambs installed',                                  11,  FALSE),
  ('backframe_to_final', 'porch_posts',       'Porch PT posts installed',                                12,  FALSE),
  ('backframe_to_final', 'house_clean',       'House & garage free of debris or leftovers',              13,  FALSE),
  ('backframe_to_final', 'attic_hatch',       'Attic hatch installed',                                   14,  FALSE);
