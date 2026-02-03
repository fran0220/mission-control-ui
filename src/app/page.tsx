"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Circle,
  Clock,
  ChevronRight,
  Zap,
  Users,
  Activity,
  X,
  Menu,
  PanelLeftClose,
  PanelRightClose
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "blocked" | "done";
type Priority = "P0" | "P1" | "P2" | "P3";

const statusColumns: { key: TaskStatus; label: string; dotColor: string }[] = [
  { key: "inbox", label: "INBOX", dotColor: "bg-stone-400" },
  { key: "assigned", label: "ASSIGNED", dotColor: "bg-sky-400" },
  { key: "in_progress", label: "IN PROGRESS", dotColor: "bg-amber-400" },
  { key: "review", label: "REVIEW", dotColor: "bg-violet-400" },
  { key: "done", label: "DONE", dotColor: "bg-emerald-400" },
];

const priorityStyles: Record<Priority, string> = {
  P0: "bg-rose-50 text-rose-600 border-rose-200",
  P1: "bg-amber-50 text-amber-600 border-amber-200",
  P2: "bg-sky-50 text-sky-600 border-sky-200",
  P3: "bg-stone-50 text-stone-500 border-stone-200",
};

const roleAbbr: Record<string, { abbr: string; color: string }> = {
  "项目主控": { abbr: "LEAD", color: "bg-rose-100 text-rose-600" },
  "调研分析": { abbr: "RES", color: "bg-sky-100 text-sky-600" },
  "产品经理": { abbr: "PM", color: "bg-violet-100 text-violet-600" },
  "硬件负责": { abbr: "HW", color: "bg-amber-100 text-amber-600" },
  "软件开发": { abbr: "DEV", color: "bg-emerald-100 text-emerald-600" },
  "测试验证": { abbr: "QA", color: "bg-cyan-100 text-cyan-600" },
};

