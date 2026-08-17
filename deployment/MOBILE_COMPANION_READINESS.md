# SeraPay Mobile Companion Readiness

**SeraPay is implemented as a responsive web wallet first.** The recommended native-distribution path is to wrap the production Vercel build in Capacitor, keeping the existing React client and Railway API as the primary application surfaces. Capacitor applications are released through the normal native App Store and Google Play processes rather than through a separate web-specific store flow.[1] [2]

## Responsive verification

The wallet shell was checked at the handset dimensions below with the live development build. The balance card, four primary actions, and thumb-reachable bottom navigation retained a single-column hierarchy without visible clipping. A CSS safe-area rule now reserves room for `env(safe-area-inset-bottom)` on mobile so content does not sit beneath device home indicators.

| Viewport | Result | Observed behavior |
|---|---|---|
| 375 × 812 | Pass | Balance card, action grid, status card, and bottom navigation remain legible. |
| 390 × 844 | Pass | Primary wallet actions preserve comfortable touch targets and no bottom-nav overlap was observed. |
| 428 × 926 | Pass | Wallet content remains proportionate with clear vertical rhythm and fixed navigation. |
| 1280 × 720 | Pass | Desktop sidebar, top bar, balance card, and wallet-state card retain a two-column layout. |

## Recommended native wrapper architecture

| Layer | Recommended responsibility | Notes |
|---|---|---|
| Capacitor iOS / Android shell | App identity, safe areas, deep links, secure native permissions, biometrics or notifications if later required | Do not move Sera API secrets or Privy server secrets into the native application. |
| React / Vite client | Wallet UI, Privy social onboarding, embedded-wallet interactions, typed-data signing, mini-app shell | Keep `VITE_API_BASE_URL` and `VITE_PRIVY_APP_ID` environment-driven at build time. |
| Railway API | Sera server-side adapter, per-user Sera credential encryption, Privy access-token verification, tRPC, Neon access | Configure `DATABASE_URL`, Privy server credentials, `SERA_CREDENTIAL_ENCRYPTION_KEY`, `OWNER_PRIVY_DID`, and `ALLOWED_ORIGIN` only in Railway. |
| Neon | User identity, handles, preferences, mini-app registry, favorite/recent state | Apply the pending Postgres migrations before enabling profile and personalization persistence in production. |

> **Key boundary:** The wallet-export control opens Privy’s protected SDK flow. SeraPay does not receive or store wallet private keys, seed phrases, or recovery material.

## Capacitor integration sequence

1. Create a separate native-wrapper workspace or branch after the production web domain and API domain are stable.
2. Install and initialize Capacitor against the Vite production build output, then add the iOS and Android platforms.
3. Configure platform application identifiers, universal links / Android App Links, branded icons, splash screens, and production environment values. Capacitor’s official deployment documentation specifically directs teams to generate appropriate splash screens and icons before store submission.[1] [2]
4. Register production callback and allow-list URLs with Privy for the web and native-associated domains. Validate Google, X, email, and any other enabled onboarding methods in both native shells.
5. Run an end-to-end device matrix: social sign-in, embedded-wallet creation, typed-data signing, Vault deposit/withdrawal, swap route submission, mini-app containment, export-modal launch, logout, and relogin.
6. Build and sign iOS with Xcode for TestFlight, and Android as an app bundle for Play Console internal testing. Capacitor’s iOS and Android release guides point to the normal Apple and Google native submission processes.[1] [2]

## Store-review and release gates

The following gates should be complete before any store submission. They are intentionally separate from the responsive UI work because they depend on the user’s production credentials, domains, and Neon database.

| Gate | Owner | Status |
|---|---|---|
| Apply `0001_black_wallow.sql`, `0002_messy_charles_xavier.sql`, and `0003_cute_shiva.sql` to production Neon with a direct Postgres connection | Platform owner | Pending |
| Add `VITE_PRIVY_APP_ID` to Vercel and `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, and `OWNER_PRIVY_DID` to Railway | Platform owner | Pending |
| Add `SERA_CREDENTIAL_ENCRYPTION_KEY` to Railway; enable per-user Sera access and verify protected reads and execution flows with a real wallet | Platform owner | Pending |
| Set the production Vercel domain in Railway `ALLOWED_ORIGIN` and Privy’s allow-list / redirect configuration | Platform owner | Pending |
| Create native privacy disclosures, support URL, account-deletion support process, app icons, splash assets, and store metadata | Product / compliance owner | Pending |
| Test production authentication, profile persistence, favorites, and recent launches after the Neon migration | Engineering / QA | Pending |
| Conduct TestFlight and Play internal-track functional, accessibility, and security review | Engineering / QA | Pending |

## References

[1] [Capacitor: Deploying an iOS App to the App Store](https://capacitorjs.com/docs/ios/deploying-to-app-store)

[2] [Capacitor: Deploying an Android App to Google Play](https://capacitorjs.com/docs/android/deploying-to-google-play)
