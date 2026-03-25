# OnSite Eagle — Gate Check & Phase Checklist Feature Spec

**Package:** `@onsite/checklist`
**Sprint:** Sprint 2 — Quality Control Layer
**Status:** Ready for implementation
**Last updated:** 2026-03-13

---

## 1. Overview

Feature de checklist integrada ao monorepo OnSite Eagle. Workers acessam via browser mobile (sem instalação), identificam a casa por código de lote, preenchem os itens com resultado (pass/fail/n/a) e podem anexar **até 2 fotos por item**. Fotos são comprimidas no cliente antes do upload para o Supabase Storage.

O sistema cobre 3 tipos de checklist extraídos dos cadernos de campo:
- **Framing Check-List** — gate entre Framing e Roofing
- **Backing Check-List** — phase checklist do Backing/Backframe
- **Trusses Check-List** — gate entre Trusses e próxima trade

---

## 2. Posição no Monorepo

```
apps/
  web/              ← dashboard Next.js (foreman/builder view)
  field/            ← app Expo (worker mobile)
packages/
  checklist/        ← NOVO PACKAGE — toda lógica e UI do checklist
    src/
      components/
        ChecklistForm.tsx       ← form principal
        ChecklistItem.tsx       ← item individual com foto upload
        PhotoUploader.tsx       ← câmera/galeria + compressão
        LotSelector.tsx         ← seletor de lote
        PhaseSelector.tsx       ← seletor de checklist type
      hooks/
        useChecklist.ts         ← state machine do checklist
        usePhotoUpload.ts       ← compressão + upload Supabase Storage
        useGateCheck.ts         ← lógica de blocking items
      lib/
        compress.ts             ← cliente-side image compression
        supabase.ts             ← client instance (shared via @onsite/db)
        templates.ts            ← todos os templates de checklist
      types/
        index.ts                ← ChecklistResult, GateCheckItem, PhotoRef
      index.ts                  ← barrel export
    package.json
    tsconfig.json
```

### Integração nos apps existentes

| App | Como usa | Entry point |
|-----|----------|-------------|
| `apps/field` (Expo) | Tela nativa de checklist | `import { ChecklistForm } from '@onsite/checklist'` |
| `apps/web` (Next.js) | Página `/checklist` para acesso mobile via browser | `import { ChecklistForm } from '@onsite/checklist'` |

---

## 3. Banco de Dados (Supabase)

### Tabelas envolvidas (já existentes no schema `frm_*`)

```sql
-- Gate check instance (uma por lote + transição)
frm_gate_checks
  id              UUID PK
  lot_id          UUID → frm_lots
  transition      TEXT  -- 'framing_to_roofing' | 'trusses_to_trades' | 'backing_phase'
  submitted_by    UUID → core_profiles
  submitted_at    TIMESTAMPTZ
  status          TEXT  -- 'draft' | 'submitted' | 'blocked' | 'approved'
  notes           TEXT

-- Resultado de cada item
frm_gate_check_items
  id              UUID PK
  gate_check_id   UUID → frm_gate_checks
  item_code       TEXT
  item_label      TEXT
  result          TEXT  -- 'pass' | 'fail' | 'na' | 'pending'
  notes           TEXT
  is_blocking     BOOLEAN
  photo_1_url     TEXT  -- Supabase Storage path
  photo_2_url     TEXT  -- nullable
  deficiency_id   UUID → frm_house_items  -- se fail + blocking, auto-criado
```

### Supabase Storage — Bucket

```
bucket: gate-check-photos
  path: {jobsite_id}/{lot_id}/{gate_check_id}/{item_code}_1.jpg
  path: {jobsite_id}/{lot_id}/{gate_check_id}/{item_code}_2.jpg

Configurações do bucket:
  - Público: NÃO (acesso via signed URLs)
  - Limite por arquivo: 2MB (enforced no cliente antes do upload)
  - Tipos aceitos: image/jpeg, image/webp
```

---

## 4. Lógica de Compressão de Foto

Compressão feita **no cliente** antes do upload, usando canvas browser API (web) ou `expo-image-manipulator` (native).

### Parâmetros de compressão

