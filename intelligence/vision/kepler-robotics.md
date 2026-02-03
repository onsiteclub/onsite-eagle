# Kepler Robotics — Estrategia 2028-2030

> *"O 'olho treinado' de um carpinteiro, agora em um robo."*

---

## A Tese

**Em 10 anos, robos humanoides + trabalhadores humanos serao mais baratos e versateis que impressao 3D ou pre-fabricacao para construcao residencial.**

A construcao residencial exige flexibilidade: cada lote e diferente, cada cliente quer algo unico, imprevistos acontecem. Robos rigidos e fabricas de pre-fab nao conseguem lidar com essa variabilidade.

Robos humanoides, por outro lado:
- Podem usar as mesmas ferramentas que humanos
- Navegam canteiros de obra irregulares
- Adaptam-se a situacoes inesperadas
- Trabalham lado a lado com humanos

**O diferencial:** O que torna um carpinteiro experiente valioso e o "olho treinado" — saber olhar para uma obra e ver o que esta certo e errado. Prumo AI da esse olho a um robo.

---

## Por Que Kepler K2

### O Mercado de Robos Humanoides (2025)

| Robo | Empresa | Preco | Disponibilidade | SDK |
|------|---------|-------|-----------------|-----|
| Optimus | Tesla | ~$20k (est) | 2026+ | Fechado |
| Atlas | Boston Dynamics | Nao vende | Pesquisa apenas | Fechado |
| Figure 01 | Figure | ~$50k (est) | 2025 | Parcialmente aberto |
| Digit | Agility | ~$100k | 2025 | Enterprise |
| **K2 Bumblebee** | **Kepler** | **~$45k** | **2025 (em producao)** | **Aberto** |

### Kepler K2 "Bumblebee" — Especificacoes

```
┌─────────────────────────────────────────────┐
│           KEPLER K2 "BUMBLEBEE"             │
├─────────────────────────────────────────────┤
│  Altura:        178 cm                      │
│  Peso:          85 kg                       │
│  Payload:       30 kg (maos)                │
│  Bateria:       8 horas                     │
│  Velocidade:    7 km/h                      │
│  Maos:          12 DoF cada                 │
│  Cameras:       RGB-D + stereo              │
│  Sensores:      IMU, force/torque, LiDAR    │
├─────────────────────────────────────────────┤
│  Preco:         CA$45k (RMB 248,000)        │
│  Producao:      Massa (Shanghai)            │
│  SDK:           Aberto, Python/C++          │
│  Modelos AI:    Suporta .onnx customizado   │
└─────────────────────────────────────────────┘
```

### Por Que Kepler e Nao Tesla

| Aspecto | Tesla Optimus | Kepler K2 |
|---------|--------------|-----------|
| Ecossistema | Fechado (Apple-like) | Aberto (Android-like) |
| SDK | Nao disponivel | Developer platform |
| Modelos AI | Tesla FSD apenas | Qualquer .onnx |
| Preco | ~$20k (estimado) | ~$45k (confirmado) |
| Disponibilidade | 2026+ (especulacao) | 2025 (em producao) |
| Uso externo | Provavelmente proibido | Permitido |

**Analogia:** Tesla Optimus e como iPhone — otimo, mas voce usa o que eles deixam. Kepler e como Android — voce carrega o modelo que quiser.

---

## O Que Kepler Pode Fazer Hoje (2025)

### Tarefas Viaveis
- [x] Carregar materiais (30kg max)
- [x] Organizar ferramentas e pecas
- [x] Segurar pecas enquanto humano trabalha
- [x] Limpar debris e entulho
- [x] Patrulhar e monitorar (cameras)
- [x] Transportar itens entre pontos

### Tarefas em Desenvolvimento
- [ ] Usar ferramentas eletricas simples
- [ ] Pintura basica
- [ ] Instalacao de isolamento

### Tarefas Futuras (Requerem Prumo AI)
- [ ] Inspecao visual automatizada
- [ ] Identificacao de erros estruturais
- [ ] Sugestao de correcoes
- [ ] Acabamento de qualidade

---

## Roadmap de Integracao

### 2025-2026: Preparacao

```
[Prumo Data Collection]
        │
        ▼
[Anotacao + Validacao]
        │
        ▼
[Modelo .onnx treinado]
```

- Focar na coleta de dados via Eagle/Calculator/Timekeeper
- Anotar fotos com categorias de erro
- Treinar modelos de classificacao

### 2027: Primeiro Teste

```
[Kepler K2 adquirido]
        │
        ▼
[Prumo v1 carregado via USB/WiFi]
        │
        ▼
[Teste em ambiente controlado]
```

- Adquirir primeira unidade Kepler K2
- Carregar modelo Prumo v1 (classificacao de materiais)
- Testar em obra simulada (warehouse)

### 2028: Piloto em Obra Real

