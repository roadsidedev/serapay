---
title: Stage a Mini App
description: Use the Pocket Sera Dev Console before you submit a Mini App.
---

The Dev Console stages a Mini App inside a contained host frame.

Use staging before every submission.

## Start staging

1. Open **Account** in Pocket Sera.
2. Open **Dev Console**.
3. Turn on Dev Mode.
4. Enter the Mini App preview URL.
5. Wait for the contained preview to load.
6. Test the simulation context.

Use an HTTPS URL for a remote preview.

Use a loopback HTTP URL for local development.

## Preview limits

The preview frame uses `allow-scripts allow-forms`.

The host sends a simulation message after frame load.

The simulation has no user wallet key.

The simulation has no Privy credential.

The simulation has no Sera credential.

The preview is not a production permission grant.

## Listen for the staging message

```ts
window.addEventListener("message", (event) => {
  const message = event.data;
  if (message?.type !== "serapay:staging-context") return;
  if (message.version !== 1) return;
  console.log(message.wallet.address);
});
```

Validate the message before you use it.

Use the `isSimulation` field in your screen state.

Do not use this message to send a transaction.

Read the [staging context reference](/doc/reference/staging-context/).

## Test list

Test a narrow mobile screen.

Test an empty result.

Test a slow network response.

Test a form error.

Test a page reload.

Test your app without browser wallet extensions.
