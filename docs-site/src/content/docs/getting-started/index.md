---
title: Quick Start
description: Build and submit a first Pocket Mini App.
---

This guide creates a small Pocket Mini App.

The app runs as a public web page.

The host opens the page inside Pocket Sera.

## Before you start

You need a Pocket Sera account.

You need a web project.

You need a public HTTPS host for production.

You need a public URL for the app logo.

You need a public URL for the JSON manifest.

## Build the page

Create a normal web application.

You can use React, Astro, Vue, or plain HTML.

Do not place a wallet key in the browser.

Do not place a Sera API secret in the browser.

Use responsive layout rules.

Pocket Sera is mobile-first.

## Add the manifest

Create a public `manifest.json` file.

Use a semantic version.

Keep its name, version, developer, and permissions equal to the submission values.

```json
{
  "name": "Pocket Rate Board",
  "description": "Shows stablecoin reference rates for Pocket Sera users.",
  "version": "1.0.0",
  "developer": "Example Studio",
  "permissions": ["wallet.read", "wallet.balance"]
}
```

Read the full [manifest guide](/doc/mini-apps/manifest/).

## Stage the app

Open **Account** in Pocket Sera.

Open **Dev Console**.

Turn on Dev Mode.

Enter your local or HTTPS preview URL.

Test the simulation message.

Read the [staging guide](/doc/mini-apps/staging/).

## Submit the app

Use the Dev Console submission form.

Add the launch URL, logo URL, and manifest URL.

Add the same manifest details to the form.

Submit the app for review.

Read the [submission guide](/doc/mini-apps/submission-and-review/).

## Next steps

Read [wallet and permissions](/doc/mini-apps/wallet-and-permissions/).

Read [deploy a Pocket Mini App](/doc/operations/deploy-pocket-mini-app/).
