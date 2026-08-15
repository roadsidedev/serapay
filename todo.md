# Project TODO

- [x] Define secure SeraPay domain models and the client/server integration boundary.
- [x] Complete the Sera adapter with dedicated normalized `/orders` and `/fills` server procedures and tests.
- [x] Build connected-wallet balance, address, copy, and QR receive experiences.
- [x] Add a Sera-backed swap status refresh that rechecks the submitted route UUID and surfaces updated pending, success, or error state.
- [x] Add provider-backed on-chain transaction confirmation to the Vault deposit and withdrawal lifecycle after broadcast.
- [x] Extend the activity feed with direct-send lifecycle entries and pagination controls; surface Sera-side orders and fills through dedicated adapter procedures.
- [x] Build mini-app discovery and an iframe-contained launch experience.
- [x] Add server-side mini-app manifest fetching and schema validation to the developer submission workflow.
- [x] Build an owner-only review panel for approval and rejection of app submissions.
- [x] Complete wallet settings with profile preferences and a secure non-secret Sera read-access descriptor.
- [x] Add owner-authorization and remaining client-utility tests for critical flows.
- [x] Verify keyboard traversal and visible focus states across wallet, swap, settings, and modal controls; document the observed results.
- [x] Replace MySQL-specific persistence code with Neon/Postgres Drizzle configuration and migrations.
- [x] Prepare a Railway-friendly backend deployment boundary and environment-variable contract.
- [x] Prepare a Vercel-friendly frontend deployment boundary, public environment contract, and CORS configuration.
- [ ] Configure a production authentication provider compatible with Railway and Vercel, then bootstrap the SeraPay owner role in Neon.
- [ ] Add the supplied server-only Sera credentials to Railway and verify protected balance, activity, permit, deposit, and withdrawal flows against a connected wallet.
