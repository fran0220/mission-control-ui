"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Users, 
  ListTodo, 
  Bell, 
  Plus, 
  Send,
  Circle,
  Clock,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  Eye,
  ChevronRight,
  Bot,
  Zap,
  MessageSquare
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
  P0: { label: "P0 紧急", color: "text-red-400", bg: "bg-red-500/20 border-red-500/50" },
  P1: { label: "P1 高", color: "text-orange-400", bg: "bg-orange-500/20 border-orange-500/50" },
  P2: { label: "P2 中", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/50" },
  P3: { label: "P3 低", color: "text-slate-400", bg: "bg-slate-500/20 border-slate-500/50" },
};

export default function MissionControl() {
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks" | "agents" | "activity">("dashboard");

  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.getRecent, { limit: 30 });

  const selectedTask = tasks?.find(t => t._id === selectedTaskId);

  return (
    <div className="min-h-screen bg-mc-bg grid-pattern">
      {/* Header */}
      <header className="border-b border-mc-border bg-mc-panel/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-mc-accent/20 border border-mc-accent flex items-center justify-center">
                  <Zap className="w-6 h-6 text-mc-accent" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold tracking-wider text-mc-accent glow-text">
                    MISSION CONTROL
                  </h1>
                  <p className="text-xs text-mc-muted font-mono">AI Agent Squad Command Center</p>
                </div>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              {[
                { id: "dashboard", label: "总览", icon: Activity },
                { id: "tasks", label: "任务", icon: ListTodo },
                { id: "agents", label: "团队", icon: Users },
                { id: "activity", label: "动态", icon: Bell },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                    activeTab === tab.id
                      ? "bg-mc-accent/20 text-mc-accent border border-mc-accent"
                      : "text-mc-muted hover:text-mc-text hover:bg-mc-panel"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-mc-muted">
                <Circle className="w-2 h-2 fill-mc-success text-mc-success" />
                <span>{agents?.filter(a => a.status === "active").length || 0} 在线</span>
              </div>
              <button
                onClick={() => setShowCreateTask(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                新建任务
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <DashboardView
              key="dashboard"
              agents={agents}
              tasks={tasks}
              activities={activities}
              onSelectTask={setSelectedTaskId}
            />
          )}
          {activeTab === "tasks" && (
            <TasksView
              key="tasks"
              tasks={tasks}
              agents={agents}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
          )}
          {activeTab === "agents" && (
            <AgentsView key="agents" agents={agents} tasks={tasks} />
          )}
          {activeTab === "activity" && (
            <ActivityView key="activity" activities={activities} agents={agents} tasks={tasks} />
          )}
        </AnimatePresence>
      </main>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateTask && (
          <CreateTaskModal
            agents={agents}
            onClose={() => setShowCreateTask(false)}
          />
        )}
      </AnimatePresence>

      {/* Task Detail Sidebar */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailSidebar
            task={selectedTask}
            agents={agents}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Dashboard View Component
function DashboardView({ agents, tasks, activities, onSelectTask }: any) {
  const tasksByStatus = tasks?.reduce((acc: any, task: any) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "总任务", value: tasks?.length || 0, icon: ListTodo, color: "text-mc-accent" },
          { label: "进行中", value: tasksByStatus.in_progress || 0, icon: Play, color: "text-mc-accent" },
          { label: "待审核", value: tasksByStatus.review || 0, icon: Eye, color: "text-purple-400" },
          { label: "已完成", value: tasksByStatus.done || 0, icon: CheckCircle2, color: "text-mc-success" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card glow-border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-mc-muted text-xs uppercase tracking-wider">{stat.label}</p>
                <p className={`text-3xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Agents Status */}
        <div className="card col-span-1">
          <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Agent 状态
          </h2>
          <div className="space-y-3">
            {agents?.map((agent: any) => (
              <AgentStatusRow key={agent._id} agent={agent} />
            ))}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="card col-span-1">
          <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent mb-4 flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            最新任务
          </h2>
          <div className="space-y-2">
            {tasks?.slice(0, 6).map((task: any) => (
              <TaskRow key={task._id} task={task} onClick={() => onSelectTask(task._id)} />
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card col-span-1">
          <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            实时动态
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activities?.slice(0, 10).map((activity: any) => (
              <ActivityRow key={activity._id} activity={activity} agents={agents} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Tasks Kanban View
function TasksView({ tasks, agents, selectedTaskId, onSelectTask }: any) {
  const columns: TaskStatus[] = ["inbox", "assigned", "in_progress", "review", "done"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex gap-4 overflow-x-auto pb-4"
    >
      {columns.map((status) => {
        const columnTasks = tasks?.filter((t: any) => t.status === status) || [];
        const config = statusConfig[status];
        
        return (
          <div key={status} className="flex-shrink-0 w-80">
            <div className="flex items-center gap-2 mb-4 px-2">
              <config.icon className={`w-4 h-4 ${config.color}`} />
              <h3 className={`font-display text-sm uppercase tracking-wider ${config.color}`}>
                {config.label}
              </h3>
              <span className="ml-auto text-xs text-mc-muted bg-mc-panel px-2 py-0.5 rounded">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {columnTasks.map((task: any) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  agents={agents}
                  isSelected={task._id === selectedTaskId}
                  onClick={() => onSelectTask(task._id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

// Agents View
function AgentsView({ agents, tasks }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-3 gap-6"
    >
      {agents?.map((agent: any) => {
        const agentTasks = tasks?.filter((t: any) => t.assigneeIds.includes(agent._id)) || [];
        const activeTasks = agentTasks.filter((t: any) => t.status === "in_progress");
        
        return (
          <motion.div
            key={agent._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card panel-hover"
          >
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-mc-accent/30 to-mc-accent/10 border border-mc-accent/50 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-mc-accent" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-mc-panel ${
                  agent.status === "active" ? "bg-mc-success" : 
                  agent.status === "blocked" ? "bg-mc-danger" : "bg-mc-muted"
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-mc-text">{agent.name}</h3>
                <p className="text-sm text-mc-accent">{agent.role}</p>
                <p className="text-xs text-mc-muted mt-1 font-mono">{agent.sessionKey}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-mc-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-display font-bold text-mc-text">{agentTasks.length}</p>
                  <p className="text-xs text-mc-muted">总任务</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-mc-accent">{activeTasks.length}</p>
                  <p className="text-xs text-mc-muted">进行中</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-mc-success">
                    {agentTasks.filter((t: any) => t.status === "done").length}
                  </p>
                  <p className="text-xs text-mc-muted">已完成</p>
                </div>
              </div>
            </div>

            {agent.lastHeartbeat && (
              <div className="mt-4 flex items-center gap-2 text-xs text-mc-muted">
                <Clock className="w-3 h-3" />
                <span>
                  最后心跳: {formatDistanceToNow(agent.lastHeartbeat, { addSuffix: true, locale: zhCN })}
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-1">
              {agent.mentionPatterns?.map((pattern: string) => (
                <span key={pattern} className="text-xs px-2 py-0.5 bg-mc-accent/10 text-mc-accent rounded">
                  {pattern}
                </span>
              ))}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// Activity View
function ActivityView({ activities, agents, tasks }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="card">
        <h2 className="text-sm font-display uppercase tracking-wider text-mc-accent mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          活动流
        </h2>
        <div className="space-y-4">
          {activities?.map((activity: any) => {
            const agent = agents?.find((a: any) => a._id === activity.agentId);
            const task = tasks?.find((t: any) => t._id === activity.taskId);
            
            return (
              <div key={activity._id} className="flex gap-4 group">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-mc-accent/10 border border-mc-accent/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-mc-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-mc-text">{agent?.name || "Unknown"}</span>
                    <span className="text-mc-muted">·</span>
                    <span className="text-xs text-mc-muted">
                      {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: zhCN })}
                    </span>
                  </div>
                  <p className="text-sm text-mc-muted mt-1">{activity.message}</p>
                  {task && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <ListTodo className="w-3 h-3 text-mc-accent" />
                      <span className="text-mc-accent">{task.title}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Helper Components
function AgentStatusRow({ agent }: any) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-mc-bg/50 transition-colors">
      <div className={`w-2 h-2 rounded-full ${
        agent.status === "active" ? "bg-mc-success status-pulse" : 
        agent.status === "blocked" ? "bg-mc-danger" : "bg-mc-muted"
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-mc-text truncate">{agent.name}</p>
        <p className="text-xs text-mc-muted truncate">{agent.role}</p>
      </div>
      {agent.lastHeartbeat && (
        <span className="text-xs text-mc-muted">
          {formatDistanceToNow(agent.lastHeartbeat, { addSuffix: true, locale: zhCN })}
        </span>
      )}
    </div>
  );
}

function TaskRow({ task, onClick }: any) {
  const config = statusConfig[task.status as TaskStatus];
  const priorityConf = priorityConfig[task.priority as Priority];
  
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2 rounded-lg hover:bg-mc-bg/50 transition-colors flex items-center gap-3 group"
    >
      <span className={`text-xs px-1.5 py-0.5 rounded border ${priorityConf.bg} ${priorityConf.color}`}>
        {task.priority}
      </span>
      <span className="flex-1 text-sm text-mc-text truncate">{task.title}</span>
      <ChevronRight className="w-4 h-4 text-mc-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function TaskCard({ task, agents, isSelected, onClick }: any) {
  const priorityConf = priorityConfig[task.priority as Priority];
  const assignees = agents?.filter((a: any) => task.assigneeIds.includes(a._id)) || [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`card-hover ${isSelected ? "border-mc-accent glow-border" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs px-1.5 py-0.5 rounded border ${priorityConf.bg} ${priorityConf.color}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className="text-xs text-mc-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString("zh-CN")}
          </span>
        )}
      </div>
      <h4 className="font-medium text-mc-text mb-2">{task.title}</h4>
      <p className="text-xs text-mc-muted line-clamp-2 mb-3">{task.description}</p>
      
      {assignees.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {assignees.slice(0, 3).map((agent: any) => (
              <div
                key={agent._id}
                className="w-6 h-6 rounded-full bg-mc-accent/20 border border-mc-accent/50 flex items-center justify-center text-xs text-mc-accent"
                title={agent.name}
              >
                {agent.name[0]}
              </div>
            ))}
          </div>
          {assignees.length > 3 && (
            <span className="text-xs text-mc-muted">+{assignees.length - 3}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ActivityRow({ activity, agents }: any) {
  const agent = agents?.find((a: any) => a._id === activity.agentId);
  
  return (
    <div className="flex items-start gap-2 text-xs py-1">
      <span className="text-mc-accent font-medium">{agent?.name || "?"}</span>
      <span className="text-mc-muted flex-1 truncate">{activity.message}</span>
      <span className="text-mc-muted/50 whitespace-nowrap">
        {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: zhCN })}
      </span>
    </div>
  );
}

// Create Task Modal
function CreateTaskModal({ agents, onClose }: any) {
  const createTask = useMutation(api.tasks.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("P2");
  const [assigneeIds, setAssigneeIds] = useState<Id<"agents">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createTask({
        title,
        description,
        priority,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      });
      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
    setIsSubmitting(false);
  };

  const toggleAssignee = (id: Id<"agents">) => {
    setAssigneeIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card w-full max-w-lg glow-border"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-display font-bold text-mc-accent mb-6">创建新任务</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-mc-muted uppercase tracking-wider mb-2">
              任务标题
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
              placeholder="输入任务标题..."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-mc-muted uppercase tracking-wider mb-2">
              描述
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input-field min-h-24 resize-none"
              placeholder="详细描述任务内容..."
            />
          </div>

          <div>
            <label className="block text-xs text-mc-muted uppercase tracking-wider mb-2">
              优先级
            </label>
            <div className="flex gap-2">
              {(["P0", "P1", "P2", "P3"] as Priority[]).map(p => {
                const config = priorityConfig[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-3 py-1.5 rounded border text-sm transition-all ${
                      priority === p 
                        ? `${config.bg} ${config.color} border-current` 
                        : "bg-mc-bg border-mc-border text-mc-muted hover:border-mc-accent/50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs text-mc-muted uppercase tracking-wider mb-2">
              分配给 (可选)
            </label>
            <div className="flex flex-wrap gap-2">
              {agents?.map((agent: any) => (
                <button
                  key={agent._id}
                  type="button"
                  onClick={() => toggleAssignee(agent._id)}
                  className={`px-3 py-1.5 rounded border text-sm transition-all flex items-center gap-2 ${
                    assigneeIds.includes(agent._id)
                      ? "bg-mc-accent/20 border-mc-accent text-mc-accent"
                      : "bg-mc-bg border-mc-border text-mc-muted hover:border-mc-accent/50"
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  {agent.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
            <button type="submit" disabled={isSubmitting || !title.trim()} className="btn-primary">
              {isSubmitting ? "创建中..." : "创建任务"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Task Detail Sidebar
function TaskDetailSidebar({ task, agents, onClose }: any) {
  const messages = useQuery(api.messages.getByTask, { taskId: task._id });
  const createMessage = useMutation(api.messages.create);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  
  const [messageContent, setMessageContent] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<Id<"agents">[]>([]);

  const assignees = agents?.filter((a: any) => task.assigneeIds.includes(a._id)) || [];
  const statusConf = statusConfig[task.status as TaskStatus];
  const priorityConf = priorityConfig[task.priority as Priority];

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !agents?.length) return;

    const fromAgent = agents[0];
    try {
      await createMessage({
        taskId: task._id,
        fromAgentId: fromAgent._id,
        content: messageContent,
        mentions: selectedMentions.length > 0 ? selectedMentions : undefined,
      });
      setMessageContent("");
      setSelectedMentions([]);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!agents?.length) return;
    try {
      await updateTaskStatus({
        taskId: task._id,
        status: newStatus,
        updatedBy: agents[0]._id,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed right-0 top-0 bottom-0 w-[480px] bg-mc-panel border-l border-mc-border shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-mc-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-1.5 py-0.5 rounded border ${priorityConf.bg} ${priorityConf.color}`}>
                {task.priority}
              </span>
              <span className={`text-xs ${statusConf.color}`}>{statusConf.label}</span>
            </div>
            <h2 className="text-lg font-display font-bold text-mc-text">{task.title}</h2>
          </div>
          <button onClick={onClose} className="text-mc-muted hover:text-mc-text p-2">
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <div>
          <h3 className="text-xs text-mc-muted uppercase tracking-wider mb-2">描述</h3>
          <p className="text-sm text-mc-text">{task.description || "无描述"}</p>
        </div>

        {/* Assignees */}
        <div>
          <h3 className="text-xs text-mc-muted uppercase tracking-wider mb-2">负责人</h3>
          <div className="flex flex-wrap gap-2">
            {assignees.length > 0 ? assignees.map((agent: any) => (
              <div key={agent._id} className="flex items-center gap-2 px-3 py-1.5 bg-mc-bg rounded-lg border border-mc-border">
                <Bot className="w-4 h-4 text-mc-accent" />
                <span className="text-sm text-mc-text">{agent.name}</span>
              </div>
            )) : (
              <span className="text-sm text-mc-muted">未分配</span>
            )}
          </div>
        </div>

        {/* Status Change */}
        <div>
          <h3 className="text-xs text-mc-muted uppercase tracking-wider mb-2">更改状态</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(statusConfig) as TaskStatus[]).map(status => {
              const config = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1.5 rounded border text-xs transition-all flex items-center gap-1.5 ${
                    task.status === status
                      ? "bg-mc-accent/20 border-mc-accent text-mc-accent"
                      : "bg-mc-bg border-mc-border text-mc-muted hover:border-mc-accent/50"
                  }`}
                >
                  <config.icon className="w-3 h-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div>
          <h3 className="text-xs text-mc-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            讨论 ({messages?.length || 0})
          </h3>
          <div className="space-y-4">
            {messages?.map((msg: any) => {
              const fromAgent = agents?.find((a: any) => a._id === msg.fromAgentId);
              return (
                <div key={msg._id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-mc-accent/20 border border-mc-accent/50 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-mc-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-mc-text">{fromAgent?.name || "Unknown"}</span>
                      <span className="text-xs text-mc-muted">
                        {formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: zhCN })}
                      </span>
                    </div>
                    <p className="text-sm text-mc-muted">{msg.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-mc-border">
        <div className="flex flex-wrap gap-1 mb-2">
          {agents?.map((agent: any) => (
            <button
              key={agent._id}
              onClick={() => setSelectedMentions(prev => 
                prev.includes(agent._id) ? prev.filter(id => id !== agent._id) : [...prev, agent._id]
              )}
              className={`text-xs px-2 py-0.5 rounded transition-all ${
                selectedMentions.includes(agent._id)
                  ? "bg-mc-accent/20 text-mc-accent"
                  : "bg-mc-bg text-mc-muted hover:text-mc-accent"
              }`}
            >
              @{agent.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={messageContent}
            onChange={e => setMessageContent(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSendMessage()}
            placeholder="输入消息... (支持 @mention)"
            className="input-field flex-1"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!messageContent.trim()}
            className="btn-primary px-4"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
