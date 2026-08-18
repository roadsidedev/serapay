import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://pocket-sera.com",
  base: "/doc",
  outDir: "../dist/public/doc",
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
  },
  integrations: [
    starlight({
      title: "Pocket Sera Docs",
      description: "Build, test, submit, and operate Pocket Mini Apps on Pocket Sera.",
      customCss: ["./src/styles/custom.css"],
      social: [
        { icon: "github", label: "Pocket Sera on GitHub", href: "https://github.com/roadsidedev/serapay" },
      ],
      sidebar: [
        { label: "Overview", link: "/" },
        { label: "Start Here", items: ["getting-started", "getting-started/local-development", "concepts/platform", "concepts/security-model"] },
        { label: "Pocket Mini Apps", items: ["mini-apps/overview", "mini-apps/manifest", "mini-apps/staging", "mini-apps/wallet-and-permissions", "mini-apps/submission-and-review"] },
        { label: "Sera Services", items: ["sera/tokens-and-balances", "sera/swaps", "sera/vault"] },
        { label: "Operations", items: ["operations/deploy-pocket-mini-app", "operations/publish-docs", "operations/troubleshooting"] },
        { label: "Reference", items: ["reference/manifest-schema", "reference/permission-reference", "reference/staging-context", "reference/terms"] },
      ],
    }),
  ],
});
