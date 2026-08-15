# Sera API Contract Audit Notes

## Official documentation findings

The canonical REST base URL is `https://api.sera.cx/api/v1`. The official API overview identifies `POST /swap/quote` for quote generation and `POST /swap` for execution of the signed quote. It further identifies `GET /balances`, `POST /deposit`, `POST /withdraw`, `POST /withdraw/build`, and `POST /withdraw/send` as the relevant account-and-funds endpoints.

| Capability | Official endpoint | Authorization model | SeraPay boundary |
|---|---|---|---|
| Quote | `POST /swap/quote` | Public | Server proxies quote requests; no client secret is used. |
| Swap execution | `POST /swap` | EIP-712 signature | The browser signs the user instruction; the server relays only the signed payload. |
| Balance read | `GET /balances` | API key | Server-only credentials. |
| Deposit builder | `POST /deposit` | API key | The server builds an unsigned transaction; the wallet signs it locally. |
| Instant withdrawal authorization | `POST /withdraw` | EIP-712 signature | The browser signs the withdrawal intent. |
| Withdrawal builder and broadcast | `POST /withdraw/build`, `POST /withdraw/send` | API key optional per endpoint | The server builds or relays a user-signed transaction; it never receives a private key. |
| Order and fill confirmation | `GET /orders/{order_id}`, `GET /fills/{order_id}`, `GET /fills` | API key | Server polls protected records after a signed action. |

> The protocol documentation describes the current swap deployment as CLOB-first with on-chain settlement. It also states that users sign EIP-712 instructions and that on-chain settlement is final.

## Integration constraint

Sera’s public roadmap documentation describes future passive-liquidity positions as a planned FCICAMM extension. Therefore, SeraPay must present the current Vault feature as **Vault deposit and withdrawal**, not as a guaranteed protocol liquidity-yield product, unless a live Sera endpoint explicitly reports an eligible yield or liquidity position.

## Account endpoint verification

The official Account Endpoints reference confirms that SeraPay’s existing transaction-builder sequence is native to Sera: `POST /approve`, `POST /deposit`, and `POST /tx/send` are the approval/deposit path; the withdrawal path is `POST /withdraw`, `POST /withdraw/build`, then `POST /withdraw/send`. Every builder response returns the unsigned EIP-1559 transaction fields SeraPay validates before asking the wallet to sign.

`GET /balances` requires an API key and requires its `owner_address` to match the authenticated API-key owner. Production credential provisioning must therefore be completed with the wallet ownership model used by SeraPay’s owner profile; a generic shared API key must not be assumed to read arbitrary wallets.

## Swap endpoint verification

The official `POST /swap/quote` request fields match SeraPay’s current quote adapter: `from_token`, `to_token`, `from_amount`, `owner_address`, `recipient`, `expiration`, and `gas_mode`. The quote endpoint has no API-key requirement.

The official `POST /swap` execution request requires **four** fields: `uuid`, the signature over `quote.route_params`, `permit_signature`, and `permit_deadline`. SeraPay’s current execution adapter only relays `uuid` and `signature`; it must be upgraded to forward quote-derived permit data and client-side signing must use Sera’s returned `permit.eip712` payload verbatim. Quotes are short-lived, and expired or stale quotes must be discarded rather than retried.

| Error class | Required SeraPay behavior |
|---|---|
| `QUOTE_STALE` or `INTENT_DEADLINE_EXPIRED` | Clear the route and require a fresh quote. |
| `AMOUNT_BELOW_MIN` or `NO_LIQUIDITY` | Preserve the user input, explain the route cannot execute, and allow requoting. |
| Rate-limited or server-unavailable response | Do not repeat the signed execution payload automatically. |

## Sources

[1] [Sera API Overview](https://docs.sera.cx/api-reference/)

[2] [Sera Overview](https://docs.sera.cx/)

[3] [Sera Swap Protocol Roadmap](https://docs.sera.cx/protocol/swap/)

[4] [Sera Account Endpoints](https://docs.sera.cx/api-reference/endpoints/account/)

[5] [Sera Swap Endpoints](https://docs.sera.cx/api-reference/endpoints/swaps/)
