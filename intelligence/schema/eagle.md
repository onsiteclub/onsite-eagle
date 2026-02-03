# Schema: Eagle (Monitoramento de Obras)

> Tabelas do app Eagle para acompanhamento de construcao.

---

## Visao Geral

O Eagle e o app de **monitoramento visual de obras**. Supervisores usam para:
- Acompanhar progresso de casas/lotes
- Registrar fotos por fase
- Reportar issues
- Manter timeline

---

## Tabelas

### egl_sites

Loteamentos/subdivisoes.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `name` | varchar | Nome |
| `address` | text | Endereco |
| `svg_data` | text | SVG do mapa |

---

### egl_houses

Casas/lotes individuais.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `site_id` | uuid FK | Loteamento |
| `lot_number` | varchar | Numero |
| `status` | varchar | not_started/in_progress/delayed/completed |
| `current_phase` | int | Fase atual |
| `progress_percentage` | decimal | % conclusao |
| `qr_code_data` | text | QR code |

---

### ref_eagle_phases

Fases de construcao (wood frame).

| order | name | required_photos |
|-------|------|-----------------|
| 1 | First Floor | 2 |
| 2 | First Floor Walls | 2 |
| 3 | Second Floor | 1 |
| 4 | Second Floor Walls | 2 |
| 5 | Roof | 2 |
| 6 | Stairs Landing | 1 |
| 7 | Backing Frame | 1 |

---

### egl_progress

Progresso por casa/fase.

---

### egl_photos

Fotos por fase com validacao AI.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `ai_validation_status` | varchar | pending/approved/rejected/needs_review |
| `ai_detected_items` | jsonb | Items detectados |
| `ai_confidence` | decimal | Confianca |

---

### egl_timeline

Eventos cronologicos (diario da casa).

---

### egl_issues

Problemas reportados.

---

### egl_scans

Plantas escaneadas para AI processar.

---

## Storage

Bucket: `eagle-files`
```
eagle-files/
├── sites/{site_id}/plans/
└── houses/{house_id}/phases/{phase_id}/photos/
```

---

*Ultima atualizacao: 2026-02-01*
