---
title: Wallet And Permissions
description: Request only needed wallet capabilities and keep approval under user control.
---

Permissions describe a Mini App need.

Permissions do not grant silent wallet control.

Pocket Sera must show user approval for signing and transaction actions.

## Supported permissions

| Permission | Use case | Risk level |
| --- | --- | --- |
| `wallet.read` | Read non-secret host state. | Low |
| `wallet.balance` | Show supported balance data. | Low |
| `wallet.address` | Show the active public address. | Low |
| `wallet.transfer` | Request a token transfer. | High |
| `wallet.swap` | Request a supported Sera swap. | High |
| `wallet.sign` | Request a typed-data signature. | High |
| `wallet.payment` | Request a payment action. | High |

## Declare the minimum set

Request `wallet.balance` for a balance screen.

Do not request `wallet.transfer` for a read-only screen.

Do not request `wallet.sign` for a screen with no signature need.

The manifest and submission form must match.

## Current integration boundary

Pocket Sera has no public production Mini App wallet SDK.

Use the documented staging context during development.

Treat production wallet actions as host-controlled flows.

Do not call undocumented host APIs.

Do not access `window.ethereum` as a Pocket Sera integration method.

## Approval design

Describe the requested action before it reaches the host.

Show the token and amount.

Show the recipient for a transfer.

Show the network.

Show an error state when a user rejects the action.

Never label a signature as a login when it can move funds.
