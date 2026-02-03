import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 获取所有任务
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").order("desc").collect();
  },
});

// 根据状态获取任务
export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("blocked"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// 获取分配给某 agent 的任务
export const getAssigned = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks").collect();
    return tasks.filter((t) => t.assigneeIds.includes(args.agentId));
  },
});

// 获取 inbox 任务（待分配）
export const getInbox = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "inbox"))
      .collect();
  },
});

// 创建任务
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    priority: v.union(
      v.literal("P0"),
      v.literal("P1"),
      v.literal("P2"),
      v.literal("P3")
    ),
    assigneeIds: v.optional(v.array(v.id("agents"))),
    createdBy: v.optional(v.id("agents")),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      priority: args.priority,
      status: args.assigneeIds && args.assigneeIds.length > 0 ? "assigned" : "inbox",
      assigneeIds: args.assigneeIds || [],
      createdBy: args.createdBy,
      dueDate: args.dueDate,
      createdAt: now,
      updatedAt: now,
    });

    // 记录活动
    if (args.createdBy) {
      await ctx.db.insert("activities", {
        type: "task_created",
        agentId: args.createdBy,
        taskId,
        message: `创建任务: ${args.title}`,
        createdAt: now,
      });
    }

    return taskId;
  },
});

// 分配任务
export const assign = mutation({
  args: {
    taskId: v.id("tasks"),
    assigneeIds: v.array(v.id("agents")),
    assignedBy: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, {
      assigneeIds: args.assigneeIds,
      status: "assigned",
      updatedAt: now,
    });

    // 记录活动
    await ctx.db.insert("activities", {
      type: "task_assigned",
      agentId: args.assignedBy,
      taskId: args.taskId,
      message: `分配任务: ${task.title}`,
      createdAt: now,
    });

    // 为每个被分配的 agent 创建通知
    for (const agentId of args.assigneeIds) {
      await ctx.db.insert("notifications", {
        mentionedAgentId: agentId,
        fromAgentId: args.assignedBy,
        taskId: args.taskId,
        content: `你被分配了任务: ${task.title}`,
        delivered: false,
        createdAt: now,
      });
    }
  },
});

// 更新任务状态
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("blocked"),
      v.literal("done")
    ),
    updatedBy: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const oldStatus = task.status;
    await ctx.db.patch(args.taskId, {
      status: args.status,
      updatedAt: now,
    });

    // 记录活动
    await ctx.db.insert("activities", {
      type: "status_changed",
      agentId: args.updatedBy,
      taskId: args.taskId,
      message: `任务状态: ${oldStatus} → ${args.status}`,
      metadata: { oldStatus, newStatus: args.status },
      createdAt: now,
    });
  },
});

// 更新任务
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("P0"),
        v.literal("P1"),
        v.literal("P2"),
        v.literal("P3")
      )
    ),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { taskId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(taskId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});
