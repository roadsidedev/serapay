---
title: Sera Vault
description: Understand supported Sera Vault deposit and withdrawal flows.
---

Sera Vault actions need wallet signatures.

Pocket Sera controls protected Sera service calls.

Mini Apps must not receive a Sera API secret.

## Deposit flow

The host gets live Vault and SOR addresses from Sera configuration.[1]

The host can build an approval transaction.[1]

The host can build a deposit transaction.[1]

The host can use an EIP-2612 permit for supported tokens.[1]

The host broadcasts only an allowed signed transaction.[1]

## Withdrawal flow

Instant withdrawal uses two signatures.[1]

The user first signs a `WithdrawIntent`.[1]

The executor then co-signs the intent.[1]

The user then signs the final withdrawal transaction.[1]

Do not report success before final settlement is known.

## User interface rules

Show the token and raw input amount after formatting.

Show the recipient address.

Show the deadline.

Show a pending state after broadcast.

Show a failed state with retry guidance.

## References

[1]: https://docs.sera.cx/api-reference/endpoints/account/ "Sera account endpoints"