```typescript
// packages/checklist/src/lib/compress.ts

export const COMPRESSION_CONFIG = {
  maxWidthOrHeight: 1280,   // reduz dimensão máxima para 1280px
  quality: 0.72,             // 72% JPEG quality — bom equilíbrio visual/tamanho
  outputFormat: 'jpeg',
  targetMaxBytes: 800_000,   // tenta ficar abaixo de 800KB
}
```

### Fluxo de compressão (web)

```typescript
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(
        COMPRESSION_CONFIG.maxWidthOrHeight / img.width,
        COMPRESSION_CONFIG.maxWidthOrHeight / img.height,
        1
      )
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        COMPRESSION_CONFIG.quality
      )
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}
```

### Fluxo de compressão (Expo/native)

```typescript
import * as ImageManipulator from 'expo-image-manipulator'

export async function compressImageNative(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}
```

---

## 5. Hook `usePhotoUpload`

```typescript
// packages/checklist/src/hooks/usePhotoUpload.ts

interface PhotoUploadState {
  url: string | null
  uploading: boolean
  error: string | null
  sizeKB: number | null
}

export function usePhotoUpload(
  gateCheckId: string,
  itemCode: string,
  slot: 1 | 2
) {
  const [state, setState] = useState<PhotoUploadState>({
    url: null, uploading: false, error: null, sizeKB: null
  })

  async function upload(file: File | string) {
    setState(s => ({ ...s, uploading: true, error: null }))
    try {
      const compressed = typeof file === 'string'
        ? await compressImageNative(file)   // Expo
        : await compressImage(file)          // Web
      
      const path = buildStoragePath(gateCheckId, itemCode, slot)
      const { error } = await supabase.storage
        .from('gate-check-photos')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      
      if (error) throw error
      
      const { data } = supabase.storage
        .from('gate-check-photos')
        .getPublicUrl(path)  // ou createSignedUrl() se bucket privado
      
      setState({ url: data.publicUrl, uploading: false, error: null, sizeKB: null })
    } catch (err) {
      setState(s => ({ ...s, uploading: false, error: 'Upload failed' }))
    }
  }

  async function remove() {
    const path = buildStoragePath(gateCheckId, itemCode, slot)
    await supabase.storage.from('gate-check-photos').remove([path])
    setState({ url: null, uploading: false, error: null, sizeKB: null })
  }

  return { ...state, upload, remove }
}

function buildStoragePath(gateCheckId: string, itemCode: string, slot: 1 | 2) {
  return `${gateCheckId}/${itemCode}_${slot}.jpg`
}
```

---

## 6. Componente `PhotoUploader`

```typescript
// packages/checklist/src/components/PhotoUploader.tsx

interface Props {
  gateCheckId: string
  itemCode: string
  slot: 1 | 2
  existingUrl?: string | null
  disabled?: boolean
}

export function PhotoUploader({ gateCheckId, itemCode, slot, existingUrl, disabled }: Props) {
  const { url, uploading, error, upload, remove } = usePhotoUpload(gateCheckId, itemCode, slot)
  const displayUrl = url ?? existingUrl

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await upload(file)
  }

  if (displayUrl) {
    return (
      <div className="photo-slot photo-slot--filled">
        <img src={displayUrl} alt={`Photo ${slot}`} />
        {!disabled && (
          <button onClick={remove} aria-label="Remove photo">✕</button>
        )}
      </div>
    )
  }

  return (
    <label className={`photo-slot photo-slot--empty ${uploading ? 'uploading' : ''}`}>
      {uploading ? <span>Uploading...</span> : <span>+ Photo {slot}</span>}
      <input
        type="file"
        accept="image/*"
        capture="environment"   // abre câmera traseira por padrão no mobile
        onChange={handleChange}
        disabled={disabled || uploading}
        style={{ display: 'none' }}
      />
    </label>
  )
}
```

---

## 7. Componente `ChecklistItem`

