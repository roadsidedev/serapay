---
title: Platform Model
description: Learn how Pocket Sera, Sera services, and Pocket Mini Apps work together.
---

Pocket Sera is the host application.

Pocket Mini Apps are hosted web applications.

Sera provides supported stablecoin services.

## Host responsibilities

Pocket Sera manages user identity.

Pocket Sera manages embedded or connected wallet access.

Pocket Sera manages user approval screens.

Pocket Sera manages Mini App discovery and review.

Pocket Sera keeps protected Sera credentials on the server.

## Mini App responsibilities

A Mini App owns its page content.

A Mini App owns its public host.

A Mini App owns its manifest.

A Mini App must state its permission need.

A Mini App must protect its own backend service.

A Mini App must not store host secrets.

## Data flow

1. A user opens an approved Mini App from Explore.
2. Pocket Sera records the launch for the user.
3. Pocket Sera loads the public launch URL in a contained frame.
4. The Mini App renders its own page.
5. A wallet action needs clear host approval.
6. Pocket Sera keeps wallet signing and protected API work inside its boundary.

## Sera service boundary

Sera balances use raw amount strings and token decimals.[1]

Sera wallet values can be unavailable during an RPC fault.[1]

Sera Vault values remain authoritative during that fault.[1]

Sera swaps use a signed intent and a short-lived quote.[2]

Read [Sera tokens and balances](/doc/sera/tokens-and-balances/).

Read [Sera swaps](/doc/sera/swaps/).

## References

[1]: https://docs.sera.cx/api-reference/endpoints/account/ "Sera account endpoints"
[2]: https://docs.sera.cx/api-reference/endpoints/swaps/ "Sera swap endpoints"
