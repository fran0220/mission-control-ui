"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTasks, useAgents, useActivities, useUpdateStatus, useApproveReview, useRejectReview, useQuickCreate } from "@/hooks/useApi";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChevronRight,
  Zap,
  Users,
  Activity,
  X,
  Menu,
  PanelLeftClose,
  PanelRightClose,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "blocked" | "done";
type Priority = "P0" | "P1" | "P2" | "P3";

type StatusColumn = { key: TaskStatus; label: string; dotColor: string; tone: string };

const statusColumns: StatusColumn[] = [
  { key: "inbox", label: "收件箱", dotColor: "bg-slate-400", tone: "bg-slate-50/80 border-slate-200" },
  { key: "assigned", label: "已分配", dotColor: "bg-sky-400", tone: "bg-sky-50/80 border-sky-200" },
  { key: "in_progress", label: "进行中", dotColor: "bg-amber-400", tone: "bg-amber-50/70 border-amber-200" },
  { key: "review", label: "待审查", dotColor: "bg-violet-400", tone: "bg-violet-50/80 border-violet-200" },
  { key: "done", label: "已完成", dotColor: "bg-emerald-400", tone: "bg-emerald-50/80 border-emerald-200" },
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
  "硬件工程": { abbr: "HW", color: "bg-amber-100 text-amber-600" },
  "软件开发": { abbr: "DEV", color: "bg-emerald-100 text-emerald-600" },
  "测试验证": { abbr: "QA", color: "bg-cyan-100 text-cyan-600" },
  "质量审查": { abbr: "QA", color: "bg-violet-100 text-violet-600" },
  "工业设计": { abbr: "ID", color: "bg-pink-100 text-pink-600" },
  "结构工程": { abbr: "MD", color: "bg-orange-100 text-orange-600" },
};

