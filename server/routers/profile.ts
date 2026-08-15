import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { normalizeUsername, validateUsername } from "../../shared/profile";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const usernameInput = z.string().min(1).max(64).transform(normalizeUsername).superRefine((username, context) => {
  const validation = validateUsername(username);
  if (!validation.valid) context.addIssue({ code: "custom", message: validation.message });
});

export const profileRouter = router({
  usernameAvailability: publicProcedure.input(z.object({ username: usernameInput })).query(async ({ input }) => {
    const user = await db.getUserByUsername(input.username);
    return { username: input.username, available: !user };
  }),
  update: protectedProcedure
    .input(z.object({ username: usernameInput.optional(), displayName: z.string().trim().min(1).max(100).optional(), embeddedWalletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(), avatarUrl: z.string().url().max(2048).optional(), preferredTheme: z.enum(["system", "dark", "light"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.username && input.username !== ctx.user.username) {
        const existing = await db.getUserByUsername(input.username);
        if (existing && existing.id !== ctx.user.id) throw new TRPCError({ code: "CONFLICT", message: "That username is already taken." });
      }
      const user = await db.updateUserProfile(ctx.user.id, {
        username: input.username,
        name: input.displayName,
        embeddedWalletAddress: input.embeddedWalletAddress,
        avatarUrl: input.avatarUrl,
        preferredTheme: input.preferredTheme,
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "SeraPay profile not found." });
      return user;
    }),
});
