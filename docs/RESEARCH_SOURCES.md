# Documentation Research Sources

## Astro Starlight

The Pocket Sera documentation site uses Astro Starlight.

Starlight uses Astro content collections.

Docs content lives in `src/content/docs/`.

Each Markdown, MDX, or Markdoc file becomes a page.

Pages can use a subpath directory.

The site needs explicit sidebar navigation.

The site must set a title and description.

The site can use Pagefind for static search.

Sources:

- [Starlight manual setup](https://starlight.astro.build/manual-setup/)
- [Starlight configuration reference](https://starlight.astro.build/reference/configuration/)

## Sera Account Flows

Pocket Mini Apps must not receive a Sera API secret.

Pocket Sera owns protected Sera API calls.

Balances use raw token amounts and decimals.

Vault values are authoritative.

Wallet values can be unavailable.

Deposit can use an ERC-2612 permit.

Deposit can use an approve transaction.

Withdrawal uses a user signature, an executor co-signature, and a final user transaction signature.

Source:

- [Sera account endpoints](https://docs.sera.cx/api-reference/endpoints/account/)

## Sera Swap Flows

Pocket Sera must request a new quote before a swap.

The wallet must sign quote data exactly as received.

Wallet-deposit swaps require the quote permit.

The permit EIP-712 object can go directly to the wallet signer.

Equity-only swaps have no deposit permit.

An expired or stale quote needs a new quote request.

Clients must use the documented error code for flow decisions.

Source:

- [Sera swap endpoints](https://docs.sera.cx/api-reference/endpoints/swaps/)

## Deployment Verification Note

Pocket Sera documentation runs below `/doc`.

Root-absolute content links must include the `/doc` prefix.

Starlight sidebar slugs can resolve internal pages without this prefix.
