import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent 定义
  agents: defineTable({
    name: v.string(),           // "Nova", "Sage", etc.
    role: v.string(),           // "项目主控", "调研分析", etc.
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked")
    ),
    currentTaskId: v.optional(v.id("tasks")),
    sessionKey: v.string(),     // "agent:nova:main"
    mentionPatterns: v.array(v.string()), // ["@nova", "@主控", "@lead"]
    model: v.string(),          // "claude-opus-4-5" or "gpt-5.2-codex"
    lastHeartbeat: v.optional(v.number()), // timestamp
  }).index("by_name", ["name"])
    .index("by_session", ["sessionKey"]),

  // 任务
  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("blocked"),
      v.literal("done")
    ),
    priority: v.union(
      v.literal("P0"),
      v.literal("P1"),
      v.literal("P2"),
      v.literal("P3")
    ),
    assigneeIds: v.array(v.id("agents")),
    createdBy: v.optional(v.id("agents")),
    dueDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_assignee", ["assigneeIds"]),

  // 消息/评论
  messages: defineTable({
    taskId: v.id("tasks"),
    fromAgentId: v.id("agents"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
    mentions: v.optional(v.array(v.id("agents"))), // @mentioned agents
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),

  // 活动流
  activities: defineTable({
    type: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("task_assigned"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("agent_heartbeat"),
      v.literal("status_changed")
    ),
    agentId: v.id("agents"),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_time", ["createdAt"])
    .index("by_agent", ["agentId"]),

  // 文档
  documents: defineTable({
    title: v.string(),
    content: v.string(),        // Markdown
    type: v.union(
      v.literal("research"),    // 调研报告
      v.literal("spec"),        // 技术规格
      v.literal("report"),      // 测试报告
      v.literal("deliverable"), // 交付物
      v.literal("note")         // 笔记
    ),
    taskId: v.optional(v.id("tasks")),
    authorId: v.id("agents"),
    path: v.optional(v.string()), // workspace 路径
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_task", ["taskId"])
    .index("by_type", ["type"]),

  // 通知
  notifications: defineTable({
    mentionedAgentId: v.id("agents"),
    fromAgentId: v.id("agents"),
    taskId: v.optional(v.id("tasks")),
    messageId: v.optional(v.id("messages")),
    content: v.string(),
    delivered: v.boolean(),
    createdAt: v.number(),
  }).index("by_agent", ["mentionedAgentId"])
    .index("by_undelivered", ["mentionedAgentId", "delivered"]),
});
