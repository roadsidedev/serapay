# Pocket Sera Platform Contract

## Scope

Pocket Sera is a mobile-first wallet and mini-app host.

The host runs on Ethereum Mainnet.

The host uses Sera services for supported stablecoin actions.

Pocket Mini Apps run inside Pocket Sera.

The host controls identity, wallet access, transaction approval, and registry review.

Mini Apps provide their own product user interface and business logic.

## User Surfaces

| Surface | Purpose | Developer impact |
| --- | --- | --- |
| Wallet | Shows balances, FX rates, transfers, swaps, and Vault actions. | A Mini App must not replace host transaction controls. |
| Explore | Lists approved Mini Apps. | A published Mini App appears here. |
| My Mini Apps | Shows favorites and recent approved Mini Apps. | The host records launch and favorite state. |
| Account | Manages identity, region, security, and Dev Console. | Developers submit and review work here. |
| Dev Console | Stages, validates, submits, and reviews Mini Apps. | Developers use this surface before release. |

## Identity And Wallet Boundary

Pocket Sera uses Privy when production credentials are configured.

Privy can create an embedded Ethereum wallet for a signed-in user.

Pocket Sera can also connect an injected wallet.

Pocket Sera keeps its Sera API credentials on the server.

Pocket Mini Apps must not receive a Sera API key or secret.

Pocket Mini Apps must not receive a user private key.

Pocket Mini Apps must not receive a Privy access token.

## Permission Contract

Declare only the permissions that your Mini App needs.

The manifest and submission must declare the same permissions.

| Permission | Meaning | Current host rule |
| --- | --- | --- |
| `wallet.read` | Read non-secret wallet state. | Request only when needed. |
| `wallet.balance` | Read supported balance data. | Request only when needed. |
| `wallet.address` | Read the active public address. | Request only when needed. |
| `wallet.transfer` | Request a transfer flow. | The host must show user approval. |
| `wallet.swap` | Request a Sera swap flow. | The host must use a fresh Sera quote. |
| `wallet.sign` | Request a typed-data signature. | The host must show user approval. |
| `wallet.payment` | Request a payment flow. | The host must show user approval. |

The current host validates this declaration during submission.

The current host does not expose a public production Mini App wallet SDK.

Do not claim that a permission grants silent wallet access.

## Manifest Contract

Host validation retrieves the manifest as JSON.

The manifest must match its submission name, version, developer, and permissions.

| Field | Type | Rule |
| --- | --- | --- |
| `name` | string | Two to eighty characters. |
| `description` | string | Twenty to five hundred characters. |
| `version` | string | Semantic version format. |
| `developer` | string | Two to one hundred twenty characters. |
| `permissions` | string array | One to seven supported permission values. |

## Submission Contract

The developer signs in before submission.

The host validates the launch URL, logo URL, and manifest URL.

The host accepts only public HTTP or HTTPS submission URLs.

The host rejects localhost and private network URLs during submission.

The host checks each reachable URL with a five-second limit.

| Field | Rule |
| --- | --- |
| Launch URL | Public URL that opens the Mini App. |
| Logo URL | Public URL for the listing image. |
| Manifest URL | Public JSON URL that meets the manifest contract. |
| Developer identity | Public developer name or organization name. |
| Category | One supported registry category. |
| Supported currencies | One to twenty uppercase codes with three to six letters. |

Supported categories are Payments, Utilities, Exchange, Trading, Savings, Yield, Remittance, Commerce, Games, and Tools.

## Staging Contract

The Dev Console can open a Mini App in a sandboxed iframe.

Remote staging URLs must use HTTPS.

Local staging may use `http://localhost` or `http://127.0.0.1`.

The preview frame uses `allow-scripts allow-forms`.

The host sends a test-only message after the frame loads.

```json
{
  "type": "serapay:staging-context",
  "version": 1,
  "environment": "staging",
  "wallet": {
    "address": "0x000000000000000000000000000000000000dEaD",
    "chainId": 1,
    "isSimulation": true,
    "balances": [{ "symbol": "USDC", "amount": "1000.00" }]
  }
}
```

This message contains simulation data only.

Do not treat it as production wallet data.

Do not request wallet secrets from the frame.

## Transaction Safety

Pocket Sera must show a user approval step before signing or sending a transaction.

The user keeps control of the wallet signature.

Swap quotes are short-lived.

The host must request a new quote when a quote is stale.

The host must sign quote data exactly as Sera returns it.

Wallet-deposit swaps can require an EIP-2612 permit.

Vault deposits can use a permit or a separate approval transaction.

Vault withdrawals use a dual-signature process.

The application must wait for settlement status before it reports completion.

## Review And Publication

New submissions begin as `pending`.

Only an owner-authorized reviewer can approve or reject a submission.

Approved Mini Apps can appear in Explore.

Rejected Mini Apps do not appear in Explore.

The host stores the reviewer note and review time.

## Reliability Rules

Use HTTPS for production pages and production assets.

Set a strict Content Security Policy on your Mini App server.

Use a stable launch URL.

Keep the manifest available without login.

Use semantic versions for each release.

Test the Mini App in the Dev Console before submission.

Do not depend on undocumented frame messages or internal routes.
