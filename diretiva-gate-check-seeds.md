# Diretiva: Atualizar Gate Check Templates

> **Prioridade:** Executar ANTES de iniciar o Sprint 2.
> **Referência:** `gate-check-templates-completo.md`

---

## O que fazer

O Sprint 0 criou `frm_gate_check_templates` com 11 itens apenas para `framing_to_roofing`. Agora temos os 4 templates completos com 48 itens no total, validados pelo dono do produto com base em experiência real de campo.

### 1. Criar migration incremental

Arquivo: `supabase/migrations/021_gate_check_templates_complete.sql`

```sql
-- Limpar seeds parciais do Sprint 0
DELETE FROM frm_gate_check_templates;

-- ═══════════════════════════════════════
-- TEMPLATE 1: framing_to_roofing (16 itens)
-- ═══════════════════════════════════════
INSERT INTO frm_gate_check_templates (transition, item_code, item_label, sort_order, is_blocking) VALUES
  ('framing_to_roofing', 'stair_opening',              'Buraco de escada: medidas, landing, altura',              1,  true),
  ('framing_to_roofing', 'window_door_openings',        'Aberturas de janelas e portas externas nas medidas',      2,  true),
  ('framing_to_roofing', 'kitchen_walls',               'Paredes de cozinha nas medidas',                          3,  true),
  ('framing_to_roofing', 'plumbing_walls',              'Paredes de encanamento livres de joists',                 4,  true),
  ('framing_to_roofing', 'bathtub_clearance',           'Joists livres no caminho das banheiras',                  5,  true),
  ('framing_to_roofing', 'poly_membrane',               'Poly entre paredes internas e externas',                  6,  true),
  ('framing_to_roofing', 'all_walls_exist',             'Todas as paredes existem conforme planta',                7,  true),
  ('framing_to_roofing', 'level_square',                'Nível e esquadro das paredes',                            8,  true),
  ('framing_to_roofing', 'stud_spacing',                'Espaçamento de studs correto',                            9,  true),
  ('framing_to_roofing', 'point_loads_hangers',         'Point loads e hangers instalados',                        10, true),
  ('framing_to_roofing', 'second_floor_walls_secure',   'Paredes do 2º andar firmes e fixas',                     11, true),
  ('framing_to_roofing', 'visual_inspection',           'Conferência visual: plywood/OSB firme, sem quebras',     12, true),
  ('framing_to_roofing', 'scaffolds_removed',           'Scaffolds temporários removidos',                         13, true),
  ('framing_to_roofing', 'door_plates',                 'Plates de porta cortados',                                14, true),
  ('framing_to_roofing', 'ramps_cleanup_safety',        'Rampas, limpeza e safety',                                15, true),
  ('framing_to_roofing', 'work_complete',               'Trabalho de framing completo',                            16, true);

-- ═══════════════════════════════════════
-- TEMPLATE 2: roofing_to_trades (5 itens)
-- ═══════════════════════════════════════
INSERT INTO frm_gate_check_templates (transition, item_code, item_label, sort_order, is_blocking) VALUES
  ('roofing_to_trades', 'ventilation_holes',            'Buracos de ventilação no roof sheathing',                 1,  true),
  ('roofing_to_trades', 'insulation_stop',              'Insulation stop instalado',                               2,  true),
  ('roofing_to_trades', 'point_loads_hangers_roof',     'Point loads e hangers do telhado',                        3,  true),
  ('roofing_to_trades', 'roof_sheathing_complete',      'Sheathing do telhado completo e fixo',                    4,  true),
  ('roofing_to_trades', 'ramps_cleanup_safety',         'Rampas, limpeza e safety',                                5,  true);

-- ═══════════════════════════════════════
-- TEMPLATE 3: trades_to_backframe (7 itens)
-- ═══════════════════════════════════════
INSERT INTO frm_gate_check_templates (transition, item_code, item_label, sort_order, is_blocking) VALUES
  ('trades_to_backframe', 'steel_posts_welded',         'Postes de ferro soldados e instalados',                   1,  true),
  ('trades_to_backframe', 'trades_work_complete',       'Trabalho das trades (HVAC/plumb/elec/windows) completo', 2,  true),
  ('trades_to_backframe', 'no_damage_to_framing',       'Trades não danificaram estrutura de framing',             3,  true),
  ('trades_to_backframe', 'plumbing_roughin_clear',     'Rough-in de encanamento não bloqueia backframe',          4,  true),
  ('trades_to_backframe', 'electrical_roughin_clear',   'Rough-in elétrico não bloqueia backframe',                5,  true),
  ('trades_to_backframe', 'hvac_roughin_clear',         'Dutos de HVAC não bloqueiam backframe',                   6,  true),
  ('trades_to_backframe', 'ramps_cleanup_safety',       'Rampas, limpeza e safety',                                7,  true);

-- ═══════════════════════════════════════
-- TEMPLATE 4: backframe_to_final (20 itens)
-- ═══════════════════════════════════════
INSERT INTO frm_gate_check_templates (transition, item_code, item_label, sort_order, is_blocking) VALUES
  ('backframe_to_final', 'fireplaces',                  'Fireplaces (lareiras) instaladas',                        1,  true),
  ('backframe_to_final', 'bulkheads',                   'Bulkheads construídos',                                   2,  true),
  ('backframe_to_final', 'wall_alignment',              'Alinhamento de todas as paredes',                         3,  true),
  ('backframe_to_final', 'attic_access',                'Acesso ao attic instalado',                               4,  true),
  ('backframe_to_final', 'cathedral_ceiling',           'Acabamentos de cathedral ceiling',                        5,  true),
  ('backframe_to_final', 'strapping',                   'Strapping completo (1x3 em todo ceiling)',                6,  true),
  ('backframe_to_final', 'niche_details',               'Nichos e detalhes conforme planta',                       7,  true),
  ('backframe_to_final', 'bathroom_backing',            'Backing para barras de segurança nos banheiros',          8,  true),
  ('backframe_to_final', 'bathtub_backing',             'Backing para instalação de banheiras (2x6 laterais)',    9,  true),
  ('backframe_to_final', 'stair_walls',                 'Paredes e acabamentos ao redor das escadas',              10, true),
  ('backframe_to_final', 'drywall_backing_complete',    'Backing de drywall completo em toda a casa',              11, true),
  ('backframe_to_final', 'garage_drop_ceiling',         'Drop ceiling de garagem',                                 12, true),
  ('backframe_to_final', 'garage_jam',                  'Garage jam (cachilho da porta de garagem)',                13, true),
  ('backframe_to_final', 'basement_walls',              'Paredes internas do basement',                            14, true),
  ('backframe_to_final', 'basement_drywall_ready',      'Basement pronto para drywall',                            15, true),
  ('backframe_to_final', 'minor_repairs',               'Pequenos reparos de fases anteriores',                    16, true),
  ('backframe_to_final', 'no_braces_scaffolds',         'Nenhuma brace, scaffold ou madeira desnecessária',        17, true),
  ('backframe_to_final', 'cleanup',                     'Limpeza final',                                           18, true),
  ('backframe_to_final', 'safety_final',                'Safety final para trade de drywall',                      19, true),
  ('backframe_to_final', 'house_complete',              'Casa 100% pronta para drywall',                           20, true);
```

### 2. Atualizar constants no @onsite/framing

Atualizar `packages/framing/src/constants/gate-checks.ts` com os 48 itens e 4 transitions.

### 3. Atualizar types se necessário

Garantir que o tipo `GateCheckTransition` inclui os 4 valores:
```typescript
type GateCheckTransition = 'framing_to_roofing' | 'roofing_to_trades' | 'trades_to_backframe' | 'backframe_to_final';
```

### 4. Verificação

- [ ] Migration aplica sem erros
- [ ] `SELECT count(*) FROM frm_gate_check_templates` = 48
- [ ] `SELECT transition, count(*) FROM frm_gate_check_templates GROUP BY transition` mostra: 16, 5, 7, 20
- [ ] Build passa

### 5. Depois disso, avance para Sprint 2

Sprint 2 está pré-aprovado. O Inspect vai carregar esses templates automaticamente.
