"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
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
  LayoutGrid,
  Inbox,
  AlertTriangle
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from "date-fns/locale";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "blocked" | "done";
type Priority = "P0" | "P1" | "P2" | "P3";

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<any> }> = {
  inbox: { label: "收件箱", color: "text-slate-400", bgColor: "bg-slate-500/10", icon: Inbox },
  assigned: { label: "已分配", color: "text-blue-400", bgColor: "bg-blue-500/10", icon: Users },
  in_progress: { label: "进行中", color: "text-cyan-400", bgColor: "bg-cyan-500/10", icon: Play },
  review: { label: "待审核", color: "text-purple-400", bgColor: "bg-purple-500/10", icon: Eye },
  blocked: { label: "已阻塞", color: "text-red-400", bgColor: "bg-red-500/10", icon: Pause },
  done: { label: "已完成", color: "text-emerald-400", bgColor: "bg-emerald-500/10", icon: CheckCircle2 },
};

const priorityConfig: Record<Priority, { label: string; color: string; bg: string; border: string }> = {
  P0: { label: "P0 紧急", color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/50" },
  P1: { label: "P1 高", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/50" },
  P2: { label: "P2 中", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/50" },
  P3: { label: "P3 低", color: "text-slate-400", bg: "bg-slate-500/20", border: "border-slate-500/50" },
};

export default function MissionControl() {
  const [activeTab, setActiveTab] = useState<"tasks" | "status">("tasks");

  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.getRecent, { limit: 50 });

  const activeAgents = agents?.filter(a => a.status === "active").length || 0;

  return (
    <div className="min-h-screen bg-mc-bg grid-pattern">
      {/* Header */}
      <header className="border-b border-mc-border bg-mc-panel/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
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

            {/* Navigation */}
            <nav className="flex items-center gap-1 bg-mc-bg/50 p-1 rounded-lg border border-mc-border">
              <button
                onClick={() => setActiveTab("tasks")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-sm transition-all ${
                  activeTab === "tasks"
                    ? "bg-mc-accent/20 text-mc-accent border border-mc-accent/50"
                    : "text-mc-muted hover:text-mc-text"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                任务看板
              </button>
              <button
                onClick={() => setActiveTab("status")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-sm transition-all ${
                  activeTab === "status"
                    ? "bg-mc-accent/20 text-mc-accent border border-mc-accent/50"
                    : "text-mc-muted hover:text-mc-text"
                }`}
              >
                <Activity className="w-4 h-4" />
                系统状态
              </button>
            </nav>

            {/* Status indicator */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-mc-bg/50 rounded-lg border border-mc-border">
                <Circle className={`w-2 h-2 ${activeAgents > 0 ? "fill-mc-success text-mc-success animate-pulse" : "fill-mc-muted text-mc-muted"}`} />
                <span className="text-mc-text font-medium">{activeAgents}</span>
                <span className="text-mc-muted">/ {agents?.length || 0}</span>
                <span className="text-mc-muted text-xs">在线</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === "tasks" ? (
            <TasksBoard key="tasks" tasks={tasks} agents={agents} />
          ) : (
            <StatusView key="status" agents={agents} tasks={tasks} activities={activities} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================
// Tasks Board - Full Kanban View
// ============================================
function TasksBoard({ tasks, agents }: { tasks: any; agents: any }) {
  const columns: TaskStatus[] = ["inbox", "assigned", "in_progress", "review", "blocked", "done"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-4 overflow-x-auto pb-4"
    >
      {columns.map((status, colIndex) => {
        const columnTasks = tasks?.filter((t: any) => t.status === status) || [];
        const config = statusConfig[status];
        
        return (
          <motion.div 
            key={status} 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: colIndex * 0.05 }}
            className="flex-shrink-0 w-72"
          >
            {/* Column Header */}
            <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg ${config.bgColor} border border-mc-border/50`}>
              <config.icon className={`w-4 h-4 ${config.color}`} />
              <h3 className={`font-display text-sm uppercase tracking-wider ${config.color}`}>
                {config.label}
              </h3>
              <span className={`ml-auto text-xs font-bold ${config.color} bg-mc-bg/50 px-2 py-0.5 rounded`}>
                {columnTasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div className="space-y-3 min-h-[200px]">
              {columnTasks.map((task: any, taskIndex: number) => (
                <TaskCard 
                  key={task._id} 
                  task={task} 
                  agents={agents}
                  delay={taskIndex * 0.03}
                />
              ))}
              {columnTasks.length === 0 && (
                <div className="flex items-center justify-center h-24 border border-dashed border-mc-border/30 rounded-lg">
                  <p className="text-xs text-mc-muted/50">暂无任务</p>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function TaskCard({ task, agents, delay }: { task: any; agents: any; delay: number }) {
  const priorityConf = priorityConfig[task.priority as Priority];
  const assignees = agents?.filter((a: any) => task.assigneeIds?.includes(a._id)) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-mc-panel border border-mc-border rounded-lg p-4 hover:border-mc-accent/30 transition-all group"
    >
      {/* Header: Priority & Date */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2 py-0.5 rounded border ${priorityConf.bg} ${priorityConf.border} ${priorityConf.color} font-medium`}>
          {priorityConf.label}
        </span>
        {task.dueDate && (
          <span className="text-xs text-mc-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(task.dueDate, "MM/dd")}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-mc-text mb-2 group-hover:text-mc-accent transition-colors">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-mc-muted line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Footer: Assignees & Time */}
      <div className="flex items-center justify-between pt-3 border-t border-mc-border/50">
        {/* Assignees */}
        <div className="flex items-center gap-2">
          {assignees.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {assignees.slice(0, 3).map((agent: any) => (
                  <div
                    key={agent._id}
                    className="w-6 h-6 rounded-full bg-mc-accent/20 border-2 border-mc-panel flex items-center justify-center text-[10px] font-bold text-mc-accent"
                    title={agent.name}
                  >
                    {agent.name[0]}
                  </div>
                ))}
              </div>
              {assignees.length > 3 && (
                <span className="text-xs text-mc-muted">+{assignees.length - 3}</span>
              )}
            </>
          ) : (
            <span className="text-xs text-mc-muted/50">未分配</span>
          )}
        </div>

        {/* Created time */}
        <span className="text-xs text-mc-muted/70">
          {formatDistanceToNow(task.createdAt, { addSuffix: true, locale: zhCN })}
        </span>
      </div>
    </motion.div>
  );
}

// ============================================
// Status View - Agents & Activity
// ============================================
function StatusView({ agents, tasks, activities }: { agents: any; tasks: any; activities: any }) {
  const tasksByStatus = tasks?.reduce((acc: any, task: any) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: "总任务", value: tasks?.length || 0, icon: ListTodo, color: "text-mc-accent" },
          { label: "收件箱", value: tasksByStatus.inbox || 0, icon: Inbox, color: "text-slate-400" },
          { label: "进行中", value: tasksByStatus.in_progress || 0, icon: Play, color: "text-cyan-400" },
          { label: "待审核", value: tasksByStatus.review || 0, icon: Eye, color: "text-purple-400" },
          { label: "已阻塞", value: tasksByStatus.blocked || 0, icon: AlertTriangle, color: "text-red-400" },
          { label: "已完成", value: tasksByStatus.done || 0, icon: CheckCircle2, color: "text-emerald-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-mc-panel border border-mc-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-mc-muted text-xs uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-6 h-6 ${stat.color} opacity-30`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Agents Panel */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-mc-panel border border-mc-border rounded-lg p-6"
        >
          <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent mb-5 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Agent 团队状态
          </h2>
          <div className="space-y-4">
            {agents?.map((agent: any) => {
              const agentTasks = tasks?.filter((t: any) => t.assigneeIds?.includes(agent._id)) || [];
              const activeTasks = agentTasks.filter((t: any) => t.status === "in_progress").length;
              
              return (
                <div key={agent._id} className="flex items-center gap-4 p-4 rounded-xl bg-mc-bg/50 border border-mc-border/50">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mc-accent/20 to-mc-accent/5 border border-mc-accent/30 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-mc-accent" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-mc-panel ${
                      agent.status === "active" ? "bg-mc-success" : 
                      agent.status === "blocked" ? "bg-mc-danger" : "bg-mc-muted"
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-mc-text">{agent.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        agent.status === "active" ? "bg-mc-success/20 text-mc-success" :
                        agent.status === "blocked" ? "bg-mc-danger/20 text-mc-danger" :
                        "bg-mc-muted/20 text-mc-muted"
                      }`}>
                        {agent.status === "active" ? "工作中" : agent.status === "blocked" ? "阻塞" : "空闲"}
                      </span>
                    </div>
                    <p className="text-xs text-mc-muted">{agent.role}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-display font-bold text-mc-accent">{activeTasks}</div>
                    <div className="text-xs text-mc-muted">进行中</div>
                  </div>

                  <div className="text-right pl-4 border-l border-mc-border/50">
                    <div className="text-lg font-display font-bold text-mc-text">{agentTasks.length}</div>
                    <div className="text-xs text-mc-muted">总任务</div>
                  </div>

                  {agent.lastHeartbeat && (
                    <div className="text-right pl-4 border-l border-mc-border/50">
                      <div className="text-xs text-mc-muted">最后心跳</div>
                      <div className="text-xs text-mc-accent">
                        {formatDistanceToNow(agent.lastHeartbeat, { addSuffix: true, locale: zhCN })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-mc-panel border border-mc-border rounded-lg p-6"
        >
          <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            实时活动流
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {activities?.map((activity: any) => {
              const agent = agents?.find((a: any) => a._id === activity.agentId);
              const task = tasks?.find((t: any) => t._id === activity.taskId);
              
              return (
                <div key={activity._id} className="flex gap-4 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-mc-accent/10 border border-mc-accent/30 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-mc-accent" />
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-mc-accent">{agent?.name || "System"}</span>
                      <span className="text-xs text-mc-muted">
                        {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: zhCN })}
                      </span>
                    </div>
                    <p className="text-sm text-mc-muted">{activity.message}</p>
                    {task && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-mc-bg/50 rounded border border-mc-border/50">
                        <ListTodo className="w-3 h-3 text-mc-accent" />
                        <span className="text-mc-text">{task.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(!activities || activities.length === 0) && (
              <div className="flex items-center justify-center h-32 text-mc-muted/50 text-sm">
                暂无活动记录
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