```typescript
// packages/checklist/src/components/ChecklistItem.tsx

interface Props {
  gateCheckId: string
  item: GateCheckItemTemplate
  result: ItemResult
  onResultChange: (itemCode: string, result: 'pass' | 'fail' | 'na') => void
  onPhotoChange: (itemCode: string, slot: 1 | 2, url: string | null) => void
}

export function ChecklistItem({ gateCheckId, item, result, onResultChange, onPhotoChange }: Props) {
  return (
    <div className={`checklist-item checklist-item--${result.status ?? 'pending'}`}>
      <div className="item-header">
        <span className="item-label">{item.label}</span>
        {item.blocking && <span className="badge badge--blocking">blocking</span>}
      </div>

      <div className="item-actions">
        <button
          className={`btn-result ${result.status === 'pass' ? 'active' : ''}`}
          onClick={() => onResultChange(item.id, 'pass')}
        >✓ pass</button>
        <button
          className={`btn-result btn-result--fail ${result.status === 'fail' ? 'active' : ''}`}
          onClick={() => onResultChange(item.id, 'fail')}
        >✕ fail</button>
        <button
          className={`btn-result btn-result--na ${result.status === 'na' ? 'active' : ''}`}
          onClick={() => onResultChange(item.id, 'na')}
        >n/a</button>
      </div>

      {/* Fotos — sempre visíveis, independente do resultado */}
      <div className="item-photos">
        <PhotoUploader
          gateCheckId={gateCheckId}
          itemCode={item.id}
          slot={1}
          existingUrl={result.photo1Url}
        />
        <PhotoUploader
          gateCheckId={gateCheckId}
          itemCode={item.id}
          slot={2}
          existingUrl={result.photo2Url}
        />
      </div>
    </div>
  )
}
```

---

## 8. Templates de Checklist

```typescript
// packages/checklist/src/lib/templates.ts

export type ChecklistType = 'framing' | 'backing' | 'trusses'

export interface GateCheckItemTemplate {
  id: string
  label: string
  blocking: boolean
}

export interface ChecklistTemplate {
  type: ChecklistType
  label: string
  description: string
  items: GateCheckItemTemplate[]
}

export const CHECKLIST_TEMPLATES: Record<ChecklistType, ChecklistTemplate> = {
  framing: {
    type: 'framing',
    label: 'Framing Check-List',
    description: 'Gate: Framing → Roofing',
    items: [
      { id: 'wall_sheathing',   label: 'Wall sheathing alignment + tna blocks + nail @ bottom',                                                blocking: true  },
      { id: 'leftovers_floor',  label: 'All leftovers filled in front of 1st/2nd floor and basement free of debris',                          blocking: false },
      { id: 'safety_railings',  label: 'Safety railings installed @ stair holes, windows, doors & temp stair',                                blocking: true  },
      { id: 'window_doors',     label: 'All windows & doors openings and location as per plan',                                               blocking: true  },
      { id: 'walls_location',   label: 'All walls installed @ the right location, even shower and mech walls',                                blocking: true  },
      { id: 'point_loads',      label: 'All point loads installed & carried down to foundation, including the trusses ones',                   blocking: true  },
      { id: 'stair_holes',      label: 'Stairs holes & landings framed as per plan with hanger and posts installed',                          blocking: true  },
      { id: 'steel_beams',      label: 'Steel beams supported to the foundation with 8" space for the steel posts',                           blocking: true  },
      { id: 'i24_joists',       label: 'I24-joists fully nailed with screws & glue',                                                          blocking: true  },
      { id: 'joist_blkn',       label: 'Joist blkn\' nailed with horizontal angled nails + glue @ top/bottom',                               blocking: false },
    ]
  },

  backing: {
    type: 'backing',
    label: 'Backing Check-List',
    description: 'Phase: Backing / Backframe',
    items: [
      { id: 'porch_ceiling',     label: 'Porch dropped ceiling or strapped',                                       blocking: false },
      { id: 'mech_walls',        label: 'All mech walls framed',                                                    blocking: true  },
      { id: 'i_joists_cut',      label: 'I-joists supported where top plates were cut',                             blocking: true  },
      { id: 'strapping',         label: 'Strapping leveled',                                                        blocking: false },
      { id: 'bsmt_backing',      label: 'Basement backing walls: EPW, laundry',                                     blocking: false },
      { id: 'bsmt_plates',       label: 'Bsmt plates installed @ top/bottom',                                       blocking: true  },
      { id: 'bathroom_backing',  label: 'Main bathroom railing backing',                                            blocking: false },
      { id: 'fireplace',         label: 'Fireplace framed',                                                         blocking: true  },
      { id: 'tv_backing',        label: 'TV backing, closet, shelves & bath blkn\'',                                blocking: false },
      { id: 'garage_ceiling',    label: 'Garage dropped ceiling',                                                   blocking: false },
      { id: 'garage_jambs',      label: 'Garage jambs installed',                                                   blocking: false },
      { id: 'porch_posts',       label: 'Porch PT posts installed',                                                 blocking: false },
      { id: 'house_clean',       label: 'House & garage free of debris or leftovers',                               blocking: false },
      { id: 'attic_hatch',       label: 'Attic hatch installed',                                                    blocking: false },
    ]
  },

  trusses: {
    type: 'trusses',
    label: 'Trusses Check-List',
    description: 'Gate: Trusses → Next Trade',
    items: [
      { id: 'temp_bracing',      label: 'All temporary bracing, blocks and scaffolding removed',                    blocking: true  },
      { id: 'house_clean2',      label: 'House and garage free of debris & all leftovers piled up',                 blocking: false },
      { id: 'girder_truss',      label: 'Girder truss point load installed',                                        blocking: true  },
      { id: 'insulation_stop',   label: 'Insulation stop installed',                                                blocking: false },
      { id: 'drywall_backing',   label: 'Backing for drywall @ ceiling',                                            blocking: false },
      { id: 'guardrails',        label: 'Guardrails re-installed on windows',                                       blocking: true  },
      { id: 'stair_hole',        label: 'Stair hole platform removed & guardrails installed',                       blocking: true  },
      { id: 'osb_sheathing',     label: 'OSB sheathing and debris picked from around the unit',                     blocking: false },
      { id: 'fascias',           label: 'Fascias lined & straight',                                                  blocking: false },
      { id: 'hangers',           label: 'Hangers installed, even lower',                                             blocking: true  },
      { id: 'truss_bracing',     label: 'All the truss bracing installed',                                          blocking: true  },
      { id: 'gypsum_garage',     label: 'Gypsum board installed @ garage',                                          blocking: false },
      { id: 'vents',             label: 'Vents cut off',                                                             blocking: false },
    ]
  }
}
```

