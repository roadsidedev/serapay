---
name: Pocket Sera
description: Self-custodial stablecoin command center for Ethereum and Sera
colors:
  primary: "#7161DF"
  primary-soft: "rgba(113, 97, 223, 0.12)"
  primary-highlight: "#B8B0FF"
  dark-background: "oklch(0.08 0 0)"
  dark-card: "oklch(0.115 0 0)"
  near-black-purple: "#0B0912"
  light-background: "oklch(0.985 0 0)"
  white: "#FFFFFF"
  black: "#000000"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  display-medium:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.14em"
rounded:
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1rem"
  button-primary-hover:
    backgroundColor: "#6656D4"
  surface-glass:
    backgroundColor: "rgba(27, 21, 54, 0.78)"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  nav-pill:
    backgroundColor: "rgba(11, 9, 18, 0.72)"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "0.375rem"
---

# Design System: Pocket Sera

## Overview

**Creative North Star: "The Violet Control Room"**

Pocket Sera is a focused operating surface for a self-custodial stablecoin wallet. The visual language uses deep indigo light, quiet translucent surfaces, and precise controls to make financial state feel calm and legible rather than noisy or speculative. Purple is reserved for active intent: navigation, primary actions, focus, and meaningful status.

The system is intentionally low-copy. Surfaces should explain themselves through hierarchy, familiar iconography, state changes, and direct manipulation. Liquid-glass layers create separation without turning the interface into a stack of opaque boxes; depth comes from blur, tonal gradients, thin translucent borders, and restrained purple glow.

**Key Characteristics:**
- Deep-purple intent color with dark neutral foundations
- Translucent, blurred surfaces with gentle internal highlights
- Mobile-first pill navigation and compact account controls
- Dense but breathable operating layout
- Direct action over instructional helper text

## Colors

The palette is a deep neutral canvas energized by a single violet-indigo accent. The accent should feel scarce enough to signal intent, not become wallpaper.

### Primary
- **Deep Pocket Violet** (`#7161DF`): Primary actions, selected tabs, active navigation, focus, and intentional status.
- **Violet Highlight** (`#B8B0FF`): Secondary emphasis, live indicators, and icon detail on dark glass.
- **Soft Violet Wash** (`rgba(113, 97, 223, 0.12)`): Icon wells, selected-state halos, and low-intensity surface tint.

### Neutral
- **Ink Black** (`#000000`): Strong contrast, dialogs, and icon contrast on light surfaces.
- **Night Canvas** (`oklch(0.08 0 0)`): Primary dark-mode application background.
- **Night Surface** (`oklch(0.115 0 0)`): Card and popover foundation beneath glass treatment.
- **Near-Black Purple** (`#0B0912`): Isolated sandbox and reduced-transparency fallback background.
- **Paper Canvas** (`oklch(0.985 0 0)`): Light-mode application background.
- **White** (`#FFFFFF`): High-emphasis dark-theme type, primary control foreground, and fallback avatar contrast.

**The Violet Intent Rule.** Use `#7161DF` for actions and state, not for every decorative edge. Keep the strongest glow around active or interactive elements.

## Typography

**Display Font:** Manrope, sans-serif
**Body Font:** Manrope, sans-serif
**Label/Mono Font:** System monospace for addresses, quantities, and transaction-like values.

**Character:** Manrope gives the interface a compact, contemporary operating feel with enough warmth for a social wallet. Weight and spacing do most of the hierarchy work; avoid adding extra copy or ornamental typographic treatments.

### Hierarchy
- **Display** (600, `clamp(2rem, 5vw, 3rem)`, 1.1): Page titles and major account values.
- **Display Medium** (600, `1.75rem`, 1.15): Embedded preview values and compact high-emphasis numbers.
- **Title** (600, `1rem`, 1.35): Surface titles, asset symbols, and account identity.
- **Body** (400, `0.875rem`, 1.45): Supporting descriptions and operational labels.
- **Caption** (400, `0.75rem`, 1.4): Supporting descriptions and timestamps.
- **Micro** (600, `0.625rem`, 1.3, `0.04em` tracking): Dense metadata and live status labels.
- **Label** (600, `0.6875rem`, 1.3, `0.14em` tracking): Section eyebrows and navigation metadata.

