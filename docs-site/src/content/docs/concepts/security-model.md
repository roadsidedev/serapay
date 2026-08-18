---
title: Security Model
description: Follow the Pocket Sera wallet, identity, and Mini App safety rules.
---

Security is a host and Mini App responsibility.

Use the rules in this page before you launch.

## Protect secrets

Do not expose a private key.

Do not expose a seed phrase.

Do not expose a Privy token.

Do not expose a Sera API key or secret.

Do not place server secrets in browser code.

Use server environment variables for service credentials.

## Protect users

Show clear action details before user approval.

State token, amount, recipient, and network.

Do not hide a transaction behind a generic button.

Do not ask users to sign unknown typed data.

Do not claim that a simulation address is a real address.

## Protect your web page

Use HTTPS in production.

Set a Content Security Policy.

Set clickjacking protections on pages outside the required host frame.

Validate all server input.

Use a strict allowlist for outbound service calls.

Use a stable manifest URL.

## Frame boundary

The Dev Console preview uses a restricted iframe.

It allows scripts and forms.

It does not expose host credentials.

It sends simulation data only.

Treat every frame message as untrusted input.

Check the message type and version before you use it.

## Transaction rules

The host must request user approval for every signature.

The host must request user approval for every transaction.

Request a new Sera quote after a stale quote error.[1]

Use the Sera error code for application logic.[1]

## References

[1]: https://docs.sera.cx/api-reference/endpoints/swaps/ "Sera swap endpoints"
