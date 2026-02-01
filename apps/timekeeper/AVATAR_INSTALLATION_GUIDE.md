# Avatar Profile Photo - Guia de Instalação

## 📋 O que foi implementado

Sistema completo de fotos de perfil para usuários, incluindo:

✅ Bucket de storage no Supabase (`avatars`)
✅ Políticas RLS para segurança
✅ Upload/atualização/remoção de fotos
✅ UI na aba Settings com avatar clicável
✅ Suporte para câmera e galeria
✅ Auto-limpeza de fotos antigas

---

## 🚀 Passo a Passo

### 1. Instalar dependências NPM

```bash
npm install expo-image-picker base64-arraybuffer
```

Ou com Expo CLI:

```bash
npx expo install expo-image-picker
npm install base64-arraybuffer
```

### 2. Executar SQL no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo `supabase/PROFILE_AVATARS_SETUP.sql`
4. Copie todo o conteúdo e execute no SQL Editor

Isso irá criar:
- ✅ Bucket `avatars` (público, max 5MB, apenas imagens)
- ✅ Políticas RLS para upload/visualização/remoção
- ✅ Trigger para criar profile automaticamente no signup
- ✅ Função para deletar avatar antigo ao fazer upload de novo

### 3. Verificar permissões no app.json

Adicione as permissões de câmera e galeria no `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to let you choose a profile picture.",
          "cameraPermission": "The app accesses your camera to let you take a profile picture."
        }
      ]
    ]
  }
}
```

**Nota:** Se você já tem plugins configurados, apenas adicione o `expo-image-picker` na lista.

### 4. Testar a funcionalidade

1. Rode o app: `npm start`
2. Vá para a aba **Settings**
3. Toque no avatar (círculo com inicial)
4. Escolha uma opção:
   - **Take Photo** - Abre a câmera
   - **Choose from Library** - Abre a galeria
   - **Remove Photo** - Remove a foto atual (se existir)

---

## 📁 Arquivos criados/modificados

### Novos arquivos criados:

1. **`src/lib/avatarService.ts`** - Serviço de upload/remoção de avatares
2. **`src/stores/profileStore.ts`** - Zustand store para gerenciar perfil do usuário
3. **`supabase/PROFILE_AVATARS_SETUP.sql`** - SQL para configurar bucket e políticas

### Arquivos modificados:

1. **`app/(tabs)/settings.tsx`** - UI do avatar com upload/remoção
2. **`src/lib/supabase.ts`** - Já tinha o tipo `ProfileRow` com `avatar_url`

---

## 🔒 Segurança (RLS Policies)

As políticas implementadas garantem que:

- ✅ Qualquer pessoa pode **VER** avatares (bucket público)
- ✅ Usuários só podem **FAZER UPLOAD** para sua própria pasta (`user_id/`)
- ✅ Usuários só podem **ATUALIZAR** seu próprio avatar
- ✅ Usuários só podem **DELETAR** seu próprio avatar
- ✅ Ao fazer upload de novo avatar, o antigo é deletado automaticamente (trigger)

---

## 📦 Estrutura do Storage

```
avatars/
├── user_id_1/
│   └── avatar_1234567890.jpg
├── user_id_2/
│   └── avatar_9876543210.png
└── user_id_3/
    └── avatar_1111111111.webp
```

Cada usuário tem sua pasta identificada pelo `user_id` (UUID).

---

## 🎨 Como funciona a UI

### Estado inicial (sem foto):
```
┌─────────────────────┐
│   ┌───────────┐     │
│   │    CR     │     │  ← Iniciais do nome/email
│   │  📷       │     │  ← Badge de câmera
│   └───────────┘     │
│   Cristian Rocha    │  ← Nome completo (se existir)
│   cristian@ex.com   │  ← Email
└─────────────────────┘
```

### Com foto:
```
┌─────────────────────┐
│   ┌───────────┐     │
│   │  [FOTO]   │     │  ← Foto do usuário
│   │  📷       │     │  ← Badge de câmera
│   └───────────┘     │
│   Cristian Rocha    │
│   cristian@ex.com   │
└─────────────────────┘
```

**Tap no avatar** → Abre menu com opções de câmera/galeria/remover

---

## 🧪 Testar manualmente

### iOS:
1. Tap no avatar
2. Action Sheet aparece com opções
3. Selecione "Take Photo" ou "Choose from Library"
4. Permissões são solicitadas (primeira vez)
5. Escolha foto → Upload automático → Avatar atualiza

### Android:
1. Tap no avatar
2. Alert Dialog com opções
3. Restante igual ao iOS

---

## 🐛 Troubleshooting

### Erro: "Supabase not configured"
- Verifique se `.env` tem `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Erro: "Permission denied" ao fazer upload
- Execute o SQL novamente para criar as políticas RLS
- Verifique se o usuário está autenticado

### Foto não aparece após upload
- Verifique se o bucket `avatars` está com `public = true`
- Inspecione a URL retornada: deve ter formato `https://xxx.supabase.co/storage/v1/object/public/avatars/user_id/file.jpg`

### Permissões negadas (câmera/galeria)
- Vá em Settings do celular → App → Permissions
- Habilite "Camera" e "Photos"

---

## 🔄 Fluxo completo

1. **Usuário faz signup** → Trigger cria registro em `profiles` com `avatar_url = null`
2. **Usuário vai para Settings** → `profileStore.loadProfile()` carrega avatar atual
3. **Usuário toca no avatar** → Menu abre com opções
4. **Usuário escolhe "Take Photo"** → `updateAvatarFromCamera()` é chamado
5. **Foto é tirada** → `uploadAvatar()` faz upload para bucket
6. **Trigger deleta avatar antigo** (se existia)
7. **`profiles.avatar_url` é atualizado** com URL pública
8. **UI atualiza** mostrando a nova foto

---

## 📝 Notas importantes

- **Limite de tamanho:** 5MB por imagem
- **Formatos aceitos:** JPEG, PNG, WebP
- **Crop:** Quadrado 1:1 (aspect ratio)
- **Qualidade:** 0.8 (80%) para reduzir tamanho
- **Nomes únicos:** `avatar_<timestamp>.<ext>` evita conflitos

---

## ✅ Checklist de validação

- [ ] SQL executado no Supabase
- [ ] Bucket `avatars` criado e público
- [ ] Políticas RLS ativas
- [ ] Dependências NPM instaladas
- [ ] Permissões no `app.json`
- [ ] App reiniciado após instalar dependências
- [ ] Teste upload via câmera
- [ ] Teste upload via galeria
- [ ] Teste remoção de foto
- [ ] Verificar auto-limpeza (upload nova foto remove antiga)

---

**Última atualização:** 2026-01-15
**Versão:** 1.0
