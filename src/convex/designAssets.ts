import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

const categoryValidator = v.union(
  v.literal("concept"),
  v.literal("cmf"),
  v.literal("renders"),
  v.literal("direction-c"),
  v.literal("direction-c-v2"),
  v.literal("uncategorized")
);

const optionalString = v.optional(v.string());
const optionalAgentId = v.optional(v.id("agents"));

export const list = query({
  args: {
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    if (args.category !== undefined) {
      return await ctx.db
        .query("designAssets")
        .withIndex("by_category", (q) => q.eq("category", args.category as string))
        .collect();
    }
    return await ctx.db.query("designAssets").collect();
  },
});

export const getByPath = query({
  args: {
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("designAssets")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();
  },
});

export const upsertFromMinio = mutation({
  args: {
    path: v.string(),
    name: v.string(),
    category: categoryValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("designAssets")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("designAssets", {
      path: args.path,
      name: args.name,
      category: args.category,
      status: "pending",
      createdBy: undefined,
      reviewedBy: undefined,
      reviewComment: undefined,
      createdAt: now,
      reviewedAt: undefined,
    });
  },
});

export const setStatus = mutation({
  args: {
    path: v.string(),
    status: statusValidator,
    reviewerId: optionalAgentId,
    reviewComment: optionalString,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("designAssets")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();

    const now = Date.now();

    if (!existing) {
      await ctx.db.insert("designAssets", {
        path: args.path,
        name: args.path.split("/").pop() || args.path,
        category: "uncategorized",
        status: args.status,
        createdBy: undefined,
        reviewedBy: args.reviewerId ?? undefined,
        reviewComment: args.reviewComment ?? undefined,
        createdAt: now,
        reviewedAt: now,
      });
      return;
    }

    await ctx.db.patch(existing._id, {
      status: args.status,
      reviewedBy: args.reviewerId ?? existing.reviewedBy,
      reviewComment: args.reviewComment ?? existing.reviewComment,
      reviewedAt: now,
    });
  },
});

export const bulkSetStatus = mutation({
  args: {
    paths: v.array(v.string()),
    status: statusValidator,
    reviewerId: optionalAgentId,
    reviewComment: optionalString,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const path of args.paths) {
      const existing = await ctx.db
        .query("designAssets")
        .withIndex("by_path", (q) => q.eq("path", path))
        .first();

      if (!existing) {
        await ctx.db.insert("designAssets", {
          path,
          name: path.split("/").pop() || path,
          category: "uncategorized",
          status: args.status,
          createdBy: undefined,
          reviewedBy: args.reviewerId ?? undefined,
          reviewComment: args.reviewComment ?? undefined,
          createdAt: now,
          reviewedAt: now,
        });
        continue;
      }

      await ctx.db.patch(existing._id, {
        status: args.status,
        reviewedBy: args.reviewerId ?? existing.reviewedBy,
        reviewComment: args.reviewComment ?? existing.reviewComment,
        reviewedAt: now,
      });
    }
  },
});

export const softDelete = mutation({
  args: {
    path: v.string(),
    reviewerId: optionalAgentId,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("designAssets")
      .withIndex("by_path", (q) => q.eq("path", args.path))
      .first();
    const now = Date.now();

    if (!existing) {
      await ctx.db.insert("designAssets", {
        path: args.path,
        name: args.path.split("/").pop() || args.path,
        category: "uncategorized",
        status: "rejected",
        createdBy: undefined,
        reviewedBy: args.reviewerId ?? undefined,
        reviewComment: "Soft deleted",
        createdAt: now,
        reviewedAt: now,
      });
      return;
    }

    await ctx.db.patch(existing._id, {
      status: "rejected",
      reviewedBy: args.reviewerId ?? existing.reviewedBy,
      reviewComment: "Soft deleted",
      reviewedAt: now,
    });
  },
});
