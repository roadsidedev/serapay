---
title: Sera Swaps
description: Follow the Sera quote, permit, signature, and settlement rules.
---

Sera swaps use a quote and a signed intent.[1]

The quote has a limited lifetime.

Request a new quote before each execution.

## Safe swap flow

1. Request a quote from the host.
2. Check that the quote has not expired.
3. Check the quote permit requirement.
4. Sign the exact quote intent data.
5. Sign the exact permit data when required.
6. Submit through the host transaction flow.
7. Check the final order or settlement state.

Do not rebuild quote fields in the Mini App.

Sign `route_params` exactly as Sera returns it.[1]

## Deposit permit

Wallet-deposit swap quotes include a permit requirement.[1]

The quote can include an EIP-712 object for the wallet signer.[1]

Pass that object to the signer without editing it.[1]

If the input token has no permit support, use the approved allowance flow.[1]

## Error handling

Use Sera `error_code` values for program flow.[1]

| Error code | User-safe action |
| --- | --- |
| `QUOTE_STALE` | Request a new quote. |
| `INTENT_DEADLINE_EXPIRED` | Request a new quote. |
| `ALLOWANCE_INSUFFICIENT` | Request a new permit or approval. |
| `SLIPPAGE_EXCEEDED` | Ask the user to re-quote with changed limits. |
| `NO_LIQUIDITY` | Ask the user to reduce size or change pair. |
| `AMOUNT_BELOW_MIN` | Ask the user to increase the amount. |

Do not route flow logic from a human error message.

## References

[1]: https://docs.sera.cx/api-reference/endpoints/swaps/ "Sera swap endpoints"
