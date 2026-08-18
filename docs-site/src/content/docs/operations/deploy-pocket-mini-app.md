---
title: Deploy A Pocket Mini App
description: Deploy a Mini App and prepare its public submission URLs.
---

Deploy your Mini App before you submit it.

The host needs public production URLs.

## Deployment requirements

Use HTTPS.

Use a stable domain.

Serve the app without a private network connection.

Serve the manifest without user login.

Serve the logo from a public URL.

Keep the launch URL available during review.

## Example Vercel setup

1. Push your Mini App source to GitHub.
2. Import the repository into Vercel.
3. Set the project build command.
4. Set the output directory for your framework.
5. Add your production domain.
6. Deploy the project.
7. Open the launch URL in a private window.
8. Open the manifest URL in a private window.

Use platform secrets only in Vercel environment settings.

Do not prefix secrets with `VITE_`, `NEXT_PUBLIC_`, or similar public names.

## Required URL checks

| URL | Test |
| --- | --- |
| Launch URL | Opens with HTTPS and no login gate. |
| Logo URL | Returns the intended image. |
| Manifest URL | Returns valid JSON with `application/json` when possible. |

## Before you submit

Stage the production URL in Dev Console.

Test a narrow mobile screen.

Test slow loading.

Test empty data.

Test all permission copy.

Check that manifest fields equal the submission fields.
