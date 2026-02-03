# Schema: Core (Identidade)

> Tabelas compartilhadas entre todos os apps do ecossistema.

---

## Visao Geral

As tabelas `core_*` representam a **identidade unificada** do usuario atraves de todos os apps OnSite Club. Um usuario cria conta uma vez e usa em Timekeeper, Calculator, Shop, Eagle, etc.

---

## Tabelas

### core_profiles

Perfil do usuario. Extende `auth.users` do Supabase Auth.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | = auth.users.id (1:1) |
| `email` | varchar | Email do usuario |
| `full_name` | varchar | Nome completo |
| `trade_id` | uuid FK | Oficio principal (ref_trades) |
| `experience_years` | int | Anos de experiencia |
| `country` | varchar | Pais (default: CA) |
| `province` | varchar | Provincia |
| `language_primary` | varchar | Idioma principal |
| `voice_enabled` | bool | Voz habilitada |
| `units_system` | text | metric/imperial |
| `onboarding_completed_at` | timestamptz | Quando completou |
| `last_active_at` | timestamptz | Ultimo uso |

**RLS:** Owner SELECT/INSERT/UPDATE + shared via access_grants

---

### core_devices

Dispositivos registrados do usuario.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID do registro |
| `user_id` | uuid FK | Usuario dono |
| `device_id` | text | ID unico do dispositivo |
| `platform` | varchar | ios/android |
| `push_token` | text | Token para push |
| `is_primary` | bool | Dispositivo principal |

**RLS:** ALL apenas proprios dispositivos

---

### core_consents

Consentimentos LGPD/PIPEDA.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `user_id` | uuid FK | Usuario |
| `consent_type` | varchar | terms/privacy/marketing |
| `granted` | bool | Aceito |
| `granted_at` | timestamptz | Quando |

---

### core_access_grants

Compartilhamento Worker ↔ Manager via QR.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid PK | ID |
| `owner_id` | uuid FK | Worker |
| `viewer_id` | uuid FK | Manager |
| `status` | varchar | active/revoked |

---

### core_pending_tokens

Tokens temporarios para QR (5 min TTL).

---

### core_admin_users

Admins do Analytics (aprovacao necessaria).

---

### core_voice_logs

Logs de interacoes de voz.

---

## Funcoes SECURITY DEFINER

- `check_email_exists(email)` — Verifica email
- `lookup_pending_token(token)` — Busca token QR
- `is_active_admin()` — Verifica admin ativo
- `is_super_admin()` — Verifica super admin

---

*Ultima atualizacao: 2026-02-01*