**The Short-Line Rule.** Keep explanatory text short enough to scan on mobile. Prefer one useful sentence over stacked helper paragraphs.

## Layout

The application uses a desktop rail plus flexible content region and switches to a bottom navigation pill below the desktop breakpoint. Content is centered in bounded containers, with wider wallet surfaces and narrower Account content for scanability.

Use a compact rhythm built from roughly 8px, 12px, 16px, 24px, and 32px steps. Mobile surfaces should use 16px edge gutters, generous bottom clearance for the fixed navigation pill, and horizontal scrolling only for intentionally carousel-like market or asset rows. Tabs should remain visible and thumb-friendly without wrapping into a second row.

## Elevation & Depth

Pocket Sera uses a layered hybrid: tonal background differences establish the base hierarchy, while liquid glass adds blur, saturation, and subtle lift. Shadows are ambient rather than structural. A purple glow belongs to active controls, glass navigation, and high-value focus points; inactive surfaces should remain quiet.

### Shadow Vocabulary
- **Glass ambient:** `0 18px 50px rgba(0, 0, 0, 0.22)` for large glass surfaces.
- **Navigation lift:** `0 18px 48px rgba(0, 0, 0, 0.38)` for the bottom navigation pill.
- **Accent lift:** `0 8px 22px rgba(113, 97, 223, 0.28)` for selected actions and tabs.

**The Transparent Layer Rule.** Do not turn every region into an opaque card. Use blur and tonal layering to preserve a sense of a continuous workspace.

## Shapes

The shape language is gently rounded and tactile. Small controls use approximately 12px corners, major surfaces use approximately 24px corners, and persistent navigation uses a full pill silhouette. Borders are thin, translucent, and usually white-on-dark or purple-tinted for active elements.

## Components

### Buttons
- **Shape:** Gently rounded controls (`12px` typical; pill for sign-in and account actions).
- **Primary:** Deep Pocket Violet background, white foreground, compact horizontal padding, and restrained purple ambient lift.
- **Hover / Focus:** Darken the violet slightly on hover, preserve visible focus outlines, and use a subtle translation or glow rather than a large scale jump.
- **Secondary / Ghost:** Transparent or glass-backed with muted text, becoming violet-tinted on hover or active state.

### Cards / Containers
- **Corner Style:** 24px for major surfaces; 16px for nested controls.
- **Background:** Liquid-glass gradient with translucent white and violet layers over a dark or light neutral canvas.
- **Shadow Strategy:** Ambient shadow plus inset highlight; avoid heavy borders and stacked shadows.
- **Border:** Thin translucent border, violet-tinted for identity-bearing or active surfaces.
- **Internal Padding:** 16px on mobile, 20–32px on wider surfaces.

### Inputs / Fields
- **Style:** Dark translucent field with a quiet border and 12px radius.
- **Focus:** Violet border/ring with a readable contrast shift.
- **Error / Disabled:** Use explicit error text and muted disabled contrast without hiding the control’s purpose.

### Navigation
- **Desktop:** A compact vertical rail with icon-plus-label items; the active state is a violet rounded rectangle.
- **Mobile:** A fixed, bottom-safe-area pill with glass blur, three equal navigation destinations, and violet active state.
- **Account:** Use a descriptive circular profile icon rather than a generic settings symbol.

### Live Market Card
The Live FX card uses a live dot, updated timestamp, horizontal overflow on narrow screens, and real Sera market data. The live marker is informational and should never imply data freshness beyond the actual polling contract.

## Do's and Don'ts

### Do:
- **Do** use `#7161DF` as the single strong intent accent.
- **Do** keep navigation, account editing, and primary actions immediately recognizable.
- **Do** use semantic labels and visible focus states for icon-only controls.
- **Do** preserve the liquid-glass blur and tonal layering across related surfaces.
- **Do** verify narrow-width behavior and safe-area spacing before shipping.

### Don't:
- **Don't** add helper copy when hierarchy and control labels already explain the action.
- **Don't** use generic gear icons for the Account destination.
- **Don't** fake live market values or label stale data as live.
- **Don't** let glass effects reduce text contrast or obscure focus.
- **Don't** create dense desktop layouts that collapse into unreadable mobile rows.
