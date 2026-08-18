---
title: Staging Context Reference
description: Reference the documented Pocket Sera Dev Console simulation message.
---

The Dev Console sends this message after a preview frame loads.

The message is for staging only.

```ts
type PocketSeraStagingContext = {
  type: "serapay:staging-context";
  version: 1;
  environment: "staging";
  wallet: {
    address: "0x000000000000000000000000000000000000dEaD";
    chainId: 1;
    isSimulation: true;
    balances: Array<{ symbol: "USDC"; amount: "1000.00" }>;
  };
};
```

## Field meanings

| Field | Meaning |
| --- | --- |
| `type` | Fixed Pocket Sera staging message type. |
| `version` | Fixed contract version. |
| `environment` | Always `staging` for this message. |
| `wallet.address` | Labelled simulation address. |
| `wallet.chainId` | Ethereum Mainnet chain ID. |
| `wallet.isSimulation` | Always true for this message. |
| `wallet.balances` | Labelled test balance data. |

## Safe listener

```ts
function isPocketSeraStagingContext(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; version?: unknown };
  return message.type === "serapay:staging-context" && message.version === 1;
}

window.addEventListener("message", (event) => {
  if (!isPocketSeraStagingContext(event.data)) return;
  // Render simulation state only.
});
```

Do not use this message for production authorization.

Do not use this message to sign or send a transaction.