export default function MissionControl() {
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.getRecent, { limit: 30 });

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setLeftDrawerOpen(false);
        setRightDrawerOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const activeAgents = agents?.filter(a => a.status === "active").length || 0;
  const totalTasks = tasks?.length || 0;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("zh-CN", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      {/* Header */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* Left: Logo + Toggle */}
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-stone-600" />
              </button>
            )}
            {!isMobile && (
              <button
                onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                title={leftDrawerOpen ? "收起团队面板" : "展开团队面板"}
              >
                <PanelLeftClose className={`w-5 h-5 text-stone-500 transition-transform ${!leftDrawerOpen ? "rotate-180" : ""}`} />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-stone-800 tracking-tight">MISSION CONTROL</h1>
                <p className="text-[10px] text-stone-400 -mt-0.5">Robot R&D Team</p>
              </div>
            </div>
          </div>

          {/* Center: Stats */}
          <div className="flex items-center gap-6 lg:gap-10">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-stone-800 tabular-nums">{activeAgents}</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider">Active</div>
            </div>
            <div className="w-px h-8 bg-stone-200" />
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-stone-800 tabular-nums">{totalTasks}</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider">Tasks</div>
            </div>
          </div>

          {/* Right: Time + Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-mono font-semibold text-stone-700 tabular-nums">{timeStr}</div>
                <div className="text-[10px] text-stone-400 uppercase">{dateStr}</div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-600">ONLINE</span>
              </div>
            </div>
            {!isMobile && (
              <button
                onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                title={rightDrawerOpen ? "收起动态面板" : "展开动态面板"}
              >
                <PanelRightClose className={`w-5 h-5 text-stone-500 transition-transform ${!rightDrawerOpen ? "rotate-180" : ""}`} />
              </button>
            )}
            {isMobile && (
              <button
                onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors relative"
              >
                <Activity className="w-5 h-5 text-stone-600" />
                {activities && activities.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-64px)] relative">
        {/* Left Drawer: Agents */}
        <AnimatePresence>
          {leftDrawerOpen && (
            <>
              {/* Mobile Overlay */}
              {isMobile && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                  onClick={() => setLeftDrawerOpen(false)}
                />
              )}
              <motion.aside
                initial={{ x: isMobile ? -280 : 0, opacity: isMobile ? 0 : 1 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`${isMobile ? "fixed left-0 top-16 bottom-0 z-50" : "relative"} w-56 bg-white border-r border-stone-200 flex flex-col`}
              >
                {/* Header */}
                <div className="h-12 px-4 flex items-center justify-between border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Agents</span>
                    <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{agents?.length || 0}</span>
                  </div>
                  {isMobile && (
                    <button onClick={() => setLeftDrawerOpen(false)} className="p-1 hover:bg-stone-100 rounded">
                      <X className="w-4 h-4 text-stone-400" />
                    </button>
                  )}
                </div>

                {/* Agent List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {agents?.map((agent: any) => {
                    const role = roleAbbr[agent.role] || { abbr: "AGT", color: "bg-stone-100 text-stone-500" };
                    return (
                      <div
                        key={agent._id}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center text-xs font-bold text-stone-600">
                            {agent.name[0]}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                            agent.status === "active" ? "bg-emerald-400" : "bg-stone-300"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-stone-700 truncate">{agent.name}</span>
                            <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${role.color}`}>{role.abbr}</span>
                          </div>
                          <div className={`text-[10px] font-medium ${
                            agent.status === "active" ? "text-amber-500" : "text-stone-400"
                          }`}>
                            {agent.status === "active" ? "● WORKING" : "○ IDLE"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Center: Mission Queue */}
        <main className="flex-1 flex flex-col min-w-0 bg-stone-100/50">
          {/* Queue Header */}
          <div className="h-12 px-4 flex items-center gap-2 bg-white border-b border-stone-200">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Mission Queue</span>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full p-4 gap-3 min-w-max">
              {statusColumns.map((col) => {
                const columnTasks = tasks?.filter((t: any) => t.status === col.key) || [];
                return (
                  <div key={col.key} className="w-64 flex-shrink-0 flex flex-col">
                    {/* Column Header */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{col.label}</span>
                      <span className="text-[10px] bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded ml-auto font-medium">
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Tasks */}
                    <div className="flex-1 space-y-2 overflow-y-auto pb-4 pr-1">
                      {columnTasks.map((task: any) => (
                        <TaskCard key={task._id} task={task} agents={agents} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right Drawer: Live Feed */}
        <AnimatePresence>
          {rightDrawerOpen && (
            <>
              {isMobile && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                  onClick={() => setRightDrawerOpen(false)}
                />
              )}
              <motion.aside
                initial={{ x: isMobile ? 300 : 0, opacity: isMobile ? 0 : 1 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`${isMobile ? "fixed right-0 top-16 bottom-0 z-50" : "relative"} w-72 bg-white border-l border-stone-200 flex flex-col`}
              >
                {/* Header */}
                <div className="h-12 px-4 flex items-center justify-between border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Live Feed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-stone-400">LIVE</span>
                    {isMobile && (
                      <button onClick={() => setRightDrawerOpen(false)} className="p-1 hover:bg-stone-100 rounded ml-2">
                        <X className="w-4 h-4 text-stone-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="px-3 py-2 border-b border-stone-100 flex gap-1.5 overflow-x-auto">
                  <FilterPill label="All" active />
                  <FilterPill label="Tasks" />
                  <FilterPill label="Comments" />
                  <FilterPill label="Status" />
                </div>

                {/* Feed */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {activities?.map((activity: any) => {
                    const agent = agents?.find((a: any) => a._id === activity.agentId);
                    const task = tasks?.find((t: any) => t._id === activity.taskId);
                    return (
                      <div key={activity._id} className="flex gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-500 flex-shrink-0">
                          {agent?.name?.[0] || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs font-semibold text-amber-600">{agent?.name || "System"}</span>
                            <span className="text-[11px] text-stone-400">
                              {activity.type === "task_created" && "创建了"}
                              {activity.type === "task_assigned" && "分配了"}
                              {activity.type === "status_changed" && "更新了"}
                              {activity.type === "message_sent" && "评论了"}
                              {activity.type === "agent_heartbeat" && "心跳"}
                            </span>
                          </div>
                          {task && (
                            <p className="text-[11px] text-stone-600 truncate mt-0.5">
                              "{task.title}"
                            </p>
                          )}
                          <span className="text-[10px] text-stone-300">
                            {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: zhCN })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {(!activities || activities.length === 0) && (
                    <div className="text-center py-8 text-stone-300 text-xs">暂无活动</div>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, agents }: { task: any; agents: any }) {
  const priorityStyle = priorityStyles[task.priority as Priority] || priorityStyles.P2;
  const assignees = agents?.filter((a: any) => task.assigneeIds?.includes(a._id)) || [];
  const creator = agents?.find((a: any) => a._id === task.createdBy);

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 hover:shadow-md hover:border-stone-300 transition-all cursor-pointer group">
      {/* Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${priorityStyle}`}>
          {task.priority}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Title */}
      <h4 className="font-semibold text-[13px] text-stone-800 mb-1 line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-[11px] text-stone-400 mb-2.5 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <div className="flex items-center gap-1.5">
          {(assignees.length > 0 ? assignees : creator ? [creator] : []).slice(0, 2).map((a: any, i: number) => (
            <div
              key={a._id}
              className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[9px] font-bold text-stone-500"
              style={{ marginLeft: i > 0 ? -6 : 0 }}
              title={a.name}
            >
              {a.name[0]}
            </div>
          ))}
          {assignees.length > 0 && (
            <span className="text-[10px] text-stone-400 ml-0.5">{assignees[0]?.name}</span>
          )}
        </div>
        <span className="text-[10px] text-stone-300 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(task.createdAt, { addSuffix: false, locale: zhCN })}
        </span>
      </div>
    </div>
  );
}

// Filter Pill Component
function FilterPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`text-[10px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-stone-100 text-stone-500 hover:bg-stone-200"
      }`}
    >
      {label}
    </button>
  );
}
