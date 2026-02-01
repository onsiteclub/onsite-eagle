# Changelog - OnSite Calculator

## v3.2 (2026-01-15) - UI Redesign & Branding

### 🎨 Design & UI
- **Tema Claro Completo**: Migrado de tema escuro para tema claro profissional
  - Fundo app: `#F8F9FA` (cinza muito claro)
  - Cards: `#FFFFFF` com sombras sutis
  - Display: `#F9FAFB` com bordas claras
  - Alto contraste para acessibilidade

- **Cores da Marca OnSite Club**:
  - Amarelo OnSite `#FDB913` para ações principais (botão de voz, botão 'ft)
  - Azul Petróleo `#2C5F5D` para operadores matemáticos
  - Azul Petróleo Escuro `#234E4C` para hover de operadores
  - Transições suaves de 0.15s - 0.2s

- **Botões Redesenhados**:
  - Numéricos: Fundo cinza claro `#F3F4F6` com borda `#D1D5DB`
  - Operadores (÷×+-=%): Azul petróleo `#2C5F5D` com texto branco
  - Botão igual (=): Azul petróleo `#2C5F5D` com texto branco
  - C/Backspace: Cinza claro `#E5E7EB` com texto `#6B7280`
  - Frações: Fundo branco em container amarelo claro `#FEF3C7`
  - Botão 'ft: Amarelo OnSite `#FDB913` com texto branco
  - Botão de Voz: Amarelo OnSite `#FDB913`, listening state: azul petróleo

### 📱 Header Simplificado
- Logo OnSite Club local (`public/images/onsite-club-logo.png`)
- Logo clicável: Abre https://onsiteclub.ca com confirmação
- Removido texto "OnSite" e "CALCULATOR"
- Removido botão de logout (seta vermelha)
- Mantido apenas: Logo (esquerda) + Badge usuário + Badge offline (direita)
- Background branco com borda inferior sutil

### 🐛 Bug Fixes
- **Loop Infinito em useAuth**:
  - Alterado useEffect para usar `[]` (sem dependências)
  - Adicionado filtro para ignorar eventos `INITIAL_SESSION` e `SIGNED_IN`
  - Adicionado flag `mounted` para cleanup correto

- **Loop Infinito em useDeepLink**:
  - Implementado `useRef` para callback evitando re-registro de listeners
  - Alterado useEffect para usar `[]` (sem dependências)

- **refreshProfile causando re-renders**:
  - Removido dependências `[fetchProfile, checkVoiceAccess]`
  - Lógica movida inline para evitar referências que mudam
  - Array de dependências vazio `[]`

### 📚 Documentação
- Criado `COLOR_THEME.md` com paleta completa de cores
- Criado `HEADER_CHANGES.md` com detalhes das mudanças do header
- Atualizado `architeture.md`:
  - Seção 4 expandida com Design System completo
  - Seção 2.1 nova documentando Header
  - Seção 6.2 expandida com detalhes dos hooks
  - Wireframe ASCII atualizado
  - Changelog e Roadmap atualizados

### 📁 Arquivos Modificados
- `src/styles/App.css` - Tema completo redesenhado
- `src/hooks/useAuth.ts` - Correções de loop infinito
- `src/hooks/useDeepLink.ts` - useRef para callback
- `src/components/Calculator.tsx` - Header simplificado + logo clicável
- `src/App.tsx` - Removido onLogout e signOut
- `public/images/onsite-club-logo.png` - Logo adicionado

### 📝 Arquivos Criados
- `COLOR_THEME.md` - Documentação de cores
- `HEADER_CHANGES.md` - Documentação do header
- `CHANGELOG.md` - Este arquivo

---

## v3.0 - Sistema Mapeado Completo

Sistema mapeado completo (Core + Hooks + UI + Auth + Voz + Paywall), regras anti-duplicação formalizadas.

---

## Como Usar Este Changelog

- Antes de fazer alterações, consulte o changelog para entender decisões anteriores
- Ao adicionar features, documente aqui as mudanças
- Inclua links para arquivos de documentação relacionados
- Use emojis para categorizar: 🎨 Design, 🐛 Bug, 📚 Docs, ✨ Feature, ⚡️ Performance