---

## 9. Tipos TypeScript

```typescript
// packages/checklist/src/types/index.ts

export type ChecklistType = 'framing' | 'backing' | 'trusses'
export type ItemResult = 'pass' | 'fail' | 'na' | 'pending'
export type GateCheckStatus = 'draft' | 'submitted' | 'blocked' | 'approved'

export interface GateCheckItemTemplate {
  id: string
  label: string
  blocking: boolean
}

export interface ChecklistItemState {
  status: ItemResult
  photo1Url: string | null
  photo2Url: string | null
  notes?: string
}

export interface ChecklistFormState {
  gateCheckId: string
  lotId: string
  type: ChecklistType
  workerId: string
  results: Record<string, ChecklistItemState>
  submittedAt: string | null
  status: GateCheckStatus
}

export interface SubmitPayload {
  gateCheckId: string
  lotId: string
  transition: string
  workerId: string
  items: Array<{
    itemCode: string
    itemLabel: string
    result: ItemResult
    isBlocking: boolean
    photo1Url: string | null
    photo2Url: string | null
    notes?: string
  }>
}
```

---

## 10. `package.json` do Package

```json
{
  "name": "@onsite/checklist",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@onsite/db": "workspace:*",
    "@onsite/ui": "workspace:*",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

---

## 11. Integração em `apps/field` (Expo)

```typescript
// apps/field/src/screens/ChecklistScreen.tsx

import { ChecklistForm } from '@onsite/checklist'
import { useLocalSearchParams } from 'expo-router'

