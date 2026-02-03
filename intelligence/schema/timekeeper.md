# Schema: Timekeeper (Controle de Horas)

> Tabelas do app Timekeeper para rastreamento de tempo.

---

## Visao Geral

O Timekeeper controla **horas de trabalho** via:
- Geofencing automatico (GPS)
- Entrada manual
- Compartilhamento via QR

---

## Tabelas

### tmk_entries

Registros de horas.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `geofence_id` | uuid FK | Local |
| `project_id` | uuid FK | Projeto |
| `entry_at` | timestamptz | Entrada |
| `exit_at` | timestamptz | Saida |
| `duration_minutes` | int | Duracao |
| `entry_method` | text | auto_gps/manual/qr_scan |
| `is_manual_entry` | bool | Manual? |
| `deleted_at` | timestamptz | Soft delete |

**RLS:** Owner ALL + Viewer SELECT via access_grants

---

### tmk_geofences

Locais de trabalho.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `name` | text | Nome |
| `latitude` | double | Lat |
| `longitude` | double | Lng |
| `radius` | int | Raio (metros) |
| `total_hours` | numeric | Total horas |

---

### tmk_projects

Projetos de trabalho.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `name` | text | Nome |
| `client_name` | varchar | Cliente |
| `estimated_hours` | numeric | Estimado |
| `actual_hours` | numeric | Realizado |
| `status` | varchar | active/completed |

---

## QR Code Sharing

```
Worker cria pending_token (5 min)
  → exibe QR
Manager escaneia
  → cria access_grant
  → RLS permite ver entries/geofences/projects
```

---

## Soft Deletes

Todas as tabelas usam `deleted_at` para soft delete.

---

*Ultima atualizacao: 2026-02-01*
