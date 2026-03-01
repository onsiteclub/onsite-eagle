# Gate Check Templates — Definição Completa
## Todos os 4 transitions com itens validados

> **Fonte:** Conhecimento de campo de Cris (supervisor/carpinteiro com experiência em Ottawa).
> **Uso:** Seeds para `frm_gate_check_templates`. Substitui o seed parcial do Sprint 0.

---

## Template 1: `framing_to_roofing`

Checagem antes da crew de roofing começar o telhado. Garante que a estrutura está completa, segura e pronta para receber peso em cima.

| # | item_code | item_label | is_blocking | Detalhe |
|---|-----------|-----------|-------------|---------|
| 1 | stair_opening | Buraco de escada: medidas, landing, altura | true | ~50% das escadas dão problema. Empresa terceira instala depois. Todas as medidas devem conferir com a planta. |
| 2 | window_door_openings | Aberturas de janelas e portas externas | true | Todas as aberturas nas medidas da planta. Empresa de janelas/portas vai encaixar depois. |
| 3 | kitchen_walls | Paredes de cozinha nas medidas | true | Seguindo layout de encanamento. Afeta instalação de armários e bancada. |
| 4 | plumbing_walls | Paredes de encanamento livres de joists | true | Paredes onde passa tubulação (lavanderia, banheiro). Sem joists embaixo que bloqueiem a furação. |
| 5 | bathtub_clearance | Joists livres no caminho das banheiras | true | 2-3 banheiros por casa. Banheira não pode ter joist bloqueando encanamento. |
| 6 | poly_membrane | Poly entre paredes internas e externas | true | Camada de plástico isolante onde parede interna encosta na externa. |
| 7 | all_walls_exist | Todas as paredes existem conforme planta | true | Conferência visual pela planta — não é medida/esquadro, é se a parede existe. |
| 8 | level_square | Nível e esquadro das paredes | true | Paredes niveladas e em esquadro. |
| 9 | stud_spacing | Espaçamento de studs correto | true | 16" ou 24" OC conforme planta. |
| 10 | point_loads_hangers | Point loads e hangers instalados | true | Todos os point loads e hangers da estrutura. Integridade estrutural — não pode faltar. |
| 11 | second_floor_walls_secure | Paredes do 2º andar firmes e fixas | true | Roofing crew vai subir em cima. Questão de segurança. |
| 12 | visual_inspection | Conferência visual: plywood/OSB firme | true | Sem plywood quebrado, faltando ou solto. Casa deve parecer terminada. |
| 13 | scaffolds_removed | Scaffolds temporários removidos | true | Todo scaffold de construção retirado antes do roofing. |
| 14 | door_plates | Plates de porta cortados | true | Plates de porta cortados e prontos. |
| 15 | ramps_cleanup_safety | Rampas, limpeza e safety | true | Guardrails nos buracos, barra de madeira nas janelas, buracos cobertos, área limpa. |
| 16 | work_complete | Trabalho de framing completo | true | Conferência geral de que todas as fases 1-4 estão terminadas. |

---

## Template 2: `roofing_to_trades`

Checagem antes de HVAC, plumbing, elétrica e janelas entrarem. Garante que o telhado está completo e não vai atrapalhar as próximas trades.

