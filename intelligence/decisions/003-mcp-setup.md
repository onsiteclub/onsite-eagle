# ADR-003: Configuracao do MCP (Model Context Protocol)

**Status:** Aceito
**Data:** 2026-02-01
**Decisores:** Cris (Fundador), Blue (Orchestrator Agent)

---

## Contexto

Claude Code pode ser estendido com **MCP (Model Context Protocol)** — um protocolo que permite conectar ferramentas externas como servidores.

### O Que e MCP

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Claude Code │────▶│ MCP Server  │────▶│  External   │
│   (client)  │◀────│  (bridge)   │◀────│   Service   │
└─────────────┘     └─────────────┘     └─────────────┘
```

MCP permite que Claude:
- Acesse bancos de dados diretamente
- Tenha memoria persistente entre sessoes
- Execute queries SQL
- Leia/escreva em servicos externos

### Problema

Sem MCP, Claude precisaria:
1. Pedir ao usuario para rodar comandos SQL
2. Ler outputs colados no chat
3. Perder contexto entre sessoes
4. Nao ter acesso direto ao schema

---

## Decisao

**Configurar dois MCP servers no projeto:**

1. **Supabase MCP** — acesso direto ao banco de dados
2. **Memory MCP** — memoria persistente entre sessoes

### Configuracao Escolhida

```json
// .mcp.json (raiz do projeto)
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_..."
      }
    }
  }
}
```

---

## MCP Servers Escolhidos

### 1. Supabase MCP (`@supabase/mcp-server-supabase`)

**O que faz:**
- Lista tabelas do banco
- Executa queries SQL
- Aplica migrations
- Gera tipos TypeScript
- Acessa logs
- Gerencia Edge Functions

**Por que:**
- Acesso direto ao schema real
- Pode verificar se migration foi aplicada
- Pode debugar erros de query
- Elimina "telephone game" (dev → Claude → dev → Supabase)

**Ferramentas disponiveis:**
- `list_tables` — Lista todas as tabelas
- `execute_sql` — Executa query SQL
- `apply_migration` — Aplica migration
- `generate_typescript_types` — Gera tipos
- `get_logs` — Busca logs por servico
- `list_edge_functions` — Lista Edge Functions
- `deploy_edge_function` — Deploy de funcao

### 2. Memory MCP (`@modelcontextprotocol/server-memory`)

**O que faz:**
- Persiste informacoes entre sessoes
- Armazena decisoes, contexto, preferencias
- Cria um "cerebro" persistente

**Por que:**
- Claude esquece tudo ao fechar sessao
- Com memory, lembra de decisoes anteriores
- Pode acumular conhecimento sobre o projeto

**Ferramentas disponiveis:**
- `remember` — Salva informacao
- `recall` — Recupera informacao
- `forget` — Remove informacao
- `list_memories` — Lista memorias

---

## Alternativas Consideradas

### Alternativa 1: Apenas CLAUDE.md (sem MCP)

**Pros:**
- Simples, sem dependencias
- Funciona out-of-the-box

**Cons:**
- Sem acesso direto ao banco
- Sem memoria persistente
- Limitado a contexto estatico

**Decisao:** Insuficiente, manter CLAUDE.md + adicionar MCP

### Alternativa 2: PostgreSQL MCP generico

**Pros:**
- Funciona com qualquer Postgres

**Cons:**
- Nao tem features especificas do Supabase
- Nao gerencia Edge Functions
- Nao gera tipos

**Decisao:** Rejeitado, usar Supabase MCP oficial

### Alternativa 3: Apenas Supabase MCP (sem Memory)

**Pros:**
- Menos complexidade
- Menos config

**Cons:**
- Sem memoria persistente
- Perde conhecimento entre sessoes

**Decisao:** Rejeitado, Memory e valioso

---

## Consequencias

### Positivas

1. **Acesso direto:** Claude ve o schema real, nao documentacao desatualizada
2. **Debugging:** Pode rodar queries para investigar problemas
3. **Migrations:** Pode criar e aplicar migrations diretamente
4. **Memoria:** Lembra decisoes, preferencias, contexto
5. **Eficiencia:** Menos "copiar e colar" entre ferramentas

### Negativas

1. **Seguranca:** Token do Supabase no arquivo
2. **Dependencias:** Precisa de npx/npm funcionando
3. **Complexidade:** Mais uma coisa para configurar

### Mitigacoes

| Problema | Mitigacao |
|----------|-----------|
| Token exposto | `.mcp.json` no `.gitignore`, usar variavel de ambiente |
| npx lento | Primeira execucao baixa, depois usa cache |
| Config complexa | Documentar bem, template pronto |

---

## Seguranca

### Token do Supabase

O `SUPABASE_ACCESS_TOKEN` no `.mcp.json` tem acesso administrativo ao projeto.

**Recomendacoes:**
1. **NAO** commitar `.mcp.json` com token real
2. Usar variavel de ambiente: `"SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"`
3. Adicionar ao `.gitignore`
4. Cada dev gera seu proprio token

### Permissoes do Token

O token usado tem permissoes de:
- Leitura de schema
- Escrita de migrations
- Execucao de queries
- Deploy de Edge Functions

**Risco:** Se comprometido, atacante tem acesso total ao banco.

**Mitigacao:** Tokens rotativos, revogar se suspeitar de leak.

---

## Implementacao

### Passo 1: Criar .mcp.json

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_..."
      }
    }
  }
}
```

### Passo 2: Adicionar ao .gitignore

```gitignore
# MCP config com tokens
.mcp.json
```

### Passo 3: Criar template

```json
// .mcp.json.example (commitado)
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### Passo 4: Documentar

Adicionar instrucoes no README:
1. Copiar `.mcp.json.example` para `.mcp.json`
2. Gerar token em Supabase Dashboard
3. Substituir `YOUR_TOKEN_HERE`

---

## Uso

### Listar tabelas

Claude pode usar `mcp__supabase__list_tables` para ver todas as tabelas:

```
> list_tables schemas: ["public"]
```

### Executar query

Claude pode usar `mcp__supabase__execute_sql`:

```
> execute_sql query: "SELECT * FROM core_profiles LIMIT 5"
```

### Aplicar migration

Claude pode usar `mcp__supabase__apply_migration`:

```
> apply_migration name: "add_new_column" query: "ALTER TABLE ..."
```

### Lembrar algo

Claude pode usar `mcp__memory__remember`:

```
> remember key: "last_migration" value: "002_add_eagle_tables"
```

---

## Referencias

- [MCP Specification](https://spec.modelcontextprotocol.io)
- [Supabase MCP Server](https://github.com/supabase/mcp-server-supabase)
- [Memory MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)

---

*Ultima atualizacao: 2026-02-01*
