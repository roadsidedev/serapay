---
title: Troubleshooting
description: Fix common Pocket Mini App and Pocket Sera documentation problems.
---

Use this page when validation or staging fails.

## Submission errors

| Problem | Cause | Fix |
| --- | --- | --- |
| Launch URL cannot be reached | The host cannot access the page. | Deploy the page publicly and check HTTPS. |
| Logo URL cannot be reached | The image URL fails. | Use a public image URL. |
| Manifest is not JSON | The endpoint returns HTML or an error. | Serve a valid JSON file. |
| Manifest fields do not match | Form values differ from JSON. | Set equal name, version, developer, and permissions. |
| Private URL is rejected | The URL targets a private network. | Use a public domain. |

## Staging errors

| Problem | Cause | Fix |
| --- | --- | --- |
| Preview does not load | The URL is invalid or blocked. | Use HTTPS or a supported loopback URL. |
| Simulation message is missing | The page listener starts too late. | Add the listener before app mount completes. |
| App shows production mode | The app ignores `isSimulation`. | Render a visible staging mode label. |

## Transaction errors

| Problem | Fix |
| --- | --- |
| Quote is stale | Request a new quote. |
| Permit is rejected | Request a fresh permit or use approval flow. |
| User rejects approval | Keep funds unchanged and show a clear retry action. |
| Wallet data is unavailable | Show unavailable wallet data and retain Vault data. |

## Documentation errors

| Problem | Fix |
| --- | --- |
| `/doc` returns 404 | Confirm `pnpm build` ran and Vercel uses `dist/public`. |
| Nested docs page returns 404 | Confirm the page exists in `docs-site/src/content/docs`. |
| Static links fail | Check `base: "/doc"` in `docs-site/astro.config.mjs`. |
