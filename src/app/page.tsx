"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
  AlertTriangle,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from "date-fns/locale";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "blocked" | "done";
type Priority = "P0" | "P1" | "P2" | "P3";

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<any> }> = {
  inbox: { label: "收件箱", color: "text-slate-400", bgColor: "bg-slate-500/20", icon: Inbox },
  assigned: { label: "已分配", color: "text-blue-400", bgColor: "bg-blue-500/20", icon: Users },
  in_progress: { label: "进行中", color: "text-cyan-400", bgColor: "bg-cyan-500/20", icon: Play },
  review: { label: "待审核", color: "text-purple-400", bgColor: "bg-purple-500/20", icon: Eye },
  blocked: { label: "已阻塞", color: "text-red-400", bgColor: "bg-red-500/20", icon: Pause },
  done: { label: "已完成", color: "text-emerald-400", bgColor: "bg-emerald-500/20", icon: CheckCircle2 },
};

const statusFlow: TaskStatus[] = ["inbox", "assigned", "in_progress", "review", "done"];

const priorityConfig: Record<Priority, { label: string; color: string; bg: string; border: string }> = {
  P0: { label: "P0", color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/50" },
  P1: { label: "P1", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/50" },
  P2: { label: "P2", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/50" },
  P3: { label: "P3", color: "text-slate-400", bg: "bg-slate-500/20", border: "border-slate-500/50" },
};

export default function MissionControl() {
  const [activeTab, setActiveTab] = useState<"tasks" | "status">("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);

  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.getRecent, { limit: 50 });

  const activeAgents = agents?.filter(a => a.status === "active").length || 0;
  const selectedTask = tasks?.find(t => t._id === selectedTaskId);

  return (
    <div className="min-h-screen bg-mc-bg grid-pattern">
      {/* Header */}
      <header className="border-b border-mc-border bg-mc-panel/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
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

      <main className="max-w-[1600px] mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === "tasks" ? (
            <TasksView 
              key="tasks" 
              tasks={tasks} 
              agents={agents}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
          ) : (
            <StatusView key="status" agents={agents} tasks={tasks} activities={activities} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================
// Tasks View - Master-Detail Layout
// ============================================
function TasksView({ 
  tasks, 
  agents, 
  selectedTaskId, 
  onSelectTask 
}: { 
  tasks: any; 
  agents: any; 
  selectedTaskId: Id<"tasks"> | null;
  onSelectTask: (id: Id<"tasks"> | null) => void;
}) {
  const selectedTask = tasks?.find((t: any) => t._id === selectedTaskId);
  
  // 按优先级和时间排序
  const sortedTasks = tasks?.slice().sort((a: any, b: any) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const pDiff = priorityOrder[a.priority as Priority] - priorityOrder[b.priority as Priority];
    if (pDiff !== 0) return pDiff;
    return b.createdAt - a.createdAt;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-6 h-[calc(100vh-140px)]"
    >
      {/* Left: Task List */}
      <div className="w-96 flex-shrink-0 flex flex-col">
        <div className="bg-mc-panel border border-mc-border rounded-lg flex flex-col h-full">
          <div className="p-4 border-b border-mc-border">
            <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              任务列表
              <span className="ml-auto text-xs bg-mc-bg px-2 py-0.5 rounded text-mc-muted">
                {tasks?.length || 0}
              </span>
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sortedTasks?.map((task: any) => {
              const priorityConf = priorityConfig[task.priority as Priority];
              const statusConf = statusConfig[task.status as TaskStatus];
              const isSelected = task._id === selectedTaskId;
              
              return (
                <button
                  key={task._id}
                  onClick={() => onSelectTask(task._id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    isSelected 
                      ? "bg-mc-accent/20 border border-mc-accent" 
                      : "bg-mc-bg/50 border border-transparent hover:border-mc-border hover:bg-mc-bg"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConf.bg} ${priorityConf.color} font-bold flex-shrink-0`}>
                      {task.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium truncate ${isSelected ? "text-mc-accent" : "text-mc-text"}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${statusConf.color}`}>{statusConf.label}</span>
                        <span className="text-xs text-mc-muted">·</span>
                        <span className="text-xs text-mc-muted">
                          {formatDistanceToNow(task.createdAt, { addSuffix: true, locale: zhCN })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-mc-accent" : "text-mc-muted"}`} />
                  </div>
                </button>
              );
            })}
            
            {(!tasks || tasks.length === 0) && (
              <div className="flex flex-col items-center justify-center h-48 text-mc-muted/50">
                <Inbox className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">暂无任务</p>
                <p className="text-xs mt-1">通过 Telegram 创建新任务</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Task Detail */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {selectedTask ? (
            <TaskDetail key={selectedTask._id} task={selectedTask} agents={agents} />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center bg-mc-panel border border-mc-border rounded-lg"
            >
              <div className="text-center text-mc-muted/50">
                <ListTodo className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">选择一个任务查看详情</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================
// Task Detail Component
// ============================================
function TaskDetail({ task, agents }: { task: any; agents: any }) {
  const priorityConf = priorityConfig[task.priority as Priority];
  const statusConf = statusConfig[task.status as TaskStatus];
  const assignees = agents?.filter((a: any) => task.assigneeIds?.includes(a._id)) || [];
  const creator = agents?.find((a: any) => a._id === task.createdBy);

  // 获取当前状态在流程中的位置
  const currentStatusIndex = statusFlow.indexOf(task.status);
  const isBlocked = task.status === "blocked";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full bg-mc-panel border border-mc-border rounded-lg flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-mc-border">
        <div className="flex items-start gap-4">
          <span className={`text-sm px-2 py-1 rounded border ${priorityConf.bg} ${priorityConf.border} ${priorityConf.color} font-bold`}>
            {priorityConf.label}
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold text-mc-text mb-2">{task.title}</h2>
            <div className="flex items-center gap-4 text-sm text-mc-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                创建于 {format(task.createdAt, "yyyy-MM-dd HH:mm", { locale: zhCN })}
              </span>
              {creator && (
                <span className="flex items-center gap-1">
                  <Bot className="w-4 h-4" />
                  {creator.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Flow */}
      <div className="p-6 border-b border-mc-border">
        <h3 className="text-xs font-display uppercase tracking-wider text-mc-muted mb-4">状态流转</h3>
        
        {isBlocked ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">任务已阻塞</p>
              <p className="text-xs text-mc-muted mt-1">需要解决阻塞问题后继续</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {statusFlow.map((status, index) => {
              const conf = statusConfig[status];
              const isCompleted = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const isPending = index > currentStatusIndex;
              
              return (
                <div key={status} className="flex items-center">
                  {/* Status Node */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    isCurrent 
                      ? `${conf.bgColor} border-current ${conf.color}` 
                      : isCompleted
                        ? "bg-mc-success/20 border-mc-success/50 text-mc-success"
                        : "bg-mc-bg border-mc-border text-mc-muted/50"
                  }`}>
                    <conf.icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{conf.label}</span>
                  </div>
                  
                  {/* Arrow */}
                  {index < statusFlow.length - 1 && (
                    <ArrowRight className={`w-4 h-4 mx-1 ${
                      isCompleted ? "text-mc-success" : "text-mc-muted/30"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Current Status Badge */}
        <div className="mt-4">
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConf.bgColor} ${statusConf.color}`}>
            <statusConf.icon className="w-4 h-4" />
            <span className="font-medium">当前状态: {statusConf.label}</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <div>
          <h3 className="text-xs font-display uppercase tracking-wider text-mc-muted mb-3">任务描述</h3>
          <p className="text-mc-text leading-relaxed">
            {task.description || <span className="text-mc-muted/50">暂无描述</span>}
          </p>
        </div>

        {/* Assignees */}
        <div>
          <h3 className="text-xs font-display uppercase tracking-wider text-mc-muted mb-3">负责人</h3>
          {assignees.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {assignees.map((agent: any) => (
                <div 
                  key={agent._id}
                  className="flex items-center gap-3 px-4 py-2 bg-mc-bg rounded-lg border border-mc-border"
                >
                  <div className="w-8 h-8 rounded-lg bg-mc-accent/20 border border-mc-accent/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-mc-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-mc-text">{agent.name}</p>
                    <p className="text-xs text-mc-muted">{agent.role}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ml-2 ${
                    agent.status === "active" ? "bg-mc-success" : "bg-mc-muted"
                  }`} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-mc-muted/50">未分配</p>
          )}
        </div>

        {/* Meta Info */}
        <div>
          <h3 className="text-xs font-display uppercase tracking-wider text-mc-muted mb-3">其他信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-mc-bg rounded-lg border border-mc-border">
              <p className="text-xs text-mc-muted mb-1">优先级</p>
              <p className={`font-medium ${priorityConf.color}`}>{priorityConf.label}</p>
            </div>
            <div className="p-3 bg-mc-bg rounded-lg border border-mc-border">
              <p className="text-xs text-mc-muted mb-1">最后更新</p>
              <p className="font-medium text-mc-text">
                {formatDistanceToNow(task.updatedAt, { addSuffix: true, locale: zhCN })}
              </p>
            </div>
            {task.dueDate && (
              <div className="p-3 bg-mc-bg rounded-lg border border-mc-border">
                <p className="text-xs text-mc-muted mb-1">截止日期</p>
                <p className="font-medium text-mc-text">
                  {format(task.dueDate, "yyyy-MM-dd", { locale: zhCN })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Status View
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
