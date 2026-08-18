---
title: Pocket Mini Apps
description: Learn the Pocket Mini App lifecycle and host contract.
---

A Pocket Mini App is a public web application.

Pocket Sera can list an approved Mini App in Explore.

The app opens from its public launch URL.

## Lifecycle

| State | Meaning | Developer action |
| --- | --- | --- |
| Local | The app runs on a loopback URL. | Test it in Dev Console. |
| Staging | The app runs in the contained preview. | Check simulation data and responsive layout. |
| Pending | The app waits for review. | Keep all submitted URLs available. |
| Approved | The app can appear in Explore. | Monitor the live app and submit updates. |
| Rejected | The app does not appear in Explore. | Read the review note and correct the issue. |

## Required assets

You need a launch URL.

You need a logo URL.

You need a manifest URL.

All production submission URLs must be public.

The host checks each URL before it accepts the submission.

## Compatibility

Build with any standard web framework.

Use a responsive page.

Support narrow screens first.

Keep the first load small.

Do not require browser extensions.

Do not assume direct access to a wallet provider.

## Current SDK status

Pocket Sera has no public production Mini App wallet SDK today.

The staging message is the only documented frame contract today.

Do not use internal Pocket Sera routes as an SDK.

Use the Dev Console for validation and submission.

## Build next

Read [create a manifest](/doc/mini-apps/manifest/).

Read [stage your Mini App](/doc/mini-apps/staging/).

Read [wallet and permissions](/doc/mini-apps/wallet-and-permissions/).
