import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  buildSeraAuthorizationHeader,
  normaliseSeraBalances,
  normaliseSeraFills,
  normaliseSeraOrders,
  normaliseSeraReadAddress,
  toSeraErrorMessage,
  validateSeraSwapExecution,
} from "../../shared/sera";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { ENV } from "../_core/env";
import { assertSeraCredentialEncryptionConfigured, getSeraApiKeyFingerprint } from "../seraCredentialCrypto";

const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid Ethereum address.");
const rawAmountSchema = z.string().regex(/^\d+$/, "Enter a raw unsigned integer amount.");
const swapExecutionWindowMs = 30_000;
const liveFxPairs = [
  { base: "USD", quote: "EUR" },
  { base: "USD", quote: "GBP" },
  { base: "USD", quote: "NGN" },
  { base: "USD", quote: "SGD" },
  { base: "USD", quote: "BRL" },
  { base: "USD", quote: "ZAR" },
] as const;
const issuedSwapQuotes = new Map<string, { permitRequired: boolean; expiresAt: number }>();
const builtTransactionSchema = z.object({
  to: walletAddressSchema,
  data: z.string().regex(/^0x[a-fA-F0-9]*$/),
  value: z.string().regex(/^0x[a-fA-F0-9]+$/),
  chainId: z.string().min(1),
  nonce: z.string().min(1),
  gas: z.string().min(1),
  type: z.string().min(1),
  maxFeePerGas: z.string().min(1),
  maxPriorityFeePerGas: z.string().min(1),
});
const withdrawIntentSchema = z.object({
  user: walletAddressSchema,
  tokens: z.array(walletAddressSchema).min(1).max(20),
  amounts: z.array(rawAmountSchema).min(1).max(20),
  recipient: walletAddressSchema,
  deadline: rawAmountSchema,
  uuid: rawAmountSchema,
}).refine(value => value.tokens.length === value.amounts.length, "Every withdrawal token needs an amount.");

function hasLegacyBootstrapCredentials() {
  return Boolean(ENV.seraApiKey && ENV.seraApiSecret);
}

function getOwnerAddressOrThrow(ownerAddress: string | null | undefined) {
  if (!ownerAddress) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect an Ethereum wallet before using Sera account features." });
  return ownerAddress.toLowerCase();
}

async function resolveSeraCredentials(auth: { userId: number; ownerAddress: string } | { apiKey: string; apiSecret: string }) {
  if ("apiKey" in auth) return auth;
  const credential = await db.getSeraCredential(auth.userId, getOwnerAddressOrThrow(auth.ownerAddress));
  if (!credential) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create a Sera API key for this wallet before loading protected Sera data." });
  return { apiKey: credential.apiKey, apiSecret: db.decryptStoredSeraSecret(credential.encryptedApiSecret), credentialId: credential.id };
}

function getIssuedSwapQuote(response: unknown, requestedExpiration: number) {
  if (!response || typeof response !== "object") return null;
  const quote = response as { uuid?: unknown; expires_at?: unknown; permit?: { permit_required?: unknown } };
  if (typeof quote.uuid !== "string" || quote.uuid.length === 0) return null;

  const rawExpiry = quote.expires_at;
  const parsedExpiry = typeof rawExpiry === "number"
    ? rawExpiry * 1_000
    : typeof rawExpiry === "string" && /^\d+$/.test(rawExpiry)
      ? Number(rawExpiry) * 1_000
      : typeof rawExpiry === "string"
        ? Date.parse(rawExpiry)
        : Number.NaN;
  const requestedExpiry = requestedExpiration * 1_000;
  const expiresAt = Number.isFinite(parsedExpiry) ? Math.min(parsedExpiry, requestedExpiry) : requestedExpiry;

  return {
    uuid: quote.uuid,
    permitRequired: quote.permit?.permit_required === true,
    expiresAt: Math.min(expiresAt, Date.now() + swapExecutionWindowMs),
  };
}

function consumeIssuedSwapQuote(uuid: string) {
  const issuedQuote = issuedSwapQuotes.get(uuid);
  issuedSwapQuotes.delete(uuid);
  if (!issuedQuote || issuedQuote.expiresAt <= Date.now()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This Sera quote is unavailable or expired. Request a fresh quote before signing.",
    });
  }
  return issuedQuote;
}

