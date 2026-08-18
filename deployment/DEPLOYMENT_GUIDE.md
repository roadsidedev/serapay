# Pocket Sera Production Deployment Guide

This runbook deploys Pocket Sera with **Neon** for PostgreSQL, **Railway** for the Express/tRPC backend, and **Vercel** for the Vite frontend. It assumes the `main` branch of [`roadsidedev/serapay`](https://github.com/roadsidedev/serapay) and a new, empty Neon database.

> **Security boundary.** Only Railway receives database, Privy-server, and Sera configuration. Vercel receives only browser-safe variables. Never commit `.env` files or paste a private key, database URL, `SERA_API_SECRET`, `SERA_CREDENTIAL_ENCRYPTION_KEY`, or `PRIVY_APP_SECRET` into the frontend configuration.

| Surface | Host | Responsibility | Public configuration |
| --- | --- | --- | --- |
| Database | Neon | Users, profile preferences, mini-app state, review data | None |
| API | Railway | Privy token verification, Sera server-side relay, tRPC procedures, CORS | Railway HTTPS URL |
| App | Vercel | Mobile-first Pocket Sera interface and Privy onboarding | Railway HTTPS API base URL and Privy App ID |

## 1. Preflight

Use the latest `main` branch, install Node.js 22 and pnpm 10, and create the three provider projects before entering secrets. Keep two Neon connection strings: use the **direct** connection only for administrative work and retain the **pooled** connection for the Railway runtime. This guide’s manual SQL path does not require the direct URL to be stored anywhere in Pocket Sera.

Create one Privy application for Pocket Sera. Enable the social and email login methods that the product intends to support and configure the production Vercel URL as an allowed origin. The backend and browser must refer to this exact same Privy application.

## 2. Initialize Neon

Open the Neon SQL Editor for a **new and empty** database, make a branch or backup, then use [`neon-production-migrations.sql`](./neon-production-migrations.sql). The script combines migrations `0000` through `0005` in their required order and creates the Drizzle migration ledger so future migrations can be applied normally.

| Placeholder | Source migration | Drizzle ledger timestamp | SHA-256 |
| --- | --- | ---: | --- |
| `0000` | `0000_groovy_fallen_one.sql` | 1786785571191 | `c61a6f9505297f5460de9601513592b56356ff7a6f3b53cb827f8e90b389b063` |
| `0001` | `0001_black_wallow.sql` | 1786792294630 | `42be3c03cfc72100bb7dae4d7cd2960ae87f91fa859d230b55e7a98dea63d606` |
| `0002` | `0002_messy_charles_xavier.sql` | 1786792730422 | `f189ac75db1beb8b654e35a5cc8f963ce25e2fb0e224918f9a46936a0f61f377` |
| `0003` | `0003_cute_shiva.sql` | 1786793200521 | `1c84a6099655df855da5f57ad77160bba03bfb0cfb3ab1028905b12aee10aaff` |
| `0004` | `0004_dear_alice.sql` | 1786798649831 | `c2d7382e85b65df8e71e69f0c5bafaf5305e0304d5ab86a672d6a4cb764c66e8` |
| `0005` | `0005_outstanding_skin.sql` | 1786958183209 | `e0aa86156e7a47ddcac8182d0c5497c179ded3aae870515c6e58758a5484ec2e` |

Run the complete script once. A successful run creates `users`, `sera_api_credentials`, `mini_apps`, `user_mini_app_states`, the `user_role` and `mini_app_status` enum types, and the `drizzle.__drizzle_migrations` ledger. Do **not** rerun the script or use it on a partially initialized database.

> **Operational rule.** After the initial script has run, add only new timestamped Drizzle migrations to the repository and apply them with the project’s standard migration process against a protected Neon branch. Do not edit or replay `0000`–`0004` on a production database.

## 3. Deploy the Railway backend

Create a Railway service from the GitHub repository. Railway will supply `PORT`; do not define it manually. Configure the service using the following build and start commands, then assign a Railway HTTPS domain.

| Railway setting | Value |
| --- | --- |
| Root directory | Repository root |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Start command | `pnpm start` |
| Health-check path | `/` |

Set the Railway variables below. Values marked **required** must be present before production traffic is enabled.

| Variable | Required | Value / purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production` |
| `DATABASE_URL` | Yes | **Pooled** Neon Postgres connection string; never use the direct administrative URL at runtime. |
| `JWT_SECRET` | Yes | Long random server-only secret, for example output from `openssl rand -hex 32`. |
| `SERA_API_BASE_URL` | Recommended | Sera API base URL; default is `https://api.sera.cx/api/v1`. |
| `SERA_CREDENTIAL_ENCRYPTION_KEY` | Yes | 32-byte hex key used to encrypt per-user Sera API secrets at rest; generate with `openssl rand -hex 32`. |
| `SERA_API_KEY` | Optional legacy bootstrap | Server-only legacy key, retained only for controlled maintenance or migration use. It is not used for normal per-user reads. |
| `SERA_API_SECRET` | Optional legacy bootstrap | Server-only legacy secret, retained only for controlled maintenance or migration use. It is not used for normal per-user reads. |
| `PRIVY_APP_ID` | Yes | The same Privy App ID set in Vercel’s `VITE_PRIVY_APP_ID`. |
| `PRIVY_APP_SECRET` | Yes | Privy server-side App Secret, used to verify access tokens. |
| `OWNER_PRIVY_DID` | Required for owner moderation | Privy DID for the Pocket Sera owner account; set after the owner completes their first sign-in. |
| `ALLOWED_ORIGIN` | Yes | Exact Vercel production origin, such as `https://serapay.vercel.app`, with **no trailing slash**. |

Do not set browser-prefixed `VITE_*` secrets on Railway as a substitute for server credentials. In particular, do not expose `SERA_API_SECRET`, `PRIVY_APP_SECRET`, or `DATABASE_URL` outside Railway.

## 4. Deploy the Vercel frontend

Import the same GitHub repository into Vercel. Choose the **Vite** framework preset. The repository’s Vite configuration writes the browser bundle to `dist/public`; the full project build also prepares the Railway bundle, which is harmless on Vercel.

| Vercel setting | Value |
| --- | --- |
| Root directory | Repository root |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Output directory | `dist/public` |

Set these variables for **Production** (and for Preview if preview deployments need real authentication). They are the only values that should be shipped to the browser.

| Variable | Required | Value / purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Railway HTTPS origin, for example `https://serapay-production.up.railway.app`; no trailing slash. |
| `VITE_PRIVY_APP_ID` | Yes | The same Privy App ID configured as `PRIVY_APP_ID` in Railway. |

Never add `DATABASE_URL`, `SERA_API_KEY`, `SERA_API_SECRET`, `SERA_CREDENTIAL_ENCRYPTION_KEY`, `PRIVY_APP_SECRET`, `OWNER_PRIVY_DID`, or `JWT_SECRET` to Vercel. Variables beginning with `VITE_` are embedded in the browser bundle.

After the first Vercel production deploy, copy its canonical URL into Railway’s `ALLOWED_ORIGIN` and into Privy’s allowed-origin configuration. Redeploy Railway after changing its variables. If a custom domain is used, use that canonical HTTPS origin everywhere and update both providers before directing users to it.

## 5. Bootstrap the owner role

First, sign in to the production Vercel app with the social account that should own Pocket Sera. Privy will create the account and Pocket Sera will provision a `users` row. Find the user’s Privy DID in Privy’s dashboard, set it as Railway’s `OWNER_PRIVY_DID`, and redeploy Railway. Sign out and back in, or make another authenticated request, so Pocket Sera updates that user to the `admin` role. The owner can then review mini-app submissions through the Dev Console.

## 6. Post-deployment verification

Use a dedicated production test account and a wallet funded only with amounts you are prepared to transact on Ethereum mainnet. Complete the checks in order and stop if authentication, CORS, or a server-side credential error appears.

| Check | Expected evidence |
| --- | --- |
| Browser boundary | Vercel loads over HTTPS; no server credentials appear in browser configuration or repository history. |
| CORS and API | The signed-in app can load protected profile data from Railway without a browser CORS error. |
| Privy onboarding | Social/email sign-in creates an embedded wallet; reload keeps the session; avatar and username suggestion appear. |
| Profile persistence | Claim a username and update theme, country, currency, language, and approval preference; reload and confirm all values persist. |
| Sera access provisioning | From Settings, enable Sera access for a connected wallet, approve the documented ManageApiKey EIP-712 signature, and confirm only a key fingerprint is shown afterward. |
| Sera read boundary | After per-user Sera access is enabled, the connected wallet’s balance and activity requests complete without exposing an API secret to the browser. |
| Swap | Request a fresh quote, approve the wallet/device-authenticated signature promptly, then confirm the submitted Sera order/fill and wallet activity. Quotes are intentionally short-lived; request a new one rather than signing an expired quote. |
| Vault deposit | Use a minimal controlled amount; confirm the ERC-2612 permit or approval path, broadcast, receipt confirmation, and settlement status. |
| Vault withdrawal | Confirm the required dual-signature withdrawal flow, broadcast result, and settlement state before treating the withdrawal as complete. |
| Owner access | Sign in as the configured owner and verify Dev Console review controls; sign in as a standard user and verify the controls are unavailable. |

> **Mainnet warning.** Pocket Sera signs and broadcasts real Ethereum mainnet transactions. A successful UI render does not confirm transaction settlement. Always verify the transaction and final asset state with the connected wallet, Sera activity, and an independent block explorer before operational use.

## 7. Production handoff checklist

| Item | Completion condition |
| --- | --- |
| Neon schema | Consolidated script completed once and `drizzle.__drizzle_migrations` contains six rows, including `0005_outstanding_skin`. |
| Railway | Health check is healthy; pooled Neon URL, Privy credentials, `SERA_CREDENTIAL_ENCRYPTION_KEY`, `JWT_SECRET`, and exact CORS origin are configured. |
| Vercel | `VITE_API_BASE_URL` points to Railway and `VITE_PRIVY_APP_ID` matches Railway `PRIVY_APP_ID`. |
| Privy | Production Vercel URL is an allowed origin and intended login methods are enabled. |
| Owner | `OWNER_PRIVY_DID` is set after the owner’s first production sign-in and owner review authorization has been verified. |
| Wallet operations | Per-user Sera access, balance read, fresh swap, Vault deposit, withdrawal, and settlement checks have each been performed with a controlled production account. |
