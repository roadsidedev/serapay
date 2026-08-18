---
title: Pocket Sera Developer Docs
description: Build safe Pocket Mini Apps for Pocket Sera.
template: splash
hero:
  tagline: Build useful stablecoin tools for Pocket Sera.
  actions:
    - text: Build your first Mini App
      link: /doc/getting-started/
      icon: right-arrow
      variant: primary
    - text: Read the Mini App contract
      link: /doc/mini-apps/overview/
      icon: open-book
---

Pocket Sera is a wallet and a Mini App host.

It supports stablecoin activity on Ethereum Mainnet.

It uses Sera services for supported swaps and Vault actions.

Pocket Mini Apps add focused tools to the Pocket Sera experience.

## Use this site

Use this site as the Pocket Sera developer source of truth.

Start with the [quick start](/doc/getting-started/).

Read the [Mini App overview](/doc/mini-apps/overview/) before you build a release.

Read the [security model](/doc/concepts/security-model/) before you request a wallet action.

## Build path

| Step | Result |
| --- | --- |
| Build | You create a public web Mini App. |
| Stage | You test the app inside the Dev Console. |
| Validate | The host checks URLs and manifest data. |
| Submit | You add the app to the review queue. |
| Review | An authorized owner approves or rejects the app. |
| Publish | Approved apps can appear in Explore. |

> A Mini App never receives a user private key, a Privy token, or a Sera API secret.

## Main rules

Use HTTPS in production.

Use a public JSON manifest.

Declare only needed permissions.

Ask users to approve every signature and transaction.

Use a fresh quote for every swap attempt.

Test in the Dev Console before you submit.

## Support scope

The current host validates manifests and runs staging previews.

The current host has no public production Mini App wallet SDK.

Do not depend on undocumented messages or internal routes.

## References

[1]: https://docs.sera.cx/api-reference/endpoints/swaps/ "Sera swap endpoints"
[2]: https://docs.sera.cx/api-reference/endpoints/account/ "Sera account endpoints"
