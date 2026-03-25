# OnSite Club — UI Prompt

> Cole este prompt ao pedir para uma IA estilizar qualquer app do ecossistema OnSite.

---

You are restyling a mobile app that belongs to the OnSite Club ecosystem. Apply the following design system exactly. Do not invent new colors, do not use green as accent, do not add features — only restyle what exists.

## Color Tokens

### Neutrals (90% of the UI)

```
Background:          #F5F5F4   (warm stone canvas)
Cards/Modals:        #FFFFFF
Inputs/Muted:        #F5F5F4
Dark surface:        #2A2A2A   (high-contrast bars, totals, dark pills)

Text primary:        #1A1A1A
Text secondary:      #888884   (labels, descriptions)
Placeholder:         #B0AFA9
Icon muted:          #B0AFA9

Border:              #D1D0CE   (cards, dividers)
Border light:        #E5E5E3   (subtle separators)
```

### Brand Accent — Amber (10% of the UI)

```
Primary:             #C58B1B   (buttons, active states, selected indicators)
Primary strong:      #A67516   (hover, emphasis)
Primary pressed:     #8F6513
Primary soft bg:     #FFF3D6   (tinted backgrounds, switch track ON)
Primary line:        #F2D28B   (amber borders)
```

### Feedback (use sparingly)

```
Success:             #16A34A   (only for success badges/icons, NEVER as primary accent)
Success bg:          #D1FAE5
Error:               #DC2626
Error bg:            rgba(220, 38, 38, 0.12)
Warning:             #C58B1B   (same as amber)
Info:                #3B82F6   (rare, links only)
```

### Overlay

```
Overlay dark:        rgba(26, 26, 26, 0.6)
Overlay light:       rgba(26, 26, 26, 0.4)
```

## Layout Rules

```
Page background:     #F5F5F4
Card background:     #FFFFFF, border 0.5px #D1D0CE, radius 14px
Button min-height:   52px
Button radius:       14px
Input radius:        14px
Input border:        0.5px #D1D0CE, focus border #C58B1B
Border width:        Always 0.5px (hairline), never 1px+
Shadow color:        #1A1A1A (warm), opacity 0.06-0.10
```

## Buttons

```
Primary:     bg #C58B1B, text #FFFFFF, no border
Secondary:   bg #FFFFFF, text #888884, border 0.5px #D1D0CE
Danger:      bg #DC2626, text #FFFFFF
Disabled:    bg #F5F5F4, text #B0AFA9
Ghost/Text:  bg transparent, text #C58B1B
```

## Typography

```
Screen title:     28px, weight 700, #1A1A1A
Card title:       15px, weight 600, #1A1A1A
Body:             15px, weight 400-500, #1A1A1A
Label:            13px, weight 500, #888884
Section header:   11px, weight 600, uppercase, letter-spacing 0.5, #888884
Meta/small:       12px, weight 400, #888884
Tab label:        11px, active #1A1A1A weight 600, inactive #9CA3AF weight 500
```

## Spacing

```
xs: 4    sm: 8    md: 16    lg: 24    xl: 32    xxl: 48
```

## Border Radius

```
sm: 10    md: 14    lg: 18    xl: 24    full: 9999
```

## Component Patterns

### Tab Bar
- Background `#FFFFFF`, border-top `0.5px #E5E5E3`
- Active: text `#1A1A1A`, weight 600, 4px amber dot (`#C58B1B`) below label
- Inactive: text `#9CA3AF`, weight 500

### Switches
- Track OFF: `#D1D0CE`, thumb `#FFFFFF`
- Track ON: `#FFF3D6`, thumb `#C58B1B`

### Radio Buttons
- Outer: 22px, 2px border `#D1D0CE`
- Selected outer: border `#C58B1B`
- Inner dot: 12px, `#C58B1B`

### Grouped Table View (settings/list screens)
- Section header: 11px uppercase, weight 600, `#888884`, letter-spacing 0.5
- Card: `#FFFFFF`, radius 14px, border 0.5px `#D1D0CE`
- Row: min-height 52px, text 15px weight 500, icon `#C58B1B`, chevron `#B0AFA9`
- Separator: 0.5px `#E5E5E3`, left margin 52px

### Dark Surface Elements
- Background `#2A2A2A`, text `#FFFFFF`, accent `#C58B1B`, muted `#9CA3AF`

### Bar Charts
- Filled bar: `#C58B1B`, empty bar: `#E5E5E3`, today: `#A67516`

## Strict Rules

1. Amber (`#C58B1B`) is the ONLY accent color — no green, no blue, no teal as primary
2. Green (`#16A34A`) exists ONLY for success feedback badges — never for buttons or highlights
3. All borders are `0.5px` — never `1px` or thicker (except error states: `2px`)
4. All interactive buttons: min-height `52px`, border-radius `14px`
5. Page background is always `#F5F5F4` (warm stone) — never cold gray
6. Shadow color is `#1A1A1A` — never pure black `#000000`
7. Text is `#1A1A1A` — never pure black `#000000`
8. No emojis in UI unless explicitly requested
9. Worker-first language: "Your hours", "Save", "Export" — not corporate jargon
10. Do not add features, refactor logic, or change functionality — only restyle
