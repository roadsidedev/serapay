---
target: client/src/pages/Home.tsx
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-17T12-23-01Z
slug: client-src-pages-home-tsx
---
⚠️ DEGRADED: single-context (no sub-agent tool exposed in this session)

# SeraPay Frontend Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Live rates, loading, and account tabs are visible; some async errors remain toast-first rather than local to the control. |
| 2 | Match System / Real World | 3 | Wallet, Explore, Earn, Activity, and Account language is natural; Sera credential and mini-app developer terms still assume some domain knowledge. |
| 3 | User Control and Freedom | 3 | Dialogs and sign-out confirmation provide exits; some transaction and developer flows could expose clearer cancel/reset actions. |
| 4 | Consistency and Standards | 3 | The accent/glass system is coherent in the main shell, but older surfaces still carry hard-coded white/black styles. |
| 5 | Error Prevention | 3 | Wallet signatures and image uploads validate inputs; transaction preparation can still be made more explicit before signing. |
| 6 | Recognition Rather Than Recall | 3 | Modern labeled navigation and tabbed Account are strong; Sera access status and mini-app state could be more discoverable. |
| 7 | Flexibility and Efficiency | 2 | Favorites, recent activity, theme choice, and tabs help; there are no keyboard accelerators or shortcut affordances for power users. |
| 8 | Aesthetic and Minimalist Design | 3 | The new violet glass direction is specific and focused, but dense developer surfaces and legacy explanatory copy add noise. |
| 9 | Error Recovery | 3 | Toasts identify many failures; several recoveries would be stronger with inline action-oriented copy that preserves context. |
| 10 | Help and Documentation | 2 | The product is intentionally low-copy, but the highest-stakes Sera access and wallet signing moments lack concise contextual recovery guidance. |
| **Total** | | **28/40** | **Good foundation; polish high-impact states before calling it finished.** |

## Design Specificity Verdict

SeraPay now feels product-specific rather than category-interchangeable because the violet intent color, liquid-glass shell, Sera market status, self-custodial language, and compact Account tabs form a coherent identity. The strongest remaining sameness comes from inherited black/white utility styling in older dialogs and the developer staging surface, which can look like a generic dark dashboard beside the more authored wallet shell.

## Assessment B: Detector and Browser Evidence

The browser pass showed the Wallet shell, Explore mini-app tabs, Account Settings, and separated Dev Console rendering correctly. The detector found 15 findings, including intentional false positives for the embedded sandbox preview’s isolated typography and a handful of small type sizes used for metadata. Verified drift includes `Inter` and `#a0a0a0` inside the preview HTML, undocumented `#0b0912` in the glass navigation recipe, and 9–10px metadata sizes not represented in the design document.

## What Is Working

The mobile bottom navigation is compact, labeled, and easy to scan. Account is substantially more usable after being split into Settings, Dev Console, and Activity tabs. Live market status communicates both a real polling state and the last update time instead of presenting static mock values.

## Priority Issues

### [P1] High-stakes state feedback is scattered

**Why it matters:** Wallet signing, Sera access provisioning, and transaction status are consequential actions. Toast-only recovery can disappear before the user understands what to do next.

**Fix:** Preserve local state detail in the relevant surface, pair failures with a retry or recovery action, and keep the selected wallet/context visible through the flow.

**Suggested command:** `$impeccable harden`

### [P1] Legacy surfaces do not fully inherit the visual system

**Why it matters:** Dialogs, developer preview content, and older forms can feel like a second product, weakening trust and polish.

**Fix:** Normalize older action buttons, dialog surfaces, embedded preview typography, and status panels to the shared accent and surface tokens while keeping sandbox content visibly sandboxed.

**Suggested command:** `$impeccable polish`

### [P2] Type scale has undocumented micro-steps

**Why it matters:** The interface intentionally uses 9–12px metadata, but the design record does not describe those roles, so future work will create false drift or inconsistent substitutions.

**Fix:** Add documented micro, caption, and display-medium roles and use them consistently for labels, timestamps, and compact values.

**Suggested command:** `$impeccable typeset`

### [P2] Developer Console remains a dense long-form surface

**Why it matters:** The tab removes Account clutter, but the submission form still presents many fields and permissions at once on narrow screens.

**Fix:** Use progressive disclosure, chunk the form into identity, launch, and permissions sections, and keep validation feedback close to the affected group.

**Suggested command:** `$impeccable layout`

### [P2] Glass effects need a measured performance boundary

**Why it matters:** Multiple simultaneous backdrop filters can become expensive on lower-end mobile devices, especially with a fixed blurred navigation pill.

**Fix:** Keep glass on primary surfaces, avoid nesting additional blur layers, and provide a reduced-transparency fallback while preserving contrast and state.

**Suggested command:** `$impeccable optimize`

## Persona Red Flags

**First-Time Stablecoin User:** The Wallet and Explore surfaces are approachable, but “Sera access” and “Vault” can still require context. The recovery path after a failed signature is not always visible in the originating surface.

**Power Wallet User:** Activity and live rates are discoverable, but there are no visible keyboard shortcuts or quick repeat actions. Dense developer permissions are slow to scan.

**Mobile User in Bright Light:** Glass and low-opacity secondary text may lose contrast in light mode or high ambient light. Focus and disabled states should be checked with increased text size and reduced transparency.

## Minor Observations

The detector flags the embedded sandbox’s `Inter`/gray styling; this is an isolated preview rather than the host shell, but aligning it to Manrope will improve continuity. The Account top-level icon is now descriptive. Small metadata sizes are useful but should be named in the design system.

## Questions to Consider

What if the Sera access row showed the wallet fingerprint and a single “Retry verification” action inline after an error? Could the developer form feel lighter if identity and permissions were collapsed until needed? Should live-rate cards expose a connection state when the app has been backgrounded for a long time?
