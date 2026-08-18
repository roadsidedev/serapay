---
title: Permission Reference
description: Reference all declared Pocket Mini App permission values.
---

Declare permissions in the manifest and submission form.

The current host validates the declared values.

| Value | Purpose | Approval rule |
| --- | --- | --- |
| `wallet.read` | Read non-secret host state. | No silent signing permission. |
| `wallet.balance` | Read supported balance state. | No silent signing permission. |
| `wallet.address` | Read the active public address. | No silent signing permission. |
| `wallet.transfer` | Request a transfer flow. | The user must approve. |
| `wallet.swap` | Request a supported swap flow. | The user must approve. |
| `wallet.sign` | Request typed-data signing. | The user must approve. |
| `wallet.payment` | Request a payment flow. | The user must approve. |

Permission declarations are not an API key.

Permission declarations are not a private-key grant.

Permission declarations are not a silent transaction grant.

Request only what your Mini App uses.