```
[Kepler em obra real]
        │
        ▼
[Tarefas: carregar + organizar + monitorar]
        │
        ▼
[Humano valida deteccoes]
```

- Primeiro deployment em obra real
- Tarefas: logistica + monitoramento
- Trabalhadores humanos supervisionam
- Feedback loop para melhorar modelo

### 2029-2030: Escala

```
[Multiplos Keplers]
        │
        ▼
[Tarefas expandidas]
        │
        ▼
[Human-robot collaboration]
```

- Fleet de robos em multiplas obras
- Tarefas mais complexas (ferramentas basicas)
- Modelo ROI comprovado

---

## Tarefas de Construcao — Viabilidade

### Curto Prazo (2025-2027)

| Tarefa | Dificuldade | Kepler Ready? |
|--------|-------------|---------------|
| Carregar 2x4s | Baixa | Sim |
| Organizar pregos/parafusos | Baixa | Sim |
| Segurar drywall | Media | Sim (com treino) |
| Limpar area | Baixa | Sim |
| Monitorar progresso | Baixa | Sim |

### Medio Prazo (2027-2029)

| Tarefa | Dificuldade | Requer |
|--------|-------------|--------|
| Identificar erros | Media | Prumo v1 |
| Usar parafusadeira | Media | Treino de manipulacao |
| Pintura basica | Media | Controle de braco |
| Colocar isolamento | Media | Destreza |

### Longo Prazo (2029+)

| Tarefa | Dificuldade | Requer |
|--------|-------------|--------|
| Acabamento fino | Alta | Prumo v2+ |
| Eletrica basica | Alta | Safety protocols |
| Framing | Alta | Forca + precisao |
| Decisoes autonomas | Alta | AGI-lite |

---

## Modelo de Negocio

### Opcao A: Robot-as-a-Service

```
Cliente paga mensalidade
        │
        ▼
OnSite fornece Kepler + Prumo + suporte
        │
        ▼
ROI: menos trabalhadores para logistica
```

- Mensalidade: CA$2000-3000/mes
- Inclui: robo, manutencao, updates de AI
- Target: empreiteiras medias (10-50 funcionarios)

### Opcao B: Prumo AI License

```
Cliente compra proprio Kepler
        │
        ▼
OnSite licencia Prumo AI
        │
        ▼
Updates mensais de modelo
```

- License: CA$500/mes
- Cliente e dono do hardware
- OnSite fornece software + updates

### Opcao C: Hybrid (Preferido)

```
OnSite opera fleet propria
        │
        ▼
Aluga para obras especificas
        │
        ▼
Coleta dados para melhorar Prumo
```

- Aluguel diario/semanal
- OnSite mantem controle dos dados
- Fleet cresce conforme demanda

---

## Calculo de ROI

### Custo de Trabalhador Junior (Helper)

| Item | Valor Mensal |
|------|--------------|
| Salario | CA$3500 |
| Beneficios | CA$700 |
| WSIB | CA$350 |
| Overhead | CA$450 |
| **Total** | **CA$5000** |

### Custo de Kepler (amortizado)

| Item | Valor Mensal |
|------|--------------|
| Hardware (CA$45k / 36 meses) | CA$1250 |
| Manutencao | CA$300 |
| Energia | CA$50 |
| Prumo License | CA$500 |
| **Total** | **CA$2100** |

### ROI

```
Economia = CA$5000 - CA$2100 = CA$2900/mes
ROI = 58%
Payback = 15 meses
```

**Nota:** Robo nao substitui trabalhador — libera ele para tarefas que exigem skill.

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Regulacao trabalhista | Media | Alto | Posicionar como assistente, nao substituto |
| Resistencia sindical | Media | Medio | Parceria com sindicatos para treinamento |
| Falha tecnica em obra | Media | Alto | Seguros, protocolos de safety |
| Kepler descontinuado | Baixa | Alto | Diversificar fornecedores |
| Prumo nao funciona | Baixa | Alto | Testes extensivos antes de deploy |

---

## Proximos Passos (2025-2026)

1. [ ] Continuar coleta de dados via apps
2. [ ] Atingir 100k fotos anotadas
3. [ ] Treinar Prumo v0.1 (proof of concept)
4. [ ] Contato inicial com Kepler para developer program
5. [ ] Visita a Shanghai para ver producao
6. [ ] Definir parceiro de teste (empreiteira)

---

## Referencias

- [Kepler Robotics Official](https://www.keplerrobotics.com)
- [Kepler K2 Developer Docs](https://docs.keplerrobotics.com) *(a confirmar)*
- [ONNX Runtime](https://onnxruntime.ai)
- [Tesla Optimus](https://www.tesla.com/optimus)
- [Boston Dynamics Atlas](https://www.bostondynamics.com/atlas)

---

*Ultima atualizacao: 2026-02-01*
