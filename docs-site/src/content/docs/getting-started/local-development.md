---
title: Local Development
description: Run and stage a Pocket Mini App on your own computer.
---

Pocket Sera supports local staging through loopback URLs.

Use `http://localhost` or `http://127.0.0.1` during local development.

Use HTTPS after you deploy.

## Start a sample app

Create a project with your preferred web framework.

Run its development server.

Keep the page available at a loopback URL.

```sh
pnpm dev
```

For example, a Vite app often runs at `http://localhost:5173`.

## Open the Dev Console

Open Pocket Sera.

Select **Account**.

Select **Dev Console**.

Turn on Dev Mode.

Enter the local URL.

The host opens the page in a sandboxed preview frame.

## Check the preview

The host sends a test context after the page loads.

The context uses a labelled simulation address.

The context uses a simulated USDC balance.

The context is not production wallet data.

Add a visible staging label in your app.

Do not send transactions from the staging message.

Read the [staging context reference](/doc/reference/staging-context/).

## Use production-like conditions

Test narrow mobile widths.

Test a delayed network response.

Test an empty balance state.

Test rejected user actions.

Test a page reload inside the frame.

Do not use local URLs in a production submission.
