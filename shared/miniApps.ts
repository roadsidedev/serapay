import { z } from "zod";

export const miniAppCategories = [
  "Payments",
  "Utilities",
  "Exchange",
  "Trading",
  "Savings",
  "Yield",
  "Remittance",
  "Commerce",
  "Games",
  "Tools",
] as const;

export const miniAppPermissions = [
  "wallet.read",
  "wallet.balance",
  "wallet.address",
  "wallet.transfer",
  "wallet.swap",
  "wallet.sign",
  "wallet.payment",
] as const;

export type MiniAppPermission = (typeof miniAppPermissions)[number];

export const miniAppSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(500),
  logoUrl: z.string().url().max(2048),
  launchUrl: z.string().url().max(2048),
  manifestUrl: z.string().url().max(2048),
  developerIdentity: z.string().trim().min(2).max(120),
  category: z.enum(miniAppCategories),
  version: z.string().trim().regex(/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/),
  permissions: z.array(z.enum(miniAppPermissions)).min(1).max(7),
  supportedCurrencies: z.array(z.string().trim().regex(/^[A-Z]{3,6}$/)).min(1).max(20),
});

export const miniAppManifestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(500),
  version: z.string().trim().regex(/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/),
  developer: z.string().trim().min(2).max(120),
  permissions: z.array(z.enum(miniAppPermissions)).min(1).max(7),
});

function isPrivateIpv4(hostname: string) {
  const segments = hostname.split(".").map(Number);
  if (segments.length !== 4 || segments.some(segment => Number.isNaN(segment))) return false;

  const [first, second] = segments;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

export function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isPrivateIpv6 = hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80");

    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      hostname !== "localhost" &&
      !hostname.endsWith(".localhost") &&
      !isPrivateIpv4(hostname) &&
      !isPrivateIpv6
    );
  } catch {
    return false;
  }
}

export function toMiniAppPermissions(values: MiniAppPermission[]) {
  return Array.from(new Set(values));
}