async function parseResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    throw new TRPCError({
      code: response.status === 401 ? "PRECONDITION_FAILED" : "BAD_GATEWAY",
      message: toSeraErrorMessage(payload, "Sera could not complete this request."),
    });
  }

  return payload;
}

async function revokeRemoteSeraCredential(credential: { apiKey: string; encryptedApiSecret: string }) {
  const apiSecret = db.decryptStoredSeraSecret(credential.encryptedApiSecret);
  await requestSera("/api-keys/self-revoke", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: credential.apiKey }) }, { apiKey: credential.apiKey, apiSecret });
}

async function requestSera(path: string, init: RequestInit = {}, auth?: { userId: number; ownerAddress: string } | { apiKey: string; apiSecret: string }) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (auth) {
    const credentials = await resolveSeraCredentials(auth);
    headers.set("Authorization", buildSeraAuthorizationHeader(credentials.apiKey, credentials.apiSecret));
  }
  const response = await fetch(`${ENV.seraApiBaseUrl}${path}`, { ...init, headers });
  return parseResponse(response);
}

export const seraRouter = router({
  status: publicProcedure.query(() => ({ apiBaseUrl: ENV.seraApiBaseUrl, bootstrapCredentialsConfigured: hasLegacyBootstrapCredentials(), perUserCredentialsEnabled: true })),
  apiKeyStatus: protectedProcedure.input(z.object({ ownerAddress: walletAddressSchema })).query(async ({ ctx, input }) => {
    try {
      const credential = await db.getSeraCredential(ctx.user.id, input.ownerAddress);
      return { configured: Boolean(credential), fingerprint: credential ? getSeraApiKeyFingerprint(credential.apiKey) : null, lastVerifiedAt: credential?.lastVerifiedAt?.toISOString() ?? null };
    } catch {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Sera access storage is unavailable. Apply the latest Pocket Sera database migration, then try again." });
    }
  }),
  createApiKey: protectedProcedure.input(z.object({ ownerAddress: walletAddressSchema, timestamp: z.number().int().positive(), signature: z.string().regex(/^0x[a-fA-F0-9]+$/), label: z.string().trim().min(1).max(80).default("Pocket Sera wallet") })).mutation(async ({ ctx, input }) => {
    const ownerAddress = getOwnerAddressOrThrow(input.ownerAddress);
    const boundAddress = ctx.user.embeddedWalletAddress?.toLowerCase();
    if (boundAddress && boundAddress !== ownerAddress) throw new TRPCError({ code: "FORBIDDEN", message: "This wallet is not linked to your Pocket Sera account." });
    assertSeraCredentialEncryptionConfigured();
    const previousCredential = await db.getSeraCredential(ctx.user.id, ownerAddress);
    if (previousCredential) {
      await revokeRemoteSeraCredential(previousCredential);
      await db.revokeSeraCredential(ctx.user.id, ownerAddress);
    }
    const response = await requestSera("/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner_address: ownerAddress, action: "create", timestamp: input.timestamp, signature: input.signature, label: input.label }) });
    const payload = response as { api_key?: string; api_secret?: string };
    if (!payload.api_key || !payload.api_secret) throw new TRPCError({ code: "BAD_GATEWAY", message: "Sera did not return a complete API credential pair." });
    await requestSera("/api-keys/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: payload.api_key, api_secret: payload.api_secret }) });
    await db.saveSeraCredential({ userId: ctx.user.id, ownerAddress, apiKey: payload.api_key, apiSecret: payload.api_secret });
    if (!boundAddress) await db.updateUserProfile(ctx.user.id, { embeddedWalletAddress: ownerAddress });
    return { configured: true, ownerAddress, fingerprint: getSeraApiKeyFingerprint(payload.api_key) };
  }),
  revokeApiKey: protectedProcedure.input(z.object({ ownerAddress: walletAddressSchema })).mutation(async ({ ctx, input }) => {
    const ownerAddress = getOwnerAddressOrThrow(input.ownerAddress);
    const credential = await db.getSeraCredential(ctx.user.id, ownerAddress);
    if (!credential) return { revoked: false };
    await revokeRemoteSeraCredential(credential);
    await db.revokeSeraCredential(ctx.user.id, ownerAddress);
    return { revoked: true };
  }),
  systemTime: publicProcedure.query(() => requestSera("/system/time")),
  tokens: publicProcedure.query(() => requestSera("/tokens")),
  markets: publicProcedure.query(() => requestSera("/markets")),
  fxRates: publicProcedure.query(async () => {
    const results = await Promise.allSettled(liveFxPairs.map(async pair => {
      const response = await requestSera(`/fx/rate?base=${pair.base}&quote=${pair.quote}`) as { pair?: string; rate?: string | number; as_of?: number; rate_24h_ago?: string | number | null; change_pct?: string | number | null };
      if (response.rate === undefined || response.rate === null) throw new Error(`No live rate returned for ${pair.base}/${pair.quote}.`);
      return { pair: response.pair ?? `${pair.base}/${pair.quote}`, rate: String(response.rate), asOf: response.as_of ?? null, rate24hAgo: response.rate_24h_ago == null ? null : String(response.rate_24h_ago), changePct: response.change_pct == null ? null : String(response.change_pct) };
    }));
    const rates = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    if (!rates.length) throw new TRPCError({ code: "BAD_GATEWAY", message: "Live Sera FX rates are temporarily unavailable. Try again shortly." });
    return { rates, fetchedAt: Math.floor(Date.now() / 1000), source: "Sera /fx/rate" };
  }),
  config: publicProcedure.query(() => requestSera("/config")),
  quote: publicProcedure
    .input(
      z.object({
        fromToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        toToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        fromAmount: z.string().regex(/^\d+$/),
        ownerAddress: walletAddressSchema,
        recipient: walletAddressSchema,
        expiration: z.number().int().positive(),
        gasMode: z.enum(["receive_less", "pay_gas"]).default("receive_less"),
      }),
    )
    .mutation(async ({ input }) => {
      const response = await requestSera("/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_token: input.fromToken,
          to_token: input.toToken,
          from_amount: input.fromAmount,
          owner_address: input.ownerAddress,
          recipient: input.recipient,
          expiration: input.expiration,
          gas_mode: input.gasMode,
        }),
      });
      const issuedQuote = getIssuedSwapQuote(response, input.expiration);
      if (issuedQuote) issuedSwapQuotes.set(issuedQuote.uuid, issuedQuote);
      return response;
    }),
  executeSwap: protectedProcedure
    .input(z.object({ uuid: z.string().min(1), signature: z.string().regex(/^0x[a-fA-F0-9]+$/), permitSignature: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(), permitDeadline: z.number().int().positive().optional() }).refine(value => Boolean(value.permitSignature) === Boolean(value.permitDeadline), "A Sera permit signature and deadline must be supplied together."))
    .mutation(({ input }) => {
      const issuedQuote = consumeIssuedSwapQuote(input.uuid);
      const execution = validateSeraSwapExecution({ ...input, permitRequired: issuedQuote.permitRequired });
      return requestSera("/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: execution.uuid, signature: execution.signature, ...(execution.permitSignature ? { permit_signature: execution.permitSignature, permit_deadline: execution.permitDeadline } : {}) }),
      });
    }),
  balances: protectedProcedure.input(walletAddressSchema).query(async ({ ctx, input }) => {
    const response = await requestSera(`/balances?owner_address=${encodeURIComponent(normaliseSeraReadAddress(input))}`, {}, { userId: ctx.user.id, ownerAddress: input });
    return normaliseSeraBalances(response as Parameters<typeof normaliseSeraBalances>[0]);
  }),
  orders: protectedProcedure.input(walletAddressSchema).query(async ({ ctx, input }) => {
    const response = await requestSera(`/orders?owner_address=${encodeURIComponent(normaliseSeraReadAddress(input))}`, {}, { userId: ctx.user.id, ownerAddress: input });
    return normaliseSeraOrders(response as Parameters<typeof normaliseSeraOrders>[0]);
  }),
  orderByRouteUuid: protectedProcedure
    .input(z.object({ walletAddress: walletAddressSchema, uuid: z.string().min(1).max(128) }))
    .query(async ({ ctx, input }) => {
      const query = new URLSearchParams({ owner_address: normaliseSeraReadAddress(input.walletAddress), uuid: input.uuid });
      const response = await requestSera(`/orders?${query.toString()}`, {}, { userId: ctx.user.id, ownerAddress: input.walletAddress });
      return normaliseSeraOrders(response as Parameters<typeof normaliseSeraOrders>[0]);
    }),
  fills: protectedProcedure.input(walletAddressSchema).query(async ({ ctx, input }) => {
    const response = await requestSera(`/fills?owner_address=${encodeURIComponent(normaliseSeraReadAddress(input))}`, {}, { userId: ctx.user.id, ownerAddress: input });
    return normaliseSeraFills(response as Parameters<typeof normaliseSeraFills>[0]);
  }),
  activity: protectedProcedure.input(walletAddressSchema).query(async ({ ctx, input }) => {
    const query = `owner_address=${encodeURIComponent(normaliseSeraReadAddress(input))}`;
    const [orders, fills] = await Promise.all([
      requestSera(`/orders?${query}`, {}, { userId: ctx.user.id, ownerAddress: input }),
      requestSera(`/fills?${query}`, {}, { userId: ctx.user.id, ownerAddress: input }),
    ]);
    return {
      orders: normaliseSeraOrders(orders as Parameters<typeof normaliseSeraOrders>[0]),
      fills: normaliseSeraFills(fills as Parameters<typeof normaliseSeraFills>[0]),
    };
  }),
  permitMetadata: protectedProcedure.input(z.object({ walletAddress: walletAddressSchema, tokenAddress: walletAddressSchema })).query(({ ctx, input }) =>
    requestSera(
      `/permit/metadata?owner_address=${encodeURIComponent(normaliseSeraReadAddress(input.walletAddress))}&token_address=${encodeURIComponent(input.tokenAddress)}`,
      {},
      { userId: ctx.user.id, ownerAddress: input.walletAddress },
    ),
  ),
  buildApprove: protectedProcedure
    .input(z.object({ token: walletAddressSchema, owner: walletAddressSchema, spender: walletAddressSchema, amount: rawAmountSchema }))
    .mutation(({ ctx, input }) => requestSera("/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }, { userId: ctx.user.id, ownerAddress: input.owner })),
  buildDeposit: protectedProcedure
    .input(z.object({ token: walletAddressSchema, owner: walletAddressSchema, amount: rawAmountSchema, permitSignature: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(), permitDeadline: z.number().int().positive().optional(), permitAmount: rawAmountSchema.optional() }))
    .mutation(({ ctx, input }) => requestSera("/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: input.token, owner: normaliseSeraReadAddress(input.owner), amount: input.amount, ...(input.permitSignature ? { permit_signature: input.permitSignature, permit_deadline: input.permitDeadline, permit_amount: input.permitAmount } : {}) }),
    }, { userId: ctx.user.id, ownerAddress: input.owner })),
  sendBuiltTransaction: protectedProcedure
    .input(z.object({ ownerAddress: walletAddressSchema, rawTransaction: z.string().regex(/^0x[a-fA-F0-9]+$/) }))
    .mutation(({ ctx, input }) => requestSera("/tx/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw_tx: input.rawTransaction }) }, { userId: ctx.user.id, ownerAddress: input.ownerAddress })),
  requestWithdrawal: protectedProcedure
    .input(z.object({ intent: withdrawIntentSchema, userSignature: z.string().regex(/^0x[a-fA-F0-9]+$/) }))
    .mutation(({ input }) => requestSera("/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: input.intent, user_signature: input.userSignature }) })),
  buildWithdrawal: protectedProcedure
    .input(z.object({ intent: withdrawIntentSchema, userSignature: z.string().regex(/^0x[a-fA-F0-9]+$/), executor: walletAddressSchema, executorSignature: z.string().regex(/^0x[a-fA-F0-9]+$/) }))
    .mutation(({ input }) => requestSera("/withdraw/build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: input.intent, user_signature: input.userSignature, executor: input.executor, executor_signature: input.executorSignature }) })),
  sendWithdrawal: protectedProcedure
    .input(z.object({ rawTransaction: z.string().regex(/^0x[a-fA-F0-9]+$/) }))
    .mutation(({ input }) => requestSera("/withdraw/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw_tx: input.rawTransaction }) })),
});
