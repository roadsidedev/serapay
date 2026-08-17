# Impeccable Extract Pass

## Design system found

SeraPay already has a shared UI primitive library under `client/src/components/ui`, global CSS tokens in `client/src/index.css`, and a semantic primary color driven through the `--primary`, `--accent`, `--ring`, and liquid-glass utility classes. No new generic design-system package is needed.

## Reusable patterns confirmed

| Pattern | Existing source | Decision |
|---|---|---|
| Primary/outline/ghost buttons | `client/src/components/ui/button.tsx` | Keep the shared primitive; let CSS variables carry the purple accent. |
| Liquid-glass surface | `client/src/index.css` plus Home, Explore, and Account | Keep as the shared `.liquid-glass` class; do not create one-off card variants. |
| Glass navigation control | Home shell and Account/Explore tabs | Keep `.glass-nav` and `.glass-control`; use pill shape only for navigation and compact selectors. |
| Compact section heading | Account and tabbed surfaces | Continue using icon + title rows with semantic labels. |
| Live market card | `Home.tsx` `FxRatesCard` | Keep as a signature component; the live polling contract is real Sera market data. |
| Profile edit row | `AccountProfilePanel.tsx` | Keep as a focused product-specific pattern with accessible edit labels. |

## Token extraction

The durable tokens are Deep Sera Violet `#7161DF`, Violet Highlight `#B8B0FF`, dark and light neutral canvases, Manrope typography, 12px control radii, 24px surface radii, 8/12/16/24/32 spacing rhythm, glass ambient shadows, and the violet active-state lift. These are documented in `DESIGN.md` and `.impeccable/design.json`.

## Migration guidance

Future UI work should use the shared Button primitive and the existing liquid-glass/glass-control classes. Avoid adding a second accent color or another ad hoc glass recipe. Only extract a new React component when the same interaction appears in at least three places with the same intent.
