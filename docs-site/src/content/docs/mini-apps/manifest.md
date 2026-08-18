---
title: Create a Manifest
description: Create the required public JSON metadata file for a Pocket Mini App.
---

Your Mini App must publish a JSON manifest.

The host retrieves this file during validation.

The host compares it with the submission form.

## Required JSON

```json
{
  "name": "Pocket Rate Board",
  "description": "Shows stablecoin reference rates for Pocket Sera users.",
  "version": "1.0.0",
  "developer": "Example Studio",
  "permissions": ["wallet.read", "wallet.balance"]
}
```

## Field rules

| Field | Requirement |
| --- | --- |
| `name` | Use two to eighty characters. |
| `description` | Use twenty to five hundred characters. |
| `version` | Use semantic version form, such as `1.0.0`. |
| `developer` | Use two to one hundred twenty characters. |
| `permissions` | Use one to seven supported permissions. |

The host requires a JSON response.

The host requires a successful public response.

The host rejects mismatched name values.

The host rejects mismatched version values.

The host rejects mismatched developer values.

The host rejects mismatched permission values.

## Version releases

Increase the version for each public release.

Use `MAJOR.MINOR.PATCH` form.

For example, use `1.4.0` for a compatible feature release.

Use `2.0.0` for an incompatible change.

Keep the public manifest available after submission.

## Check before submission

Open the manifest URL in a private browser window.

Check that it returns JSON.

Check all text values.

Check the declared permissions.

Read the full [manifest schema](/doc/reference/manifest-schema/).
