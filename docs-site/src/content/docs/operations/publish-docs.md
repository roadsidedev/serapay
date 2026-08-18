---
title: Publish Pocket Sera Docs
description: Build and host the Starlight documentation site at `pocket-sera.com/doc`.
---

This repository contains the Pocket Sera Starlight site in `docs-site`.

The full project build writes documentation to `dist/public/doc`.

This path maps to `https://pocket-sera.com/doc`.

## Local commands

Run the documentation site on its own port.

```sh
pnpm docs:dev
```

Build only the documentation site.

```sh
pnpm docs:build
```

Run the complete Pocket Sera build.

```sh
pnpm build
```

The complete build runs Vite first.

It then writes Starlight files to the Vercel static output folder.

## Vercel configuration

Use the repository root as the Vercel root directory.

Use `pnpm install --frozen-lockfile` for installation.

Use `pnpm build` as the build command.

Use `dist/public` as the output directory.

Set the production domain to `pocket-sera.com`.

The documentation URL becomes `https://pocket-sera.com/doc`.

## Release checklist

Run `pnpm docs:check`.

Run `pnpm docs:build`.

Check the generated `dist/public/doc/index.html` file.

Deploy the project.

Open `/doc` in a private browser window.

Open at least one nested page.

Check search and sidebar links.

## Starlight sources

Starlight uses content collections for documentation pages.[1]

Starlight supports configured sidebar groups.[2]

## References

[1]: https://starlight.astro.build/manual-setup/ "Starlight manual setup"
[2]: https://starlight.astro.build/reference/configuration/ "Starlight configuration reference"
