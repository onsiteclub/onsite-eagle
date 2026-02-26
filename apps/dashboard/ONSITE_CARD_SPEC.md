# OnSite Card — Spec do Cartao de Pagamento

> Extensao do DASHBOARD_SPEC.md | 2026-02-26
> Status: FASE 0 — Design e spec. Integracao real separada.

## Resumo

OnSite Card = cartao Visa/Mastercard real com marca OnSite Club.
No dashboard, sera UI funcional com dados mockados ate integracao com emissor.

## Stripe Issuing: NAO disponivel no Canada

Alternativas viaveis:

| Provedor | Canada | Nota |
|----------|--------|------|
| **Peoples Group** (Vancouver) | SIM | RECOMENDADO — maior emissor prepaid CA, CDIC |
| **Lithic** | SIM (desde Set/2024) | API developer-friendly, CAD |
| **Dash Solutions** | SIM | Ja foca em construcao |

Modelo: OnSite = program manager (marca/UX). Emissor = regulacao financeira.

## Casos de Uso

1. **Blades -> CAD** — Converter pontos em dinheiro real no cartao
2. **Payroll Card** — Imigrantes sem banco recebem salario no cartao
3. **Expense Card** — Empregador carrega para materiais/gasolina com limites por MCC
4. **Desconto automatico** — Tim Hortons, Home Depot reconhecidos por MCC
5. **Dados Prumo** — Cada transacao = dado de consumo do setor

## Design Fisico

- Frente: Logo OnSite + tier badge + nome + trade + OSC code + chip NFC
- Verso: "Wear what you do!" + QR code + onsiteclub.ca
- Variantes: Free (basico), Pro (prata), Club (dourado)
- Cores: Teal #0F766E fundo, texto branco

## Dashboard: /club/wallet (fake/mockup)

Pagina mostra:
- Visualizacao do cartao virtual (estatico)
- Saldo fake ($0.00 — "Disponivel em breve")
- Acoes: Carregar, Converter Blades, Congelar, Extrato (todas disabled)
- Banner: "OnSite Card chegando em Q4 2026 — Entre na lista de espera"
- Formulario de waitlist (nome, email, trade)

## Tabelas (criar quando integrar — NAO agora)

Prefixo crd_:
- crd_cardholders — vinculo user <-> emissor
- crd_cards — cartoes virtual/fisico
- crd_transactions — transacoes
- crd_blades_ledger — ledger de Blades (ganho/gasto/conversao)
- crd_funding_events — cargas no cartao

## Regulatorio

- FINTRAC MSB (gratis, obrigatorio)
- KYC pelo emissor (Peoples/Lithic)
- PCI DSS pelo emissor (OnSite nunca ve numero completo)
- OnSite NAO precisa ser banco

## Timeline

| Fase | Quando | O que |
|------|--------|-------|
| 0 | Agora | UI mockada no dashboard + waitlist |
| 1 | Q2 2026 | Contato Peoples Group + Lithic |
| 2 | Q3 2026 | Contrato + integracao tecnica + piloto 10 |
| 3 | Q4 2026 | Piloto 100 workers + cartao fisico |
| 4 | Q1 2027 | Lancamento geral |

## Impacto

- SaaS atual: ~$15/user/mes
- Com cartao: ~$45/user/mes (interchange + subscription)
- 1000 workers = ~$540k/ano
- Triplica receita por usuario
