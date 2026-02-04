"use client";

import { useState, useEffect } from "react";
import { useTasks, useAgents, useActivities } from "@/hooks/useApi";
import { motion } from "framer-motion";
import {
  Activity,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "blocked" | "done";
type Priority = "P0" | "P1" | "P2" | "P3";

const priorityColors: Record<Priority, string> = {
  P0: "bg-rose-500",
  P1: "bg-amber-500",
  P2: "bg-sky-500",
  P3: "bg-stone-400",
};

const statusInfo: Record<TaskStatus, { label: string; color: string; icon: any }> = {
  inbox: { label: "收件箱", color: "bg-slate-500", icon: Clock },
  assigned: { label: "已分配", color: "bg-sky-500", icon: Users },
  in_progress: { label: "进行中", color: "bg-amber-500", icon: Activity },
  review: { label: "待审查", color: "bg-violet-500", icon: AlertCircle },
  blocked: { label: "阻塞", color: "bg-rose-500", icon: AlertCircle },
  done: { label: "已完成", color: "bg-emerald-500", icon: CheckCircle2 },
};

export default function StatusDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const tasks = useTasks();
  const agents = useAgents();
  const activities = useActivities(20);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Track API status based on data updates
  useEffect(() => {
    if (tasks !== undefined) {
      setApiStatus("online");
      setLastUpdate(new Date());
    }
  }, [tasks]);

  // Check for stale data (no update in 30s)
  useEffect(() => {
    const checkStale = setInterval(() => {
      if (lastUpdate && Date.now() - lastUpdate.getTime() > 30000) {
        setApiStatus("offline");
      }
    }, 5000);
    return () => clearInterval(checkStale);
  }, [lastUpdate]);

  // Calculate stats
  const tasksByStatus = (tasks || []).reduce((acc, task) => {
    const status = task.status as TaskStatus;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);

  const tasksByPriority = (tasks || []).reduce((acc, task) => {
    const priority = (task.priority || "P3") as Priority;
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<Priority, number>);

  const activeAgents = (agents || []).filter(a => 
    (tasks || []).some(t => 
      t.assigneeIds?.includes(a._id) && 
      ["in_progress", "assigned"].includes(t.status)
    )
  );

  const totalTasks = tasks?.length || 0;
  const activeTasks = (tasksByStatus.in_progress || 0) + (tasksByStatus.assigned || 0);
  const completedTasks = tasksByStatus.done || 0;
  const blockedTasks = tasksByStatus.blocked || 0;
  const reviewTasks = tasksByStatus.review || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MISSION CONTROL</h1>
              <p className="text-stone-400 text-sm">Robot R&D Team · 状态监控</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* API Status */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              apiStatus === "online" ? "bg-emerald-500/20 border border-emerald-500/50" :
              apiStatus === "offline" ? "bg-rose-500/20 border border-rose-500/50" :
              "bg-amber-500/20 border border-amber-500/50"
            }`}>
              {apiStatus === "online" ? (
                <><Wifi className="w-4 h-4 text-emerald-400" /><span className="text-sm text-emerald-400">ONLINE</span></>
              ) : apiStatus === "offline" ? (
                <><WifiOff className="w-4 h-4 text-rose-400" /><span className="text-sm text-rose-400">OFFLINE</span></>
              ) : (
                <><Server className="w-4 h-4 text-amber-400 animate-pulse" /><span className="text-sm text-amber-400">CONNECTING...</span></>
              )}
            </div>
            
            {/* Clock */}
            <div className="text-right">
              <div className="text-3xl font-mono font-bold tabular-nums">
                {currentTime.toLocaleTimeString("zh-CN", { hour12: false })}
              </div>
              <div className="text-stone-400 text-sm">
                {currentTime.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="总任务" 
          value={totalTasks} 
          icon={<Server className="w-5 h-5" />}
          color="bg-stone-700"
        />
        <StatCard 
          title="进行中" 
          value={activeTasks} 
          icon={<Activity className="w-5 h-5" />}
          color="bg-amber-500/20"
          accent="text-amber-400"
        />
        <StatCard 
          title="已完成" 
          value={completedTasks} 
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="bg-emerald-500/20"
          accent="text-emerald-400"
        />
        <StatCard 
          title="待审查" 
          value={reviewTasks} 
          icon={<AlertCircle className="w-5 h-5" />}
          color="bg-violet-500/20"
          accent="text-violet-400"
          highlight={reviewTasks > 0}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Status Breakdown */}
        <div className="lg:col-span-1 bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-stone-400" />
            任务状态分布
          </h2>
          <div className="space-y-3">
            {(Object.entries(statusInfo) as [TaskStatus, typeof statusInfo[TaskStatus]][]).map(([status, info]) => {
              const count = tasksByStatus[status] || 0;
              const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
              const Icon = info.icon;
              return (
                <div key={status} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-stone-400" />
                  <span className="text-sm text-stone-300 w-16">{info.label}</span>
                  <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full ${info.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-sm font-mono w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="lg:col-span-1 bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-stone-400" />
            优先级分布
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {(["P0", "P1", "P2", "P3"] as Priority[]).map(priority => {
              const count = tasksByPriority[priority] || 0;
              return (
                <div key={priority} className="bg-stone-900/50 rounded-xl p-4 border border-stone-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-3 h-3 rounded-full ${priorityColors[priority]}`} />
                    <span className="text-sm font-medium">{priority}</span>
                  </div>
                  <div className="text-3xl font-bold">{count}</div>
                </div>
              );
            })}
          </div>
          
          {blockedTasks > 0 && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{blockedTasks} 个任务被阻塞</span>
              </div>
            </div>
          )}
        </div>

        {/* Active Agents */}
        <div className="lg:col-span-1 bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-stone-400" />
            团队成员 ({agents?.length || 0})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(agents || []).map(agent => {
              const agentTasks = (tasks || []).filter(t => t.assigneeIds?.includes(agent._id));
              const inProgress = agentTasks.filter(t => t.status === "in_progress").length;
              const isActive = inProgress > 0;
              
              return (
                <div key={agent._id} className={`flex items-center gap-3 p-3 rounded-lg ${
                  isActive ? "bg-amber-500/10 border border-amber-500/30" : "bg-stone-900/50"
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isActive ? "bg-amber-400 animate-pulse" : "bg-stone-600"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{agent.name}</div>
                    <div className="text-xs text-stone-400">{agent.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{agentTasks.length}</div>
                    <div className="text-xs text-stone-500">任务</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-stone-400" />
          最近活动
        </h2>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(activities || []).slice(0, 10).map((activity, i) => (
            <div key={activity._id || i} className="flex items-center gap-3 py-2 border-b border-stone-700/50 last:border-0">
              <div className="w-2 h-2 rounded-full bg-stone-500" />
              <span className="text-sm text-stone-300 flex-1">{activity.description || activity.action}</span>
              <span className="text-xs text-stone-500">
                {activity.createdAt && formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: zhCN })}
              </span>
            </div>
          ))}
          {(!activities || activities.length === 0) && (
            <div className="text-center text-stone-500 py-4">暂无活动记录</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-stone-500 text-sm">
        {lastUpdate && (
          <span>最后更新: {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: zhCN })}</span>
        )}
      </footer>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  color, 
  accent = "text-white",
  highlight = false 
}: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string;
  accent?: string;
  highlight?: boolean;
}) {
  return (
    <motion.div 
      className={`${color} rounded-2xl p-6 border border-stone-700 ${highlight ? "ring-2 ring-violet-500" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-stone-400">{icon}</span>
        {highlight && <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />}
      </div>
      <div className={`text-4xl font-bold ${accent}`}>{value}</div>
      <div className="text-stone-400 text-sm mt-1">{title}</div>
    </motion.div>
  );
}
