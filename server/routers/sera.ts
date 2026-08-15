import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import {
  buildSeraAuthorizationHeader,
  normaliseSeraBalances,
  normaliseSeraFills,
  normaliseSeraOrders,
  normaliseSeraReadAddress,
  SERA_API_BASE_URL,
  toSeraErrorMessage,
} from "../../shared/sera";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid Ethereum address.");
const rawAmountSchema = z.string().regex(/^\d+$/, "Enter a raw unsigned integer amount.");
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

function hasReadCredentials() {
  return Boolean(process.env.SERA_API_KEY && process.env.SERA_API_SECRET);
}

function getReadAccessDescriptor() {
  const apiKey = process.env.SERA_API_KEY;
  if (!apiKey) return "Not configured";
  const fingerprint = createHash("sha256").update(apiKey).digest("hex").slice(0, 12);
  return `Server-managed key · ${fingerprint}`;
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

async function requestSera(path: string, init: RequestInit = {}, needsReadCredentials = false) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (needsReadCredentials) {
    const apiKey = process.env.SERA_API_KEY;
    const apiSecret = process.env.SERA_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Sera read credentials have not been configured on the server.",
      });
    }
    headers.set("Authorization", buildSeraAuthorizationHeader(apiKey, apiSecret));
  }

  const response = await fetch(`${SERA_API_BASE_URL}${path}`, { ...init, headers });
  return parseResponse(response);
}

export const seraRouter = router({
  status: publicProcedure.query(() => ({ readCredentialsConfigured: hasReadCredentials(), readAccessDescriptor: getReadAccessDescriptor() })),
  tokens: publicProcedure.query(() => requestSera("/tokens")),
  markets: publicProcedure.query(() => requestSera("/markets")),
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
    .mutation(({ input }) =>
      requestSera("/swap/quote", {
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
      }),
    ),
  executeSwap: publicProcedure
    .input(z.object({ uuid: z.string().min(1), signature: z.string().regex(/^0x[a-fA-F0-9]+$/) }))
    .mutation(input =>
      requestSera("/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  balances: protectedProcedure.input(walletAddressSchema).query(async ({ input }) => {
    const response = await requestSera(`/balances?owner_address=${encodeURIComponent(normaliseSeraReadAddress(input))}`, {}, true);
    return normaliseSeraBalances(response as Parameters<typeof normaliseSeraBalances>[0]);
  }),
  orders: protectedProcedure.input(walletAddressSchema).query(async ({ input }) => {
    const response = await requestSera(`/orders?owner_address=${encodeURIComponent(normaliseSeraReadAddress(input))}`, {}, true);
    return normaliseSeraOrders(response as Parameters<typeof normaliseSeraOrders>[0]);
  }),
  orderByRouteUuid: protectedProcedure
    .input(z.object({ walletAddress: walletAddressSchema, uuid: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      const query = new URLSearchParams({ owner_address: normaliseSeraReadAddress(input.walletAddress), uuid: input.uuid });
      const response = await requestSera(`/orders?${query.toString()}`, {}, true);
      return normaliseSeraOrders(response as Parameters<typeof normaliseSeraOrders>[0]);
    }),
  fills: protectedProcedure.input(walletAddressSchema).query(async ({ input }) => {
    const response = await requestSera(`/fills?owner_address=${encodeURIComponent(normaliseSeraReadAddress(input))}`, {}, true);
    return normaliseSeraFills(response as Parameters<typeof normaliseSeraFills>[0]);
  }),
  activity: protectedProcedure.input(walletAddressSchema).query(async ({ input }) => {
    const query = `owner_address=${encodeURIComponent(normaliseSeraReadAddress(input))}`;
    const [orders, fills] = await Promise.all([
      requestSera(`/orders?${query}`, {}, true),
      requestSera(`/fills?${query}`, {}, true),
    ]);
    return {
      orders: normaliseSeraOrders(orders as Parameters<typeof normaliseSeraOrders>[0]),
      fills: normaliseSeraFills(fills as Parameters<typeof normaliseSeraFills>[0]),
    };
  }),
  permitMetadata: protectedProcedure.input(z.object({ walletAddress: walletAddressSchema, tokenAddress: walletAddressSchema })).query(({ input }) =>
    requestSera(
      `/permit/metadata?owner_address=${encodeURIComponent(normaliseSeraReadAddress(input.walletAddress))}&token_address=${encodeURIComponent(input.tokenAddress)}`,
      {},
      true,
    ),
  ),
  buildApprove: protectedProcedure
    .input(z.object({ token: walletAddressSchema, owner: walletAddressSchema, spender: walletAddressSchema, amount: rawAmountSchema }))
    .mutation(({ input }) => requestSera("/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }, true)),
  buildDeposit: protectedProcedure
    .input(z.object({ token: walletAddressSchema, owner: walletAddressSchema, amount: rawAmountSchema, permitSignature: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(), permitDeadline: z.number().int().positive().optional(), permitAmount: rawAmountSchema.optional() }))
    .mutation(({ input }) => requestSera("/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: input.token, owner: normaliseSeraReadAddress(input.owner), amount: input.amount, ...(input.permitSignature ? { permit_signature: input.permitSignature, permit_deadline: input.permitDeadline, permit_amount: input.permitAmount } : {}) }),
    }, true)),
  sendBuiltTransaction: protectedProcedure
    .input(z.object({ rawTransaction: z.string().regex(/^0x[a-fA-F0-9]+$/) }))
    .mutation(({ input }) => requestSera("/tx/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw_tx: input.rawTransaction }) }, true)),
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
