import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 获取所有 agents
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

// 根据名称获取 agent
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// 根据 session key 获取 agent
export const getBySession = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
  },
});

// 创建 agent
export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    sessionKey: v.string(),
    mentionPatterns: v.array(v.string()),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agents", {
      ...args,
      status: "idle",
    });
  },
});

// 更新 agent 状态
export const updateStatus = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked")
    ),
    currentTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// 记录心跳
export const heartbeat = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastHeartbeat: Date.now(),
    });
    
    // 记录活动
    await ctx.db.insert("activities", {
      type: "agent_heartbeat",
      agentId: args.id,
      message: "心跳检查",
      createdAt: Date.now(),
    });
  },
});

// 初始化团队 agents
export const initTeam = mutation({
  args: {},
  handler: async (ctx) => {
    const agents = [
      {
        name: "Nova",
        role: "项目主控",
        sessionKey: "agent:nova:main",
        mentionPatterns: ["@nova", "@主控", "@lead"],
        model: "claude-opus-4-5-20251101",
      },
      {
        name: "Sage",
        role: "调研分析",
        sessionKey: "agent:sage:main",
        mentionPatterns: ["@sage", "@调研", "@research"],
        model: "gpt-5.2-codex",
      },
      {
        name: "Atlas",
        role: "产品经理",
        sessionKey: "agent:atlas:main",
        mentionPatterns: ["@atlas", "@pm", "@产品"],
        model: "gpt-5.2-codex",
      },
      {
        name: "Jarvis",
        role: "硬件负责",
        sessionKey: "agent:jarvis:main",
        mentionPatterns: ["@jarvis", "@硬件", "@hw"],
        model: "gpt-5.2-codex",
      },
      {
        name: "Friday",
        role: "软件开发",
        sessionKey: "agent:friday:main",
        mentionPatterns: ["@friday", "@软件", "@sw", "@dev"],
        model: "gpt-5.2-codex",
      },
      {
        name: "Vision",
        role: "测试验证",
        sessionKey: "agent:vision:main",
        mentionPatterns: ["@vision", "@测试", "@qa"],
        model: "gpt-5.2-codex",
      },
    ];

    const results = [];
    for (const agent of agents) {
      const existing = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", agent.name))
        .first();
      
      if (!existing) {
        const id = await ctx.db.insert("agents", {
          ...agent,
          status: "idle",
        });
        results.push({ name: agent.name, id, action: "created" });
      } else {
        results.push({ name: agent.name, id: existing._id, action: "exists" });
      }
    }
    return results;
  },
});
