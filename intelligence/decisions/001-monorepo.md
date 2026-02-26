# ADR-001: Consolidacao em Monorepo (Turborepo)

**Status:** Aceito
**Data:** 2026-02-01
**Decisores:** Cris (Fundador), Blue (Orchestrator Agent)

---

## Contexto

O ecossistema OnSite Club cresceu para incluir multiplos apps e pacotes:

- **Apps:** Timekeeper Mobile, Timekeeper Web, Calculator, Shop, Eagle, Analytics, Auth
- **Packages:** UI components, Supabase client, configs compartilhados
- **Repos separados:** Cada app em seu proprio repositorio

### Problemas do Modelo Multi-Repo

1. **Duplicacao de codigo:** Mesmo componente copiado entre repos
2. **Versoes inconsistentes:** Dependencias em versoes diferentes
3. **Sincronizacao dificil:** Mudanca em package compartilhado exige PRs em N repos
4. **Contexto fragmentado:** Documentacao espalhada
5. **CI/CD complexo:** Pipelines separados por repo
6. **Onboarding lento:** Novo dev precisa clonar/configurar multiplos repos

---

## Decisao

**Consolidar todos os projetos em um unico monorepo usando Turborepo.**

### Estrutura Escolhida

```
onsite-eagle/
├── apps/
│   ├── timekeeper/        # React Native (Expo)
│   ├── calculator/        # React Native
│   ├── field/             # Expo
│   ├── monitor/           # Next.js
│   ├── analytics/         # Next.js
│   ├── auth-app/          # Next.js
│   └── dashboard/         # Next.js
├── packages/
│   ├── ui/                # Shared UI (React Native + Web)
│   ├── supabase/          # Client + types + hooks
│   └── config/            # ESLint, TypeScript, Tailwind
├── intelligence/          # Documentacao central
├── supabase/
│   └── migrations/        # Schema SQL (source of truth)
├── CLAUDE.md              # Contexto para Claude
└── package.json           # Turborepo workspaces
```

---

## Alternativas Consideradas

### Alternativa 1: Manter Multi-Repo

**Pros:**
- Independencia de deploy
- CI/CD isolado
- Permissoes granulares

**Cons:**
- Todos os problemas mencionados acima
- Nao escala bem com equipe pequena

**Decisao:** Rejeitado

### Alternativa 2: Nx

**Pros:**
- Features mais avancadas que Turborepo
- Melhor suporte a monorepos grandes

**Cons:**
- Curva de aprendizado maior
- Mais complexo para setup inicial
- Overkill para nosso tamanho

**Decisao:** Rejeitado (podemos migrar no futuro se necessario)

### Alternativa 3: Lerna

**Pros:**
- Maduro, bem documentado

**Cons:**
- Menos performante
- Menos integrado com ferramentas modernas
- Nx adquiriu Lerna (futuro incerto)

**Decisao:** Rejeitado

---

## Consequencias

### Positivas

1. **Codigo compartilhado real:** Um `packages/ui` para todos
2. **Versoes sincronizadas:** Todas as deps na mesma versao
3. **Atomic changes:** Um PR muda app + package juntos
4. **Contexto unificado:** CLAUDE.md + intelligence/ em um lugar
5. **CI/CD simplificado:** Um workflow, builds afetados por mudanca
6. **Onboarding rapido:** `git clone` + `npm install` + pronto

### Negativas

1. **Repo grande:** Clone inicial mais pesado
2. **Conflitos de merge:** Mais frequentes em monorepo
3. **Permissions:** Todos tem acesso a todo o codigo
4. **Build time:** Pode aumentar (mitigado por Turborepo cache)

### Mitigacoes

| Problema | Mitigacao |
|----------|-----------|
| Repo grande | Shallow clone, git sparse-checkout |
| Conflitos | Conventional commits, areas de ownership |
| Permissions | CODEOWNERS, branch protection |
| Build time | Turborepo remote cache (Vercel) |

---

## Implementacao

### Fase 1: Setup (Concluido)
- [x] Criar repo onsite-eagle
- [x] Configurar Turborepo
- [x] Definir estrutura de pastas
- [x] Configurar workspaces

### Fase 2: Migracao de Apps
- [ ] Migrar timekeeper-mobile
- [ ] Migrar calculator
- [ ] Migrar analytics
- [ ] Migrar auth-app

### Fase 3: Packages Compartilhados
- [ ] Extrair packages/ui
- [ ] Extrair packages/supabase
- [ ] Extrair packages/config

### Fase 4: CI/CD
- [ ] Configurar GitHub Actions
- [ ] Configurar Vercel para apps Next.js
- [ ] Configurar EAS para apps Expo

---

## Referencias

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Monorepo vs Multi-repo](https://monorepo.tools)
- [Vercel Monorepos Guide](https://vercel.com/docs/monorepos)

---

*Ultima atualizacao: 2026-02-01*
