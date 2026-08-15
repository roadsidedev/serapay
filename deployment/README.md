# External deployment contract

Deploy the Express/tRPC service to Railway and set the server-only values from `railway.env.example`. Use a **pooled** Neon `DATABASE_URL` for the Railway runtime; retain a direct Neon connection string locally for Drizzle migrations. Set `ALLOWED_ORIGIN` to the exact Vercel production URL, without a trailing slash.

Deploy the Vite client to Vercel and set `VITE_API_BASE_URL` from `vercel.env.example` to the HTTPS base URL of the Railway service. This is the only external endpoint shipped into the browser. **Never** set `DATABASE_URL`, `SERA_API_KEY`, or `SERA_API_SECRET` in Vercel.

The active Drizzle schema and database helper use Neon’s Postgres HTTP driver. Before migrating Neon, run `pnpm drizzle-kit migrate` with a direct Neon connection string. The reviewed initial migration is `drizzle/0000_groovy_fallen_one.sql`; it creates the user and mini-app tables plus their enum types. The historical MySQL development migrations are retained only under `migration-archive/mysql/` and must not be applied to Neon.

The supplied preview scaffold uses Manus OAuth for development. Before an independent Railway/Vercel release, replace that provider with the team’s chosen production OAuth or wallet-auth implementation, preserve the `users.open_id` identity boundary, and grant the intended owner row `user_role = 'admin'` in Neon. This is necessary for protected Sera reads, developer submissions, and owner-only listing review to function outside the managed preview.
