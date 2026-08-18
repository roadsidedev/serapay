import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { miniApps, userMiniAppStates } from "../../drizzle/schema";
import { isPublicHttpUrl, miniAppManifestSchema, miniAppSubmissionSchema, toMiniAppPermissions } from "../../shared/miniApps";
import { getDb } from "../db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

const reviewStatusSchema = z.enum(["approved", "rejected"]);

async function ensureReachableUrl(value: string, label: string) {
  if (!isPublicHttpUrl(value)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} must be a public HTTP or HTTPS URL.` });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(value, { method: "HEAD", redirect: "manual", signal: controller.signal });
    if (response.status >= 200 && response.status < 400) return;

    if (response.status === 405) {
      const fallback = await fetch(value, { method: "GET", redirect: "manual", signal: controller.signal });
      if (fallback.status >= 200 && fallback.status < 400) return;
    }

    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} could not be reached.` });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} could not be reached.` });
  } finally {
    clearTimeout(timeout);
  }
}

async function validateManifestMetadata(value: string, submission: z.infer<typeof miniAppSubmissionSchema>) {
  const response = await fetch(value, { method: "GET", redirect: "manual", headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Manifest could not be retrieved as JSON." });
  }

  const manifest = miniAppManifestSchema.safeParse(await response.json().catch(() => null));
  if (!manifest.success) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Manifest does not satisfy the Pocket Sera mini-app metadata standard." });
  }

  const hasSamePermissions = manifest.data.permissions.length === submission.permissions.length && manifest.data.permissions.every(permission => submission.permissions.includes(permission));
  if (manifest.data.name !== submission.name || manifest.data.version !== submission.version || manifest.data.developer !== submission.developerIdentity || !hasSamePermissions) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Submitted listing metadata must match its manifest name, developer, version, and permissions." });
  }
}

async function validateMiniAppSubmission(submission: z.infer<typeof miniAppSubmissionSchema>) {
  await Promise.all([
    ensureReachableUrl(submission.launchUrl, "Launch URL"),
    ensureReachableUrl(submission.logoUrl, "Logo URL"),
    validateManifestMetadata(submission.manifestUrl, submission),
  ]);
}

function serialiseMiniApp(app: typeof miniApps.$inferSelect) {
  return {
    ...app,
    permissions: (app.permissions ?? []) as string[],
    supportedCurrencies: (app.supportedCurrencies ?? []) as string[],
  };
}

export const miniAppsRouter = router({
  listApproved: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const apps = await db.select().from(miniApps).where(eq(miniApps.status, "approved")).orderBy(desc(miniApps.reviewedAt));
    return apps.map(serialiseMiniApp);
  }),
  listForReview: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const apps = await db.select().from(miniApps).orderBy(desc(miniApps.createdAt));
    return apps.map(serialiseMiniApp);
  }),
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({ app: miniApps, state: userMiniAppStates })
      .from(userMiniAppStates)
      .innerJoin(miniApps, eq(userMiniAppStates.miniAppId, miniApps.id))
      .where(and(eq(userMiniAppStates.userId, ctx.user.id), eq(miniApps.status, "approved")))
      .orderBy(desc(userMiniAppStates.lastVisitedAt));
    return rows.map(({ app, state }) => ({ ...serialiseMiniApp(app), isFavorite: state.isFavorite === 1, visitCount: state.visitCount, lastVisitedAt: state.lastVisitedAt }));
  }),
  setFavorite: protectedProcedure.input(z.object({ appId: z.number().int().positive(), isFavorite: z.boolean() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The mini-app registry is unavailable." });
    const [app] = await db.select({ id: miniApps.id }).from(miniApps).where(and(eq(miniApps.id, input.appId), eq(miniApps.status, "approved"))).limit(1);
    if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Published mini-app not found." });
    const [existing] = await db.select().from(userMiniAppStates).where(and(eq(userMiniAppStates.userId, ctx.user.id), eq(userMiniAppStates.miniAppId, input.appId))).limit(1);
    if (existing) await db.update(userMiniAppStates).set({ isFavorite: input.isFavorite ? 1 : 0, updatedAt: new Date() }).where(eq(userMiniAppStates.id, existing.id));
    else await db.insert(userMiniAppStates).values({ userId: ctx.user.id, miniAppId: input.appId, isFavorite: input.isFavorite ? 1 : 0 });
    return { success: true } as const;
  }),
  recordLaunch: protectedProcedure.input(z.object({ appId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The mini-app registry is unavailable." });
    const [app] = await db.select({ id: miniApps.id }).from(miniApps).where(and(eq(miniApps.id, input.appId), eq(miniApps.status, "approved"))).limit(1);
    if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Published mini-app not found." });
    const [existing] = await db.select().from(userMiniAppStates).where(and(eq(userMiniAppStates.userId, ctx.user.id), eq(userMiniAppStates.miniAppId, input.appId))).limit(1);
    const now = new Date();
    if (existing) await db.update(userMiniAppStates).set({ visitCount: existing.visitCount + 1, lastVisitedAt: now, updatedAt: now }).where(eq(userMiniAppStates.id, existing.id));
    else await db.insert(userMiniAppStates).values({ userId: ctx.user.id, miniAppId: input.appId, visitCount: 1, lastVisitedAt: now });
    return { success: true } as const;
  }),
  validateDraft: protectedProcedure.input(miniAppSubmissionSchema).mutation(async ({ input }) => {
    await validateMiniAppSubmission(input);
    return { valid: true } as const;
  }),
  submit: protectedProcedure.input(miniAppSubmissionSchema).mutation(async ({ ctx, input }) => {
    await validateMiniAppSubmission(input);

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The mini-app registry is unavailable." });

    await db.insert(miniApps).values({
      submittedByUserId: ctx.user.id,
      name: input.name,
      description: input.description,
      logoUrl: input.logoUrl,
      launchUrl: input.launchUrl,
      manifestUrl: input.manifestUrl,
      developerIdentity: input.developerIdentity,
      category: input.category,
      version: input.version,
      permissions: toMiniAppPermissions(input.permissions),
      supportedCurrencies: Array.from(new Set(input.supportedCurrencies)),
      status: "pending",
    });

    return { success: true } as const;
  }),
  review: adminProcedure
    .input(z.object({ id: z.number().int().positive(), status: reviewStatusSchema, reviewNote: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The mini-app registry is unavailable." });

      await db
        .update(miniApps)
        .set({ status: input.status, reviewNote: input.reviewNote ?? null, reviewedByUserId: ctx.user.id, reviewedAt: new Date() })
        .where(and(eq(miniApps.id, input.id), eq(miniApps.status, "pending")));

      return { success: true } as const;
    }),
});