export default function ChecklistScreen() {
  const { lotId, type } = useLocalSearchParams<{ lotId: string; type: string }>()

  return (
    <ChecklistForm
      lotId={lotId}
      checklistType={type as ChecklistType}
      onSubmitSuccess={(gateCheckId) => {
        router.push(`/lots/${lotId}`)
      }}
    />
  )
}
```

---

## 12. Integração em `apps/web` (Next.js)

```typescript
// apps/web/src/app/checklist/[lotId]/page.tsx
// Rota acessível via QR code ou link direto — mobile browser, sem app

import { ChecklistForm } from '@onsite/checklist'

interface Props {
  params: { lotId: string }
  searchParams: { type: ChecklistType }
}

export default function ChecklistPage({ params, searchParams }: Props) {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <ChecklistForm
        lotId={params.lotId}
        checklistType={searchParams.type}
        onSubmitSuccess={() => {
          // redirect para confirmation page
        }}
      />
    </main>
  )
}
```

### QR Code para acesso rápido no campo

```
https://eagle.onsiteclub.ca/checklist/{lotId}?type=framing
https://eagle.onsiteclub.ca/checklist/{lotId}?type=trusses
https://eagle.onsiteclub.ca/checklist/{lotId}?type=backing
```

QR codes gerados por lote e afixados na porta ou no framing. Worker scana, faz login rápido com worker code + PIN, preenche o checklist.

---

## 13. RLS Policies (Supabase)

```sql
-- frm_gate_checks: worker só vê checklists do próprio jobsite
CREATE POLICY "workers_read_own_jobsite_checks"
  ON frm_gate_checks FOR SELECT
  USING (
    lot_id IN (
      SELECT fl.id FROM frm_lots fl
      JOIN frm_phase_assignments fpa ON fpa.lot_id = fl.id
      WHERE fpa.worker_id = auth.uid()
    )
  );

-- workers podem criar gate checks
CREATE POLICY "workers_insert_gate_checks"
  ON frm_gate_checks FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- workers podem atualizar apenas seus próprios drafts
CREATE POLICY "workers_update_own_draft_checks"
  ON frm_gate_checks FOR UPDATE
  USING (submitted_by = auth.uid() AND status = 'draft');

-- Storage: workers podem fazer upload no próprio gate check
CREATE POLICY "workers_upload_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gate-check-photos'
    AND auth.role() = 'authenticated'
  );
```

---

## 14. Regras de Negócio

| Regra | Comportamento |
|-------|---------------|
| Fotos | Máximo 2 por item. Compressão obrigatória no cliente antes do upload. |
| Compressão | Max 1280px, quality 72%, target < 800KB. |
| Blocking + Fail | Bloqueia submit normal. Worker pode forçar submit com notificação ao foreman. |
| Blocking + Fail | Cria automaticamente item em `frm_house_items` com `severity = critical`. |
| n/a | Item pulado por não aplicável. Não conta como pendente. |
| Submit parcial | Não permitido. Todos os itens devem ter resultado antes do submit. |
| Re-abertura | Apenas foreman pode reabrir um checklist já submetido. |
| Fotos obrigatórias em fail? | Recomendado mas não blocking — foreman pode configurar por jobsite. |

---

## 15. Checklist de Implementação

### Sprint 2 — Semana 1
- [ ] Criar `packages/checklist/` com estrutura de pastas
- [ ] Implementar `compress.ts` (web) e testar com foto real de obra
- [ ] Implementar `usePhotoUpload.ts`
- [ ] Criar bucket `gate-check-photos` no Supabase + RLS
- [ ] Implementar `PhotoUploader.tsx`
- [ ] Implementar `ChecklistItem.tsx`

### Sprint 2 — Semana 2
- [ ] Implementar `ChecklistForm.tsx` completo com state machine
- [ ] Integrar em `apps/web/src/app/checklist/[lotId]/page.tsx`
- [ ] Gerar QR codes de teste por lote
- [ ] Testar fluxo completo end-to-end com foto real
- [ ] Integrar em `apps/field` (Expo)
- [ ] Testar compressão no iOS e Android
- [ ] Implementar auto-criação de `frm_house_items` em blocking fails

---

*Package: `@onsite/checklist` | Monorepo: OnSite Eagle | Turborepo + pnpm workspaces*
