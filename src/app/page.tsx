"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { 
  Activity, 
  Users, 
  ListTodo, 
  Circle,
  Clock,
  CheckCircle2,
  Pause,
  Play,
  Eye,
  Bot,
  Zap,
  MessageCircle,
  Send
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "blocked" | "done";
type Priority = "P0" | "P1" | "P2" | "P3";

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  inbox: { label: "收件箱", color: "text-mc-muted", icon: ListTodo },
  assigned: { label: "已分配", color: "text-blue-400", icon: Users },
  in_progress: { label: "进行中", color: "text-mc-accent", icon: Play },
  review: { label: "待审核", color: "text-purple-400", icon: Eye },
  blocked: { label: "已阻塞", color: "text-mc-danger", icon: Pause },
  done: { label: "已完成", color: "text-mc-success", icon: CheckCircle2 },
};

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  P0: { label: "P0", color: "text-red-400", bg: "bg-red-500/20 border-red-500/50" },
  P1: { label: "P1", color: "text-orange-400", bg: "bg-orange-500/20 border-orange-500/50" },
  P2: { label: "P2", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/50" },
  P3: { label: "P3", color: "text-slate-400", bg: "bg-slate-500/20 border-slate-500/50" },
};

export default function MissionControl() {
  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.getRecent, { limit: 50 });

  const tasksByStatus = tasks?.reduce((acc: any, task: any) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {}) || {};

  const activeAgents = agents?.filter(a => a.status === "active").length || 0;

  return (
    <div className="min-h-screen bg-mc-bg grid-pattern">
      {/* Header */}
      <header className="border-b border-mc-border bg-mc-panel/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-mc-accent/20 border border-mc-accent flex items-center justify-center">
                <Zap className="w-6 h-6 text-mc-accent" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold tracking-wider text-mc-accent glow-text">
                  MISSION CONTROL
                </h1>
                <p className="text-xs text-mc-muted font-mono">AI Agent Squad Monitor</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Circle className={`w-2 h-2 ${activeAgents > 0 ? "fill-mc-success text-mc-success" : "fill-mc-muted text-mc-muted"}`} />
                <span className="text-mc-text">{activeAgents}</span>
                <span className="text-mc-muted">/ {agents?.length || 0} 在线</span>
              </div>
              
              <a 
                href="https://t.me/YOUR_BOT_NAME" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#0088cc]/20 border border-[#0088cc] text-[#0088cc] rounded-lg hover:bg-[#0088cc]/30 transition-all"
              >
                <Send className="w-4 h-4" />
                <span className="text-sm font-medium">Telegram 对话</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "总任务", value: tasks?.length || 0, icon: ListTodo, color: "text-mc-accent" },
            { label: "进行中", value: tasksByStatus.in_progress || 0, icon: Play, color: "text-mc-accent" },
            { label: "待审核", value: tasksByStatus.review || 0, icon: Eye, color: "text-purple-400" },
            { label: "已阻塞", value: tasksByStatus.blocked || 0, icon: Pause, color: "text-mc-danger" },
            { label: "已完成", value: tasksByStatus.done || 0, icon: CheckCircle2, color: "text-mc-success" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-mc-muted text-xs uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`w-6 h-6 ${stat.color} opacity-40`} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Agents Status */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Agent 状态
            </h2>
            <div className="space-y-3">
              {agents?.map((agent: any) => (
                <div key={agent._id} className="flex items-center gap-3 p-3 rounded-lg bg-mc-bg/50 border border-mc-border/50">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-mc-accent/10 border border-mc-accent/30 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-mc-accent" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-mc-panel ${
                      agent.status === "active" ? "bg-mc-success" : 
                      agent.status === "blocked" ? "bg-mc-danger" : "bg-mc-muted"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-mc-text">{agent.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        agent.status === "active" ? "bg-mc-success/20 text-mc-success" :
                        agent.status === "blocked" ? "bg-mc-danger/20 text-mc-danger" :
                        "bg-mc-muted/20 text-mc-muted"
                      }`}>
                        {agent.status === "active" ? "工作中" : agent.status === "blocked" ? "阻塞" : "空闲"}
                      </span>
                    </div>
                    <p className="text-xs text-mc-muted">{agent.role}</p>
                  </div>
                  {agent.lastHeartbeat && (
                    <div className="text-right">
                      <p className="text-xs text-mc-muted">
                        {formatDistanceToNow(agent.lastHeartbeat, { addSuffix: true, locale: zhCN })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tasks by Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent mb-4 flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              任务看板
            </h2>
            <div className="space-y-4">
              {(["in_progress", "assigned", "review", "blocked"] as TaskStatus[]).map(status => {
                const statusTasks = tasks?.filter((t: any) => t.status === status) || [];
                const config = statusConfig[status];
                
                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-2">
                      <config.icon className={`w-3 h-3 ${config.color}`} />
                      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-mc-muted ml-auto">{statusTasks.length}</span>
                    </div>
                    <div className="space-y-1">
                      {statusTasks.slice(0, 3).map((task: any) => {
                        const priorityConf = priorityConfig[task.priority as Priority];
                        const assignees = agents?.filter((a: any) => task.assigneeIds.includes(a._id)) || [];
                        
                        return (
                          <div key={task._id} className="flex items-center gap-2 p-2 rounded bg-mc-bg/50 border border-mc-border/30">
                            <span className={`text-xs px-1 rounded ${priorityConf.bg} ${priorityConf.color}`}>
                              {task.priority}
                            </span>
                            <span className="flex-1 text-sm text-mc-text truncate">{task.title}</span>
                            <div className="flex -space-x-1">
                              {assignees.slice(0, 2).map((a: any) => (
                                <div 
                                  key={a._id}
                                  className="w-5 h-5 rounded-full bg-mc-accent/20 border border-mc-accent/50 flex items-center justify-center text-[10px] text-mc-accent"
                                  title={a.name}
                                >
                                  {a.name[0]}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {statusTasks.length > 3 && (
                        <p className="text-xs text-mc-muted text-center py-1">
                          +{statusTasks.length - 3} 更多
                        </p>
                      )}
                      {statusTasks.length === 0 && (
                        <p className="text-xs text-mc-muted/50 text-center py-2">无任务</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              实时动态
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {activities?.map((activity: any) => {
                const agent = agents?.find((a: any) => a._id === activity.agentId);
                
                return (
                  <div key={activity._id} className="flex gap-3 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-mc-accent/10 border border-mc-accent/30 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-mc-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-mc-accent">{agent?.name || "System"}</span>
                        <span className="text-xs text-mc-muted">
                          {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: zhCN })}
                        </span>
                      </div>
                      <p className="text-xs text-mc-muted mt-0.5 line-clamp-2">{activity.message}</p>
                    </div>
                  </div>
                );
              })}
              {(!activities || activities.length === 0) && (
                <p className="text-sm text-mc-muted/50 text-center py-8">暂无活动</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Footer hint */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-mc-muted">
            <MessageCircle className="w-3 h-3 inline mr-1" />
            通过 Telegram 与 Agent 对话，创建任务或发送指令
          </p>
        </div>
      </main>
    </div>
  );
}
