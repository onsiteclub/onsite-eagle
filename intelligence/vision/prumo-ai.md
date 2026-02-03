# Prumo AI — Visao Estrategica 2027+

> *"O olho treinado de um carpinteiro, em forma de IA."*

---

## O Que e Prumo

**Prumo** e a IA proprietaria que o OnSite Club esta construindo. O nome vem da ferramenta de construcao usada para verificar se algo esta perfeitamente vertical — o "prumo".

Assim como um carpinteiro experiente olha para uma obra e imediatamente ve o que esta errado, Prumo vai olhar para fotos, ouvir comandos de voz, e analisar dados para identificar problemas e padroes.

---

## Linha do Tempo

```
2024 ─────────────────────────────────────────────────────────► 2030
  │                                                              │
  │  [Hoje: Coleta]        [2027: Prumo v1]    [2030: Robo]    │
  │        │                      │                  │          │
  │  Apps coletando          Primeiro modelo    Prumo + Kepler  │
  │  dados reais             treinado           na obra         │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### Fase 1: Coleta (2024-2026)
- Timekeeper coletando horas e localizacoes
- Calculator coletando padroes de voz
- Eagle coletando fotos de obras
- Shop coletando padroes de compra
- **Meta:** 1M+ data points

### Fase 2: Anotacao (2025-2026)
- Fotos anotadas (bounding boxes, categorias)
- Transcricoes de voz corrigidas
- Erros categorizados
- **Meta:** 100k+ anotacoes validadas

### Fase 3: Treinamento (2026-2027)
- Primeiro modelo treinado em dados reais
- Validacao com supervisores humanos
- Iteracao baseada em feedback
- **Meta:** Prumo v1 funcional

### Fase 4: Integracao (2027-2028)
- Prumo integrado nos apps
- AI-assisted quality control
- Alertas automaticos de problemas
- **Meta:** Adocao por 50% dos usuarios

### Fase 5: Robotica (2028-2030)
- Prumo rodando em Kepler K2
- Robot "ve" o que o carpinteiro ve
- Human-in-the-loop para decisoes criticas
- **Meta:** Primeiro robo em obra real

---

## O Que Prumo Vai Saber

Treinado em dados reais de trabalhadores canadenses:

### 1. Visao (Fotos)

| Categoria | Exemplos | Fonte |
|-----------|----------|-------|
| **Materiais** | Madeira boa vs sucata, tipos de pregos, qualidade de drywall | Eagle photos |
| **Estrutura** | Prumo correto, nivel, espacamento de joists | Eagle phases |
| **Erros** | Gaps, rachaduras, instalacao incorreta | Eagle issues |
| **Seguranca** | Fios expostos, buracos sem protecao, escadas mal posicionadas | Eagle timeline |
| **Progresso** | % de conclusao, fases completadas | Eagle progress |

### 2. Voz (Audio)

| Categoria | Exemplos | Fonte |
|-----------|----------|-------|
| **Termos informais** | "2x4", "studs", "joist", "sheathing" | Calculator voice_logs |
| **Multilingual** | Ingles, Portugues, Espanhol, Tagalog | Calculator transcriptions |
| **Intents** | "quanto preciso", "calcula ai", "soma isso" | Calculator intents |
| **Dialetos** | Sotaque brasileiro, mexicano, filipino | Calculator dialect_region |

### 3. Padroes de Trabalho (Comportamento)

| Categoria | Exemplos | Fonte |
|-----------|----------|-------|
| **Horarios** | Quando cada trade comeca/termina | Timekeeper entries |
| **Produtividade** | Horas por tipo de trabalho | Timekeeper + projects |
| **Sazonalidade** | Variacao por estacao/provincia | agg_trade_weekly |
| **Equipes** | Dinamicas de grupo, turnover | access_grants + profiles |

### 4. Mercado (Comercial)

| Categoria | Exemplos | Fonte |
|-----------|----------|-------|
| **Demanda** | Produtos mais vendidos por oficio/regiao | Shop orders |
| **Pricing** | Sensibilidade a preco por segmento | Shop + billing |
| **Tendencias** | Novos materiais, ferramentas emergentes | Shop + calculations |

---

## Abordagem de Treinamento

Inspirado no modelo Tesla Autopilot: **coletar por anos, treinar quando o dataset for grande o suficiente**.

### Principios

1. **Dados reais > dados sinteticos**
   - Fotos de obras reais, nao de bancos de imagem
   - Voz de trabalhadores reais, nao de atores
   - Padroes de uso real, nao simulados

2. **Human-in-the-loop**
   - Supervisor confirma/corrige deteccoes da AI
   - Feedback loop continuo
   - Modelo melhora com cada correcao

3. **Privacidade por design**
   - Dados anonimizados para treinamento
   - Sem PII nos datasets de ML
   - Consentimento explicito para uso em AI

4. **Incremental**
   - Comecar com tarefas simples (classificacao de materiais)
   - Progredir para tarefas complexas (deteccao de erros)
   - Validar antes de escalar

### Formato de Dados

#### Imagens — COCO JSON
```json
{
  "images": [
    {
      "id": 1,
      "file_name": "site_123_lot_45_phase_2.jpg",
      "width": 4032,
      "height": 3024
    }
  ],
  "annotations": [
    {
      "id": 1,
      "image_id": 1,
      "category_id": 5,
      "bbox": [100, 200, 300, 400],
      "confidence": 0.92,
      "annotator": "claude_vision",
      "verified_by": "cris"
    }
  ],
  "categories": [
    {"id": 5, "name": "error_structural", "supercategory": "defect"}
  ]
}
```

#### Voz — Transcription Records
```json
{
  "audio_id": "uuid",
  "transcription_raw": "soma ai dois por quatro mais tres por seis",
  "transcription_normalized": "2x4 + 3x6",
  "language": "pt-BR",
  "dialect": "brasileiro",
  "trade_context": "framer",
  "intent": "addition",
  "was_successful": true,
  "user_corrected": false
}
```

---

## Tabelas de Suporte (Planejadas)

### visual_events
```sql
CREATE TABLE visual_events (
  id UUID PRIMARY KEY,
  site_id UUID REFERENCES egl_sites(id),
  house_id UUID REFERENCES egl_houses(id),
  phase_id UUID REFERENCES ref_eagle_phases(id),

  -- Contexto
  room_type VARCHAR(50),
  capture_angle VARCHAR(20),
  lighting_condition VARCHAR(20),

  -- Localizacao
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- AI Analysis
  ai_analyzed BOOLEAN DEFAULT false,
  ai_model_version VARCHAR(50),
  ai_analysis_result JSONB,
  severity_detected VARCHAR(20),

  -- Metadata
  captured_by UUID,
  captured_at TIMESTAMPTZ,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### image_annotations
```sql
CREATE TABLE image_annotations (
  id UUID PRIMARY KEY,
  visual_event_id UUID REFERENCES visual_events(id),

  -- Anotacao
  category_id UUID REFERENCES error_taxonomy(id),
  bbox JSONB, -- [x, y, width, height]
  segmentation JSONB, -- polygon points (optional)
  confidence DECIMAL(5,4),

  -- Proveniencia
  annotator_type VARCHAR(20), -- 'human', 'claude_vision', 'prumo_v1'
  annotator_id VARCHAR(100),

  -- Validacao
  is_validated BOOLEAN DEFAULT false,
  validated_by VARCHAR(100),
  validated_at TIMESTAMPTZ,
  validation_notes TEXT,

  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### error_taxonomy
```sql
CREATE TABLE error_taxonomy (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100),
  name_pt VARCHAR(100),

  -- Hierarquia
  category VARCHAR(50) NOT NULL, -- structural, finishing, electrical, safety
  parent_id UUID REFERENCES error_taxonomy(id),

  -- Caracteristicas
  severity_typical VARCHAR(20), -- low, medium, high, critical
  repair_complexity VARCHAR(20),
  typical_cost_range JSONB,

  -- ML
  detection_keywords TEXT[],
  visual_indicators TEXT[],

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Categorias Iniciais de Erro

### Materiais
- `wood_useful` — Madeira utilizavel
- `wood_scrap` — Madeira para descarte
- `material_damaged` — Material danificado
- `material_wrong_spec` — Especificacao incorreta

### Estrutural
- `error_plumb` — Fora de prumo (vertical)
- `error_level` — Fora de nivel (horizontal)
- `error_spacing` — Espacamento incorreto
- `error_connection` — Conexao inadequada
- `load_point` — Ponto de carga estrutural

### Acabamento
- `error_finishing_gap` — Gap no acabamento
- `error_finishing_crack` — Rachadura
- `error_finishing_stain` — Mancha
- `error_finishing_uneven` — Superficie irregular

### Seguranca
- `safety_exposed_wire` — Fio exposto
- `safety_unprotected_hole` — Buraco sem protecao
- `safety_unstable_ladder` — Escada instavel
- `safety_missing_guard` — Guarda faltando

---

## Metricas de Sucesso

### Fase 1-2 (Coleta + Anotacao)
- [ ] 1M+ data points coletados
- [ ] 100k+ anotacoes de imagem
- [ ] 50k+ transcricoes de voz validadas
- [ ] 20% das fotos com validacao humana

### Fase 3 (Treinamento)
- [ ] Accuracy > 85% em classificacao de materiais
- [ ] Accuracy > 75% em deteccao de erros
- [ ] Voice intent recognition > 90%

### Fase 4 (Integracao)
- [ ] 50% dos usuarios ativos usando features AI
- [ ] Reducao de 30% no tempo de inspecao
- [ ] NPS > 50 para features AI

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Dados insuficientes | Incentivos para usuarios enviarem fotos |
| Dados enviesados | Balancear por oficio/regiao/idioma |
| Privacidade | Anonimizacao rigorosa, consentimento |
| Overfitting | Holdout sets, validacao cruzada |
| Adocao baixa | AI como assistente, nao substituto |

---

## Competidores e Diferencial

| Competidor | Abordagem | Nosso Diferencial |
|------------|-----------|-------------------|
| OpenAI/Anthropic | General-purpose | Foco 100% em construcao |
| Procore | Software-first | Hardware + AI roadmap |
| PlanGrid | Documentacao | Dados de campo reais |
| Buildr | Analytics | Visao + Voz + Comportamento |

**Diferencial chave:** Nenhum concorrente tem acesso a dados diarios reais de trabalhadores de construcao em multiplos idiomas (EN, PT, ES, TL).

---

*Ultima atualizacao: 2026-02-01*
