import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 获取任务的所有消息
export const getByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
  },
});

// 创建消息
export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    fromAgentId: v.id("agents"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
    mentions: v.optional(v.array(v.id("agents"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const messageId = await ctx.db.insert("messages", {
      taskId: args.taskId,
      fromAgentId: args.fromAgentId,
      content: args.content,
      attachments: args.attachments,
      mentions: args.mentions,
      createdAt: now,
    });

    // 获取 agent 名称
    const agent = await ctx.db.get(args.fromAgentId);
    const task = await ctx.db.get(args.taskId);

    // 记录活动
    await ctx.db.insert("activities", {
      type: "message_sent",
      agentId: args.fromAgentId,
      taskId: args.taskId,
      message: `${agent?.name || "Agent"} 在 "${task?.title}" 中发表评论`,
      createdAt: now,
    });

    // 为 @mentioned 的 agents 创建通知
    if (args.mentions && args.mentions.length > 0) {
      for (const mentionedId of args.mentions) {
        await ctx.db.insert("notifications", {
          mentionedAgentId: mentionedId,
          fromAgentId: args.fromAgentId,
          taskId: args.taskId,
          messageId,
          content: args.content.substring(0, 200), // 截取前200字符
          delivered: false,
          createdAt: now,
        });
      }
    }

    return messageId;
  },
});
