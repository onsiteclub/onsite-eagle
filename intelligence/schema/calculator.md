# Schema: Calculator (Calculadora por Voz)

> Tabelas do app Calculator para calculos de construcao.

---

## Visao Geral

O Calculator e a **calculadora por voz** para trabalhadores. Permite:
- Calculos falando (hands-free)
- Formulas por oficio
- Templates reutilizaveis

---

## Tabelas

### ccl_calculations

Calculos realizados.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `calculation_type` | text | area/volume/length/material |
| `input_values` | jsonb | Entradas |
| `input_method` | text | manual/voice |
| `voice_log_id` | uuid FK | Log de voz |
| `result_value` | numeric | Resultado |
| `result_unit` | text | Unidade |
| `was_successful` | bool | Sucesso |

---

### ccl_templates

Templates de formulas.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `name` | text | Nome |
| `category` | text | Categoria |
| `trade_id` | uuid FK | Oficio |
| `formula` | text | Formula |
| `input_fields` | jsonb | Campos |
| `is_system` | bool | Sistema |
| `is_public` | bool | Publico |

---

### ref_units

Unidades de medida.

| code | name | system | type |
|------|------|--------|------|
| m | meter | metric | length |
| ft | foot | imperial | length |
| sqft | square foot | imperial | area |
| sqm | square meter | metric | area |

---

## Fluxo de Voz

```
Usuario fala → Whisper transcreve
  → voice_log criado
  → intent detectado
  → calculation criado
  → resultado exibido
```

### Normalizacao

| Falado | Normalizado |
|--------|-------------|
| "dois por quatro" | "2x4" |
| "dez pes" | "10 ft" |
| "metro quadrado" | "sqm" |

---

## Valor para Prumo AI

- Termos informais de trabalhadores
- Formulas mais usadas por oficio
- Padroes de voz multilingual

---

*Ultima atualizacao: 2026-02-01*
