# Tema de Cores - OnSite Calculator

## 🎨 Paleta de Cores - Minimalista Dashboard

### Cores Base (Reports Dashboard Style)
- **App Background**: `#F6F8FB` - Cinza frio muito claro
- **Header**: `#FFFFFF` - Branco puro
- **Cards**: `#FFFFFF` - Branco com sombra sutil
- **Superfície Secundária**: `#EEF2F6` - Cinza claro (inputs, botões)
- **Superfície Terciária**: `#E6ECF2` - Cinza claro escuro (hover)
- **Bordas/Divisores**: `#D9E1EA` - Cinza azulado sutil

### Cores de Texto
- **Texto Principal**: `#0E1A2A` - Navy profundo
- **Texto Secundário**: `#5C6B7A` - Cinza azulado
- **Texto Placeholder**: `#9AA7B5` - Cinza claro
- **Texto Memory**: `#5C6B7A` - Cinza azulado

### Acento Principal (Teal Escuro)
- **Teal Accent**: `#0F3D3A` - Usado APENAS no botão = e listening state
- **Teal Pressed**: `#0B2F2C` - Hover do botão =

### Destaque Sutil (Selection Yellow)
- **Selection Outline**: `#E6B84A` - Usado apenas no focus do input
- **Selection Fill**: `#FBF3DD` - Fundo do outline
- **Offline Badge**: `#8B2B2B` (texto) com fundo `#FBF3DD`

### Cores Destrutivas (Subtle)
- **Vermelho Sutil**: `#8B2B2B` - Texto dos botões C, Backspace, %

## 📐 Aplicação por Componente

### Display
- Background: `#EEF2F6`
- Border: `#D9E1EA`
- Texto: `#0E1A2A`
- Texto Recording: `#0F3D3A`
- Texto Processing: `#5C6B7A`

### Expression Input
- Background: `#FFFFFF`
- Border: `#D9E1EA`
- Border Focus: `#E6B84A` com shadow `#FBF3DD`
- Texto: `#0E1A2A`
- Placeholder: `#9AA7B5`

### Botão de Voz
- Background (Idle): `#EEF2F6`
- Border (Idle): `#D9E1EA`
- Texto (Idle): `#0E1A2A`
- Background (Listening): `#0F3D3A`
- Border (Listening): `#0F3D3A`
- Texto (Listening): `#FFFFFF`

### Container de Frações
- Background: `#EEF2F6`
- Border: `#D9E1EA`

### Botões de Frações
- Background: `#FFFFFF`
- Border: `#D9E1EA`
- Texto: `#0E1A2A`
- Hover: `#E6ECF2`

### Botão 'ft
- Background: `#EEF2F6`
- Border: `#D9E1EA`
- Texto: `#0E1A2A`
- Hover: `#E6ECF2`

### Botões Numéricos (0-9, .)
- Background: `#EEF2F6`
- Border: `#D9E1EA`
- Texto: `#0E1A2A`
- Hover: `#E6ECF2`

### Botões de Operação (÷, ×, +, -)
- Background: `#E6ECF2` (levemente mais escuro)
- Border: `#D9E1EA`
- Texto: `#0E1A2A`
- Hover: `#E6ECF2` (mesmo tom)

### Botões de Controle (C, Backspace, %)
- Background: `#EEF2F6`
- Border: `#D9E1EA`
- Texto: `#8B2B2B` (vermelho sutil)
- Hover: `#E6ECF2`

### Botão Igual (=)
- Background: `#0F3D3A` (teal escuro - ÚNICO botão colorido)
- Border: `#0F3D3A`
- Texto: `#FFFFFF`
- Hover: `#0B2F2C`

### Header Badges
- **User Badge**:
  - Background: `#EEF2F6`
  - Border: `#D9E1EA`
  - Texto: `#5C6B7A`

- **Offline Badge**:
  - Background: `#FBF3DD`
  - Border: `#E6B84A`
  - Texto: `#8B2B2B`

## 📋 Notas de Implementação

### Filosofia do Design:
- **Monocromático Premium**: Visual extremamente limpo e profissional
- **Acento Único**: Apenas o teal escuro `#0F3D3A` é usado como cor de destaque
- **Baixo Contraste**: Paleta calma e suave para uso prolongado
- **Zero Saturação Alta**: Sem cores vibrantes ou chamativas
- **Estilo Dashboard**: Visual corporativo, sério, para ambiente profissional

### Hierarquia Visual:
1. **Neutralidade Total**: Maioria dos botões em cinza claro neutro
2. **Operators Sutis**: Levemente mais escuros mas ainda neutros
3. **Destrutivos Sutis**: Apenas texto vermelho sutil, sem fundo colorido
4. **Acento Teal**: ÚNICO elemento com cor forte (botão =)
5. **Selection Yellow**: Apenas para feedback de focus

### Diferenças do Esquema Anterior:
- ❌ Removido: Amarelo vibrante `#FDB913`
- ❌ Removido: Azul petróleo OnSite `#2C5F5D` dos operadores
- ❌ Removido: Verde profissional `#059669`
- ❌ Removido: Vermelho forte `#DC2626`
- ✅ Adicionado: Paleta monocromática cinza
- ✅ Adicionado: Teal escuro `#0F3D3A` como único acento
- ✅ Adicionado: Amarelo sutil `#E6B84A` apenas para selection

### Acessibilidade:
- Alto contraste text/background mantido
- Textos em navy escuro `#0E1A2A` para máxima legibilidade
- Bordas sutis mas visíveis `#D9E1EA`
- Shadow box muito suave `rgba(0, 0, 0, 0.05)`

### Uso Ideal:
- Calculadora profissional para ambiente de trabalho
- Dashboard corporativo
- Aplicações de produtividade
- Ferramentas de negócios
- Apps que precisam parecer sérios e confiáveis

**Este esquema elimina qualquer aparência "infantil" ou "colorida" mantendo um visual extremamente profissional e minimalista.**
