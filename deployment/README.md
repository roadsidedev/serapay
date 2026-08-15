# External deployment contract

Deploy the Express/tRPC service to Railway and set the server-only values from `railway.env.example`. Use a **pooled** Neon `DATABASE_URL` for the Railway runtime; retain a direct Neon connection string locally for Drizzle migrations. Set `ALLOWED_ORIGIN` to the exact Vercel production URL, without a trailing slash.

Deploy the Vite client to Vercel and set `VITE_API_BASE_URL` from `vercel.env.example` to the HTTPS base URL of the Railway service. This is the only external endpoint shipped into the browser. **Never** set `DATABASE_URL`, `SERA_API_KEY`, or `SERA_API_SECRET` in Vercel.

The active Drizzle schema and database helper use Neon’s Postgres HTTP driver. Before migrating Neon, run `pnpm drizzle-kit migrate` with a direct Neon connection string. The reviewed initial migration is `drizzle/0000_groovy_fallen_one.sql`; it creates the user and mini-app tables plus their enum types. Apply `drizzle/0001_black_wallow.sql` next to add Privy DIDs, unique usernames, embedded-wallet address metadata, avatar URLs, and user theme preferences. The historical MySQL development migrations are retained only under `migration-archive/mysql/` and must not be applied to Neon.

SeraPay now has an environment-gated Privy adapter. Set `VITE_PRIVY_APP_ID` in Vercel and set the same App ID plus `PRIVY_APP_SECRET` in Railway. The frontend attaches Privy access tokens to protected API calls and the Railway adapter verifies them before it provisions or retrieves a SeraPay user. Set `OWNER_PRIVY_DID` in Railway to grant the intended Privy account the owner role after first sign-in. Never put `PRIVY_APP_SECRET`, Sera credentials, Neon URLs, or an owner DID in browser-visible variables or source files.
