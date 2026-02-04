"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch";
import { useActivities, useAgents, useQuickCreate, useTasks, useUpdateStatus } from "@/hooks/useApi";
import {
  Activity,
  ChevronRight,
  Clock,
  Maximize,
  Minus,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  RotateCcw,
  Users,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type FlowStatus = "inbox" | "assigned" | "in_progress" | "review" | "done";
type TaskStatus = FlowStatus | "blocked";

const flowStatuses: FlowStatus[] = ["inbox", "assigned", "in_progress", "review", "done"];

const statusMeta: Record<FlowStatus, { label: string; description: string; tone: string; accent: string }> = {
  inbox: {
    label: "收件箱",
    description: "等待分配",
    tone: "border-slate-200 bg-slate-50/70",
    accent: "text-slate-500",
  },
  assigned: {
    label: "已分配",
    description: "已指派负责人",
    tone: "border-sky-200 bg-sky-50/70",
    accent: "text-sky-500",
  },
  in_progress: {
    label: "进行中",
    description: "正在推进",
    tone: "border-amber-200 bg-amber-50/70",
    accent: "text-amber-600",
  },
  review: {
    label: "待审查",
    description: "等待审核",
    tone: "border-violet-200 bg-violet-50/70",
    accent: "text-violet-500",
  },
  done: {
    label: "已完成",
    description: "交付完成",
    tone: "border-emerald-200 bg-emerald-50/70",
    accent: "text-emerald-600",
  },
};

const priorityStyles: Record<string, string> = {
  P0: "bg-rose-50 text-rose-600 border-rose-200",
  P1: "bg-amber-50 text-amber-600 border-amber-200",
  P2: "bg-sky-50 text-sky-600 border-sky-200",
  P3: "bg-stone-50 text-stone-500 border-stone-200",
};

const roleAbbr: Record<string, { abbr: string; color: string }> = {
  项目主控: { abbr: "LEAD", color: "bg-rose-100 text-rose-600" },
  调研分析: { abbr: "RES", color: "bg-sky-100 text-sky-600" },
  产品经理: { abbr: "PM", color: "bg-violet-100 text-violet-600" },
  硬件负责: { abbr: "HW", color: "bg-amber-100 text-amber-600" },
  硬件工程: { abbr: "HW", color: "bg-amber-100 text-amber-600" },
  软件开发: { abbr: "DEV", color: "bg-emerald-100 text-emerald-600" },
  测试验证: { abbr: "QA", color: "bg-cyan-100 text-cyan-600" },
  质量审查: { abbr: "QA", color: "bg-violet-100 text-violet-600" },
  工业设计: { abbr: "ID", color: "bg-pink-100 text-pink-600" },
  结构工程: { abbr: "MD", color: "bg-orange-100 text-orange-600" },
};

const priorityRank: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

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

const getDisplayStatus = (task: any): FlowStatus => {
  const normalizedOriginal = task.originalStatus === "blocked" ? "in_progress" : task.originalStatus;
  if (task.isBlocked) {
    return (normalizedOriginal ?? task.status) as FlowStatus;
  }
  if (task.status === "blocked") {
    return (normalizedOriginal ?? "in_progress") as FlowStatus;
  }
  return task.status as FlowStatus;
};

const getShortTaskId = (task: any) => {
  const raw = typeof task._id === "string" ? task._id.slice(-4).toUpperCase() : "0000";
  return `#${raw}`;
};

const getNextStatus = (status: FlowStatus) => {
  const idx = flowStatuses.indexOf(status);
  return idx >= 0 && idx < flowStatuses.length - 1 ? flowStatuses[idx + 1] : null;
};

const getPrevStatus = (status: FlowStatus) => {
  const idx = flowStatuses.indexOf(status);
  return idx > 0 ? flowStatuses[idx - 1] : null;
};

const TaskCard = ({
  task,
  agents,
  onOpen,
  onPrev,
  onNext,
  onToggleBlocked,
  prevStatus,
  nextStatus,
}: {
  task: any;
  agents: any[] | undefined;
  onOpen: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleBlocked: () => void;
  prevStatus: FlowStatus | null;
  nextStatus: FlowStatus | null;
}) => {
  const priorityStyle = priorityStyles[task.priority] || priorityStyles.P2;
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
  const displayAssignee = assignees[0] || creator;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      onClick={onOpen}
      className={`rounded-2xl border p-3 bg-white shadow-sm cursor-pointer transition-shadow hover:shadow-md ${
        isBlocked ? "border-rose-300 bg-rose-50/40" : "border-stone-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${priorityStyle}`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-1">
          {isBlocked && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-500 font-semibold">
              BLOCKED
            </span>
          )}
          <span className="text-[10px] text-stone-400 font-mono">{getShortTaskId(task)}</span>
        </div>
      </div>
      <h4 className="font-semibold text-[13px] text-stone-800 mb-1 line-clamp-2 leading-snug">
        {task.title}
      </h4>
      {task.description && (
        <p className="text-[11px] text-stone-400 mb-2.5 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}
      {(task.status === "review" || isBlocked || hasReviewComment || reviewer) && (
        <div className="mb-2.5 space-y-1">
          {task.status === "review" && (
            <div className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide">⏳ 待审查</div>
          )}
          {isBlocked && <div className="text-[10px] font-semibold text-rose-500 uppercase tracking-wide">🚫 阻塞中</div>}
          {reviewer && <div className="text-[10px] text-stone-400">审查人: {reviewer.name}</div>}
          {hasReviewComment && <div className="text-[10px] text-stone-500 line-clamp-2">评语: {task.reviewComment}</div>}
        </div>
      )}
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
          {displayAssignee && <span className="text-[10px] text-stone-400 ml-0.5">👤 {displayAssignee.name}</span>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] ${statusAgeClass} flex items-center gap-1`}>
            <Clock className="w-3 h-3" />
            {statusAgeLabel}
          </span>
          {dueInfo && <span className={`text-[10px] ${dueInfo.className}`}>{dueInfo.label}</span>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          disabled={!prevStatus}
          className={`px-2 py-1 rounded-full border transition-colors ${
            prevStatus
              ? "border-stone-200 text-stone-600 hover:bg-stone-100"
              : "border-stone-100 text-stone-300 cursor-not-allowed"
          }`}
        >
          ← 退回
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          disabled={!nextStatus}
          className={`px-2 py-1 rounded-full border transition-colors ${
            nextStatus
              ? "border-stone-200 text-stone-600 hover:bg-stone-100"
              : "border-stone-100 text-stone-300 cursor-not-allowed"
          }`}
        >
          → 下一状态
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBlocked();
          }}
          className={`ml-auto px-2 py-1 rounded-full border transition-colors ${
            isBlocked
              ? "border-rose-200 text-rose-500 bg-rose-50 hover:bg-rose-100"
              : "border-stone-200 text-stone-500 hover:bg-stone-100"
          }`}
        >
          {isBlocked ? "✅ 解除" : "🚫 阻塞"}
        </button>
      </div>
    </motion.article>
  );
};

const ZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-full px-2 py-1 shadow-sm">
      <button
        onClick={() => zoomIn()}
        className="p-1.5 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
        title="放大"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-1.5 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
        title="缩小"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-3 bg-stone-200 mx-0.5" />
      <button
        onClick={() => resetTransform()}
        className="p-1.5 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
        title="重置视角"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const KanbanBoard = () => {
  const tasks = useTasks();
  const agents = useAgents();
  const activities = useActivities(30);
  const { mutate: updateStatus } = useUpdateStatus();
  const { mutate: quickCreate } = useQuickCreate();

  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const [activityStatusFilter, setActivityStatusFilter] = useState<"all" | "blocked" | "review">("all");
  const [activityAgentFilter, setActivityAgentFilter] = useState<string>("all");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateTitle, setQuickCreateTitle] = useState("");
  const [quickCreatePriority, setQuickCreatePriority] = useState("P2");
  const [quickCreateAssigneeId, setQuickCreateAssigneeId] = useState("");
  const [detailTask, setDetailTask] = useState<any | null>(null);

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
  const blockedCount = tasks?.filter((task: any) => task.isBlocked || task.status === "blocked").length || 0;
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

  const tasksByStatus = useMemo(() => {
    const grouped: Record<FlowStatus, any[]> = {
      inbox: [],
      assigned: [],
      in_progress: [],
      review: [],
      done: [],
    };

    (tasks || []).forEach((task: any) => {
      const status = getDisplayStatus(task);
      grouped[status]?.push(task);
    });

    flowStatuses.forEach((status) => {
      grouped[status].sort((a, b) => {
        const priorityDiff = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
        if (priorityDiff !== 0) return priorityDiff;
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
      });
    });

    return grouped;
  }, [tasks]);

  const handleQuickCreate = async () => {
    if (!quickCreateTitle.trim() || !operatorId) return;
    await quickCreate({
      title: quickCreateTitle.trim(),
      priority: quickCreatePriority as any,
      assigneeId: quickCreateAssigneeId ? (quickCreateAssigneeId as any) : undefined,
      createdBy: operatorId,
    });
    setQuickCreateOpen(false);
    setQuickCreateTitle("");
    setQuickCreatePriority("P2");
    setQuickCreateAssigneeId("");
  };

  const handleMoveStatus = async (task: any, status: TaskStatus) => {
    if (!operatorId) return;
    await updateStatus({ taskId: task._id, status: status as any, updatedBy: operatorId });
  };

  const handleToggleBlocked = async (task: any) => {
    if (!operatorId) return;
    if (task.isBlocked || task.status === "blocked") {
      const targetStatus = getDisplayStatus(task);
      await handleMoveStatus(task, targetStatus);
    } else {
      await handleMoveStatus(task, "blocked");
    }
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("zh-CN", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              title={leftDrawerOpen ? "收起团队面板" : "展开团队面板"}
            >
              <PanelLeftClose
                className={`w-5 h-5 text-stone-500 transition-transform ${!leftDrawerOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-stone-800 tracking-tight">MISSION KANBAN</h1>
                <p className="text-[10px] text-stone-400 -mt-0.5">Status Flow Board</p>
              </div>
            </div>
          </div>

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
            <div className="w-px h-8 bg-stone-200 hidden sm:block" />
            <div className="text-center hidden sm:block">
              <div className="text-2xl lg:text-3xl font-bold text-rose-500 tabular-nums">{blockedCount}</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider">Blocked</div>
            </div>
          </div>

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
            <button
              onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              title={rightDrawerOpen ? "收起动态面板" : "展开动态面板"}
            >
              <PanelRightClose
                className={`w-5 h-5 text-stone-500 transition-transform ${!rightDrawerOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)] relative">
        <AnimatePresence>
          {leftDrawerOpen && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-60 bg-white border-r border-stone-200 flex flex-col"
            >
              <div className="h-12 px-4 flex items-center justify-between border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Agents</span>
                  <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                    {agents?.length || 0}
                  </span>
                </div>
              </div>

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
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col min-w-0 bg-stone-100/50">
          <div className="h-12 px-4 flex items-center gap-2 bg-white border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Mission Kanban</span>
            </div>
            <span className="text-[10px] text-stone-400">状态流转看板</span>
            <div className="ml-auto flex items-center gap-3">
              <ZoomControls />
              <button
                onClick={() => setQuickCreateOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                快速创建
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <TransformWrapper
              minScale={0.3}
              maxScale={2}
              initialScale={1}
              centerOnInit={false}
              wheel={{ step: 0.1, wheelDisabled: false }}
              panning={{ 
                disabled: false,
                wheelPanning: true,
                allowLeftClickPan: true,
                excluded: ["button", "a", "input", "textarea", "select", "[role=button]"] 
              }}
              limitToBounds={false}
              centerZoomedOut={false}
            >
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%", cursor: "grab" }}
                contentStyle={{ minHeight: "100%", padding: "40px" }}
              >
                <div className="flex h-full gap-6 min-w-max">
                  {flowStatuses.map((status) => {
                    const meta = statusMeta[status];
                    const list = tasksByStatus[status] || [];
                    return (
                      <motion.section
                        layout
                        key={status}
                        className={`w-[320px] flex flex-col rounded-2xl border ${meta.tone} bg-white/80 shadow-sm`}
                      >
                        <div className="px-4 py-3 border-b border-stone-100">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-stone-700">{meta.label}</h3>
                              <p className="text-[10px] text-stone-400 mt-0.5">{meta.description}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${meta.tone} ${meta.accent}`}>
                              {list.length}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                          <AnimatePresence mode="popLayout">
                            {list.map((task: any) => {
                              const currentStatus = getDisplayStatus(task);
                              const prevStatus = getPrevStatus(currentStatus);
                              const nextStatus = getNextStatus(currentStatus);
                              return (
                                <TaskCard
                                  key={task._id}
                                  task={task}
                                  agents={agents}
                                  onOpen={() => setDetailTask(task)}
                                  onPrev={() => prevStatus && handleMoveStatus(task, prevStatus)}
                                  onNext={() => nextStatus && handleMoveStatus(task, nextStatus)}
                                  onToggleBlocked={() => handleToggleBlocked(task)}
                                  prevStatus={prevStatus}
                                  nextStatus={nextStatus}
                                />
                              );
                            })}
                          </AnimatePresence>
                          {list.length === 0 && (
                            <div className="text-center py-10 text-xs text-stone-300">暂无任务</div>
                          )}
                        </div>
                      </motion.section>
                    );
                  })}
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>
        </main>

        <AnimatePresence>
          {rightDrawerOpen && (
            <motion.aside
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-72 bg-white border-l border-stone-200 flex flex-col"
            >
              <div className="h-12 px-4 flex items-center justify-between border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Live Feed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-stone-400">LIVE</span>
                </div>
              </div>

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
                    <ChevronRight
                      className={`w-3 h-3 transition-transform ${feedCollapsed ? "-rotate-90" : "rotate-90"}`}
                    />
                  </button>
                </div>
                <div className="text-[10px] text-stone-400">筛选结果：{filteredActivities.length} 条</div>
              </div>

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
                          {task && <p className="text-[11px] text-stone-600 truncate mt-0.5">"{task.title}"</p>}
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
                <div className="flex-1 flex items-center justify-center text-xs text-stone-300">动态已折叠</div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

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
                      onChange={(e) => setQuickCreatePriority(e.target.value)}
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

      <AnimatePresence>
        {detailTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setDetailTask(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              className="w-[92%] max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-stone-100">
                <h3 className="text-sm font-semibold text-stone-700">任务详情</h3>
                <p className="text-xs text-stone-400 mt-1">{detailTask.title}</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-stone-600 leading-relaxed">{detailTask.description || "暂无描述"}</p>
              </div>
              <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-end">
                <button
                  onClick={() => setDetailTask(null)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-100"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DynamicKanbanBoard = dynamic(() => Promise.resolve(KanbanBoard), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-stone-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-stone-500">加载看板...</p>
      </div>
    </div>
  ),
});

export default function KanbanPage() {
  return <DynamicKanbanBoard />;
}