| # | item_code | item_label | is_blocking | Detalhe |
|---|-----------|-----------|-------------|---------|
| 1 | ventilation_holes | Buracos de ventilação no roof sheathing | true | Buracos para exaustores conforme planta. Se não fizer antes do shingles, retrabalho enorme. Empresa de shingles cobre sem buracos se não estiverem feitos. |
| 2 | insulation_stop | Insulation stop instalado | true | Faixa de plywood/OSB (7-9") no alinhamento da parede externa, sob o overhang. Segura a insulation. Depende do design do telhado/trusses. |
| 3 | point_loads_hangers_roof | Point loads e hangers do telhado | true | Todos os point loads e hangers das trusses instalados. Estrutural. |
| 4 | roof_sheathing_complete | Sheathing do telhado completo | true | Todo o compensado/OSB do telhado instalado e fixo. |
| 5 | ramps_cleanup_safety | Rampas, limpeza e safety | true | Área limpa, rampas de acesso, guardrails mantidos. |

---

## Template 3: `trades_to_backframe`

Checagem antes da crew de backframe voltar. As outras trades (HVAC, plumbing, elétrica, janelas) terminaram. Garante que elas não deixaram problemas que impeçam o backframe.

| # | item_code | item_label | is_blocking | Detalhe |
|---|-----------|-----------|-------------|---------|
| 1 | steel_posts_welded | Postes de ferro soldados e instalados | true | Obrigatório antes do backframe. Drop ceiling de garagem e garage jam dependem dos postes prontos. |
| 2 | trades_work_complete | Trabalho das trades completo | true | HVAC, plumbing, elétrica e janelas confirmaram conclusão. |
| 3 | no_damage_to_framing | Trades não danificaram estrutura | true | Conferência visual: trades não quebraram studs, não cortaram joists indevidamente, não desalinharam paredes. |
| 4 | plumbing_roughin_clear | Rough-in de encanamento não bloqueia backframe | true | Tubulação instalada sem impedir strapping, backing ou drop ceiling. |
| 5 | electrical_roughin_clear | Rough-in elétrico não bloqueia backframe | true | Fiação e caixas instaladas sem impedir strapping ou backing. |
| 6 | hvac_roughin_clear | Dutos de HVAC não bloqueiam backframe | true | Dutos e equipamentos instalados sem impedir drop ceiling ou bulkheads. |
| 7 | ramps_cleanup_safety | Rampas, limpeza e safety | true | Trades deixaram área limpa. Safety mantido. |

---

## Template 4: `backframe_to_final`

Checklist final. O backframe terminou — a casa deve estar 100% pronta para drywall. Esta é a checagem mais completa. Nada mais acontece depois disso além de drywall.

| # | item_code | item_label | is_blocking | Detalhe |
|---|-----------|-----------|-------------|---------|
| 1 | fireplaces | Fireplaces (lareiras) instaladas | true | Se a planta prevê, devem estar completas. |
| 2 | bulkheads | Bulkheads construídos | true | Estruturas que escondem dutos/tubulação no teto. |
| 3 | wall_alignment | Alinhamento de todas as paredes | true | Todas as paredes alinhadas e prontas para drywall. |
| 4 | attic_access | Acesso ao attic instalado | true | Portinha de madeira de acesso ao sótão. |
| 5 | cathedral_ceiling | Acabamentos de cathedral ceiling | true | Se a planta prevê, acabamentos completos. |
| 6 | strapping | Strapping completo | true | Madeira 1x3 em todo o ceiling para drywall smooth. |
| 7 | niche_details | Nichos e detalhes conforme planta | true | Todos os detalhes, upgrades e instalações específicas que a planta pede. |
| 8 | bathroom_backing | Backing para barras de segurança nos banheiros | true | Medida e modelo variam por jobsite. |
| 9 | bathtub_backing | Backing para instalação de banheiras | true | 2x6 nas laterais para parafusar banheira. |
| 10 | stair_walls | Paredes ao redor das escadas | true | Parede de 2x4 entre lances, suporte embaixo da escada, acabamentos. Empresa terceira já instalou escada, backframe faz paredes e acabamentos ao redor. |
| 11 | drywall_backing_complete | Backing de drywall completo em toda a casa | true | Cada face (paredes, escada, banheiro, teto, ceiling) deve ter backup para parafusar drywall. Sem exceção. |
| 12 | garage_drop_ceiling | Drop ceiling de garagem | true | Estrutura para isolamento e tubulação embaixo do piso da garagem. Postes de ferro devem estar soldados antes. |
| 13 | garage_jam | Garage jam (cachilho da porta de garagem) | true | Instalado pelo backframe. Postes de ferro devem estar prontos. |
| 14 | basement_walls | Paredes internas do basement | true | Backframe constrói paredes internas, drop ceilings e bulkheads do basement. |
| 15 | basement_drywall_ready | Basement pronto para drywall | true | Tudo no basement preparado para drywall. |
| 16 | minor_repairs | Pequenos reparos de fases anteriores | true | Point loads mal pregados, pequenos ajustes que não exigem grande esforço. Cultura de "terminar a casa". |
| 17 | no_braces_scaffolds | Nenhuma brace, scaffold ou madeira desnecessária | true | Nada que não seja estritamente necessário para drywall pode restar. |
| 18 | cleanup | Limpeza final | true | Casa completamente limpa. Pronta para receber drywall. |
| 19 | safety_final | Safety final | true | Todos os guardrails, proteções e safety items em ordem para a trade de drywall entrar. |
| 20 | house_complete | Casa completa para drywall | true | Conferência geral: a casa está 100% pronta. Nada mais precisa ser feito pelo framing. |

---

## Nota sobre o Backframe

O backframe tem uma característica cultural importante: como é a última fase do framing, espera-se que a crew resolva pequenos problemas deixados por fases anteriores. Não é refazer o trabalho dos outros, mas terminar a casa. Pregos faltando em point loads, pequenos ajustes que não exigem grande esforço — isso faz parte do escopo do backframe.

O checklist final (`backframe_to_final`) coincide com a entrega do projeto. Depois do backframe, não existe mais nenhuma fase de framing. A casa passa direto para drywall.

---

## Resumo

| Transition | Itens | Foco |
|-----------|-------|------|
| `framing_to_roofing` | 16 | Estrutura completa, medidas, segurança, visual |
| `roofing_to_trades` | 5 | Ventilação, insulation, point loads do telhado |
| `trades_to_backframe` | 7 | Postes prontos, trades não danificaram, rough-ins livres |
| `backframe_to_final` | 20 | Tudo: fireplaces, strapping, backing, garagem, basement, limpeza, casa pronta |

**Total: 48 itens de gate check.**
