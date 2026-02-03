import { query } from "./_generated/server";
import { v } from "convex/values";

// 获取最近活动
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activities")
      .order("desc")
      .take(args.limit || 50);
  },
});

// 获取某 agent 的活动
export const getByAgent = query({
  args: { agentId: v.id("agents"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit || 50);
  },
});

// 获取今日活动
export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const activities = await ctx.db
      .query("activities")
      .order("desc")
      .collect();
    
    return activities.filter((a) => a.createdAt >= startOfDay.getTime());
  },
});
