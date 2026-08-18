---
title: Tokens And Balances
description: Display Sera-supported stablecoin balances correctly.
---

Pocket Sera uses Sera balance data for supported assets.

Sera returns raw token amount strings and token decimals.[1]

Use token decimals to format a value for users.[1]

## Balance fields

| Field | Meaning |
| --- | --- |
| `wallet_balance` | Best-effort wallet-side token amount. |
| `vault_available` | Vault amount available for trading. |
| `vault_frozen` | Vault amount locked in open orders. |
| `vault_total` | Available plus frozen Vault amount. |
| `total` | Wallet amount plus Vault total. |

Sera marks Vault numbers as authoritative.[1]

Wallet data can fail during an RPC lookup.[1]

When that happens, `wallet_balance_available` is false.[1]

Show a clear unavailable state.

Do not show a zero wallet balance as a confirmed zero during that fault.

## Formatting example

```ts
function formatRawAmount(raw: string, decimals: number) {
  const value = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, "0");
  return `${whole}.${fraction}`;
}
```

Use a decimal library when you need localized display or rounding.

Do not use JavaScript `Number` for large raw token amounts.

## References

[1]: https://docs.sera.cx/api-reference/endpoints/account/ "Sera account endpoints"
