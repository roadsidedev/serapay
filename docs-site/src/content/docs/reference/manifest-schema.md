---
title: Manifest Schema
description: Use this reference to create valid Pocket Mini App manifest metadata.
---

The manifest is a JSON object.

The host validates all required fields.

```ts
type PocketMiniAppManifest = {
  name: string;
  description: string;
  version: string;
  developer: string;
  permissions: PocketMiniAppPermission[];
};
```

## Value limits

| Field | Minimum | Maximum | Other rule |
| --- | ---: | ---: | --- |
| `name` | 2 characters | 80 characters | Trim surrounding spaces. |
| `description` | 20 characters | 500 characters | Trim surrounding spaces. |
| `version` | N/A | N/A | Use semantic version form. |
| `developer` | 2 characters | 120 characters | Trim surrounding spaces. |
| `permissions` | 1 item | 7 items | Use supported values only. |

## Example

```json
{
  "name": "Pocket Invoice Pay",
  "description": "Creates clear stablecoin payment requests for approved Pocket Sera users.",
  "version": "1.2.0",
  "developer": "Example Studio",
  "permissions": ["wallet.address", "wallet.payment"]
}
```

Use the same values in the Dev Console form.

Read the [permission reference](/doc/reference/permission-reference/).