const formatDurationShort = (ms: number) => {
  const minutes = Math.max(1, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const getDueInfo = (dueDate?: number) => {
  if (!dueDate) return null;
  const diff = dueDate - Date.now();
  if (diff >= 0) {
    return {
      label: `⏳ ${formatDurationShort(diff)} 后截止`,
      className: diff < 4 * 60 * 60 * 1000 ? "text-amber-500" : "text-stone-400",
    };
  }
  return {
    label: `⚠️ 逾期 ${formatDurationShort(Math.abs(diff))}`,
    className: "text-rose-500",
  };
};

const getDisplayStatus = (task: any): TaskStatus => {
  const normalizedOriginal = task.originalStatus === "blocked" ? "in_progress" : task.originalStatus;
  if (task.isBlocked) {
    return (normalizedOriginal ?? task.status) as TaskStatus;
  }
  if (task.status === "blocked") {
    return (normalizedOriginal ?? "in_progress") as TaskStatus;
  }
  return task.status as TaskStatus;
};

const getShortTaskId = (task: any) => {
  const raw = typeof task._id === "string" ? task._id.slice(-4).toUpperCase() : "0000";
  return `#${raw}`;
};

export default function MissionControl() {
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewDecision, setReviewDecision] = useState<boolean | null>(null);
  const [activityStatusFilter, setActivityStatusFilter] = useState<"all" | "blocked" | "review">("all");
  const [activityAgentFilter, setActivityAgentFilter] = useState<string>("all");
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateTitle, setQuickCreateTitle] = useState("");
  const [quickCreatePriority, setQuickCreatePriority] = useState<Priority>("P2");
  const [quickCreateAssigneeId, setQuickCreateAssigneeId] = useState<string>("");
  const [activeTask, setActiveTask] = useState<any | null>(null);

  // REST API hooks (replaces Convex hooks)
  const agents = useAgents();
  const tasks = useTasks();
  const activities = useActivities(30);
  const { mutate: approveReview } = useApproveReview();
  const { mutate: rejectReview } = useRejectReview();
  const { mutate: updateStatus } = useUpdateStatus();
  const { mutate: quickCreate } = useQuickCreate();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  const activeAgents = agents?.filter((a) => a.status === "active").length || 0;
  const totalTasks = tasks?.length || 0;
  const operatorId = useMemo(
    () => agents?.find((a: any) => a.name === "Xiaomao")?._id || agents?.[0]?._id,
    [agents]
  );

  const taskMap = useMemo(() => new Map((tasks || []).map((task: any) => [task._id, task])), [tasks]);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter((activity: any) => {
      if (activityAgentFilter !== "all" && activity.agentId !== activityAgentFilter) return false;
      if (activityStatusFilter !== "all") {
        const task = activity.taskId ? taskMap.get(activity.taskId) : null;
        if (!task) return false;
        if (activityStatusFilter === "blocked") {
          return Boolean(task.isBlocked || task.status === "blocked");
        }
        if (activityStatusFilter === "review") {
          return task.status === "review";
        }
      }
      return true;
    });
  }, [activities, activityAgentFilter, activityStatusFilter, taskMap]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("zh-CN", { weekday: "short", month: "short", day: "numeric" });

  const handleReview = async (approved: boolean) => {
    if (!reviewTarget) return;
    if (!operatorId) return;

    if (approved) {
      await approveReview({
        taskId: reviewTarget._id,
        reviewerId: operatorId,
        reviewComment: reviewComment || undefined,
      });
    } else {
      await rejectReview({
        taskId: reviewTarget._id,
        reviewerId: operatorId,
        reviewComment: reviewComment || undefined,
      });
    }

    setReviewModalOpen(false);
    setReviewTarget(null);
    setReviewComment("");
    setReviewDecision(null);
  };

  const handleQuickCreate = async () => {
    if (!quickCreateTitle.trim() || !operatorId) return;
    await quickCreate({
      title: quickCreateTitle.trim(),
      priority: quickCreatePriority,
      assigneeId: quickCreateAssigneeId ? (quickCreateAssigneeId as any) : undefined,
      createdBy: operatorId,
    });
    setQuickCreateOpen(false);
    setQuickCreateTitle("");
    setQuickCreatePriority("P2");
    setQuickCreateAssigneeId("");
  };

  const handleDragStart = (event: any) => {
    const task = tasks?.find((t: any) => t._id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const task = tasks?.find((t: any) => t._id === active.id);
    if (!task) return;

    const overStatus =
      typeof over.id === "string" && over.id.startsWith("column:")
        ? (over.id.replace("column:", "") as TaskStatus)
        : ((over.data.current?.status as TaskStatus) || null);

    if (!overStatus) return;

    const currentStatus = getDisplayStatus(task);
    if (currentStatus === overStatus) return;
    if (!operatorId) return;

    await updateStatus({
      taskId: task._id,
      status: overStatus,
      updatedBy: operatorId,
    });
  };

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
                <PanelLeftClose
                  className={`w-5 h-5 text-stone-500 transition-transform ${!leftDrawerOpen ? "rotate-180" : ""}`}
                />
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
                <PanelRightClose
                  className={`w-5 h-5 text-stone-500 transition-transform ${!rightDrawerOpen ? "rotate-180" : ""}`}
                />
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
                    <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                      {agents?.length || 0}
                    </span>
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
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              agent.status === "active" ? "bg-emerald-400" : "bg-stone-300"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-stone-700 truncate">{agent.name}</span>
                            <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${role.color}`}>
                              {role.abbr}
                            </span>
                          </div>
                          <div
                            className={`text-[10px] font-medium ${
                              agent.status === "active" ? "text-amber-500" : "text-stone-400"
                            }`}
                          >
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
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Mission Queue</span>
            </div>
            <button
              onClick={() => setQuickCreateOpen(true)}
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              快速创建
            </button>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex h-full p-4 gap-3 min-w-max">
                {statusColumns.map((col) => {
                  const columnTasks = (tasks || []).filter((task: any) => getDisplayStatus(task) === col.key);
                  return (
                    <TaskColumn
                      key={col.key}
                      column={col}
                      tasks={columnTasks}
                      agents={agents}
                      onReview={(task, decision) => {
                        setReviewTarget(task);
                        setReviewDecision(decision);
                        setReviewModalOpen(true);
                      }}
                    />
                  );
                })}
              </div>
              <DragOverlay>
                {activeTask ? (
                  <TaskCard
                    task={activeTask}
                    agents={agents}
                    onReview={() => undefined}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
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

                {/* Filters */}
                <div className="px-3 py-2 border-b border-stone-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={activityStatusFilter}
                      onChange={(e) => setActivityStatusFilter(e.target.value as any)}
                      className="text-[10px] px-2 py-1 rounded-full border border-stone-200 bg-white text-stone-600"
                    >
                      <option value="all">全部状态</option>
                      <option value="blocked">仅阻塞</option>
                      <option value="review">仅审查</option>
                    </select>
                    <select
                      value={activityAgentFilter}
                      onChange={(e) => setActivityAgentFilter(e.target.value)}
                      className="text-[10px] px-2 py-1 rounded-full border border-stone-200 bg-white text-stone-600"
                    >
                      <option value="all">全部成员</option>
                      {(agents || []).map((agent: any) => (
                        <option key={agent._id} value={agent._id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setFeedCollapsed((prev) => !prev)}
                      className="ml-auto text-[10px] px-2 py-1 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors inline-flex items-center gap-1"
                    >
                      {feedCollapsed ? "展开" : "折叠"}
                      <ChevronRight className={`w-3 h-3 transition-transform ${feedCollapsed ? "-rotate-90" : "rotate-90"}`} />
                    </button>
                  </div>
                  <div className="text-[10px] text-stone-400">筛选结果：{filteredActivities.length} 条</div>
                </div>

                {/* Feed */}
                {!feedCollapsed && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {filteredActivities.map((activity: any) => {
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
                              <p className="text-[11px] text-stone-600 truncate mt-0.5">"{task.title}"</p>
                            )}
                            <span className="text-[10px] text-stone-300">
                              {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: zhCN })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {(!filteredActivities || filteredActivities.length === 0) && (
                      <div className="text-center py-8 text-stone-300 text-xs">暂无活动</div>
                    )}
                  </div>
                )}
                {feedCollapsed && (
                  <div className="flex-1 flex items-center justify-center text-xs text-stone-300">
                    动态已折叠
                  </div>
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModalOpen && reviewTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              className="w-[92%] max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl"
            >
              <div className="px-5 py-4 border-b border-stone-100">
                <h3 className="text-sm font-semibold text-stone-700">任务审查</h3>
                <p className="text-xs text-stone-400 mt-1">{reviewTarget.title}</p>
                {reviewDecision !== null && (
                  <p className="text-[11px] mt-1 text-stone-500">
                    已选择：{reviewDecision ? "✅ 通过" : "❌ 不通过"}
                  </p>
                )}
              </div>
              <div className="px-5 py-4 space-y-3">
                <label className="text-xs font-medium text-stone-500">审查评论</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  placeholder="补充审查意见（可选）"
                />
              </div>
              <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setReviewModalOpen(false);
                    setReviewTarget(null);
                    setReviewComment("");
                    setReviewDecision(null);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-100"
                >
                  取消
                </button>
                <button
                  onClick={() => handleReview(false)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 ${
                    reviewDecision === false ? "ring-2 ring-rose-200" : ""
                  }`}
                >
                  不通过
                </button>
                <button
                  onClick={() => handleReview(true)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 ${
                    reviewDecision === true ? "ring-2 ring-emerald-200" : ""
                  }`}
                >
                  通过
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Create Modal */}
      <AnimatePresence>
        {quickCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              className="w-[92%] max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl"
            >
              <div className="px-5 py-4 border-b border-stone-100">
                <h3 className="text-sm font-semibold text-stone-700">快速创建任务</h3>
                <p className="text-xs text-stone-400 mt-1">最少字段即可快速入列</p>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-stone-500">标题</label>
                  <input
                    value={quickCreateTitle}
                    onChange={(e) => setQuickCreateTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    placeholder="输入任务标题"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-stone-500">优先级</label>
                    <select
                      value={quickCreatePriority}
                      onChange={(e) => setQuickCreatePriority(e.target.value as Priority)}
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600"
                    >
                      <option value="P0">P0</option>
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="P3">P3</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-500">负责人</label>
                    <select
                      value={quickCreateAssigneeId}
                      onChange={(e) => setQuickCreateAssigneeId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600"
                    >
                      <option value="">未分配</option>
                      {(agents || []).map((agent: any) => (
                        <option key={agent._id} value={agent._id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setQuickCreateOpen(false);
                    setQuickCreateTitle("");
                    setQuickCreatePriority("P2");
                    setQuickCreateAssigneeId("");
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-100"
                >
                  取消
                </button>
                <button
                  onClick={handleQuickCreate}
                  disabled={!quickCreateTitle.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-stone-50 bg-stone-700 hover:bg-stone-800 disabled:opacity-50"
                >
                  创建
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Column Component
function TaskColumn({
  column,
  tasks,
  agents,
  onReview,
}: {
  column: StatusColumn;
  tasks: any[];
  agents: any;
  onReview: (task: any, decision: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.key}` });

  return (
    <div className="w-64 flex-shrink-0 flex flex-col">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`w-2 h-2 rounded-full ${column.dotColor}`} />
        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{column.label}</span>
        <span className="text-[10px] bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded ml-auto font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-2xl border ${column.tone} p-2 space-y-2 overflow-y-auto pb-4 pr-1 transition-colors ${
          isOver ? "border-amber-300 bg-amber-50/60" : ""
        }`}
      >
        <SortableContext items={tasks.map((task) => task._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task._id}
              task={task}
              agents={agents}
              onReview={onReview}
              displayStatus={column.key}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && <div className="text-center text-xs text-stone-300 py-4">拖拽到此</div>}
      </div>
    </div>
  );
}

// Sortable Task Card
function SortableTaskCard({
  task,
  agents,
  onReview,
  displayStatus,
}: {
  task: any;
  agents: any;
  onReview: (task: any, decision: boolean) => void;
  displayStatus: TaskStatus;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
    data: { status: displayStatus },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-80" : ""}>
      <TaskCard
        task={task}
        agents={agents}
        onReview={onReview}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  agents,
  onReview,
  dragHandleProps,
  isDragging,
  isOverlay,
}: {
  task: any;
  agents: any;
  onReview: (task: any, decision: boolean) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
  isOverlay?: boolean;
}) {
  const priorityStyle = priorityStyles[task.priority as Priority] || priorityStyles.P2;
  const assignees = agents?.filter((a: any) => task.assigneeIds?.includes(a._id)) || [];
  const creator = agents?.find((a: any) => a._id === task.createdBy);
  const reviewer = agents?.find((a: any) => a._id === task.reviewerId);
  const hasReviewComment = Boolean(task.reviewComment);
  const isBlocked = Boolean(task.isBlocked || task.status === "blocked");
  const statusSince = task.stateChangedAt ?? task.updatedAt ?? task.createdAt;
  const statusAgeMs = Date.now() - statusSince;
  const statusAgeLabel = `已停留 ${formatDurationShort(statusAgeMs)}`;
  const statusAgeClass = statusAgeMs > 24 * 60 * 60 * 1000 ? "text-rose-500" : "text-stone-300";
  const dueInfo = getDueInfo(task.dueDate);

  return (
    <div
      {...dragHandleProps}
      className={`rounded-xl border p-3 transition-all group ${
        isBlocked ? "border-rose-400 bg-rose-50/40" : "border-stone-200 bg-white"
      } ${
        isDragging || isOverlay ? "shadow-lg" : "hover:shadow-md hover:border-stone-300"
      } ${dragHandleProps ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {/* Priority + ID */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${priorityStyle}`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-400 font-mono">{getShortTaskId(task)}</span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-[13px] text-stone-800 mb-1 line-clamp-2 leading-snug">{task.title}</h4>

      {/* Description */}
      {task.description && (
        <p className="text-[11px] text-stone-400 mb-2.5 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {/* Status Meta */}
      {(task.status === "review" || isBlocked || hasReviewComment || reviewer) && (
        <div className="mb-2.5 space-y-1">
          {task.status === "review" && (
            <div className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide">⏳ 待审查</div>
          )}
          {isBlocked && (
            <div className="text-[10px] font-semibold text-rose-500 uppercase tracking-wide">🚫 阻塞中</div>
          )}
          {reviewer && <div className="text-[10px] text-stone-400">审查人: {reviewer.name}</div>}
          {hasReviewComment && <div className="text-[10px] text-stone-500 line-clamp-2">评语: {task.reviewComment}</div>}
        </div>
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
          {assignees.length > 0 && <span className="text-[10px] text-stone-400 ml-0.5">{assignees[0]?.name}</span>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {task.status === "review" && (
            <div className="flex items-center gap-1">
              <button
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onReview(task, true);
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                title="通过"
              >
                ✅
              </button>
              <button
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onReview(task, false);
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100"
                title="不通过"
              >
                ❌
              </button>
            </div>
          )}
          <span className={`text-[10px] ${statusAgeClass} flex items-center gap-1`}>
            <Clock className="w-3 h-3" />
            {statusAgeLabel}
          </span>
          {dueInfo && <span className={`text-[10px] ${dueInfo.className}`}>{dueInfo.label}</span>}
        </div>
      </div>
    </div>
  );
}
