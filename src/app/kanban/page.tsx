"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Clock,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Users,
  Zap,
} from "lucide-react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  NodeMouseHandler,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "blocked" | "done";

type ZoneNodeData = {
  label: string;
  tone: string;
};

type ZoneNodeProps = {
  data: ZoneNodeData;
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

const statusZones = [
  {
    key: "inbox",
    label: "收件箱",
    x: -520,
    y: -200,
    tone: "border-slate-200 bg-slate-50/70 text-slate-500",
  },
  {
    key: "assigned",
    label: "已分配",
    x: -80,
    y: -200,
    tone: "border-sky-200 bg-sky-50/70 text-sky-500",
  },
  {
    key: "in_progress",
    label: "进行中",
    x: 360,
    y: -200,
    tone: "border-amber-200 bg-amber-50/70 text-amber-600",
  },
  {
    key: "review",
    label: "待审查",
    x: 800,
    y: -200,
    tone: "border-violet-200 bg-violet-50/70 text-violet-500",
  },
  {
    key: "done",
    label: "已完成",
    x: 1240,
    y: -200,
    tone: "border-emerald-200 bg-emerald-50/70 text-emerald-500",
  },
];

const statusBounds: Record<TaskStatus, { minX: number; maxX: number }> = {
  inbox: { minX: -640, maxX: -200 },
  assigned: { minX: -200, maxX: 240 },
  in_progress: { minX: 240, maxX: 680 },
  review: { minX: 680, maxX: 1120 },
  done: { minX: 1120, maxX: 1560 },
  blocked: { minX: -640, maxX: 1560 },
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

const taskNodeDefaults: Record<TaskStatus, { x: number; y: number }> = {
  inbox: { x: -520, y: 40 },
  assigned: { x: -80, y: 40 },
  in_progress: { x: 360, y: 40 },
  review: { x: 800, y: 40 },
  done: { x: 1240, y: 40 },
  blocked: { x: 360, y: 320 },
};

const createDefaultPosition = (status: TaskStatus, index: number) => {
  const base = taskNodeDefaults[status] || taskNodeDefaults.in_progress;
  return {
    x: base.x + (index % 3) * 220,
    y: base.y + Math.floor(index / 3) * 180,
  };
};

const getStatusFromPosition = (x: number): TaskStatus | null => {
  const entries = Object.entries(statusBounds) as Array<[TaskStatus, { minX: number; maxX: number }]>;
  for (const [status, range] of entries) {
    if (x >= range.minX && x < range.maxX) return status;
  }
  return null;
};

const CanvasBoard = () => {
  const tasks = useQuery(api.tasks.list);
  const agents = useQuery(api.agents.list);
  const activities = useQuery(api.activities.getRecent, { limit: 30 });
  const updateTask = useMutation(api.tasks.update);
  const updateStatus = useMutation(api.tasks.updateStatus);
  const quickCreate = useMutation(api.tasks.quickCreate);

  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportReady, setViewportReady] = useState(false);
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const [activityStatusFilter, setActivityStatusFilter] = useState<"all" | "blocked" | "review">("all");
  const [activityAgentFilter, setActivityAgentFilter] = useState<string>("all");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateTitle, setQuickCreateTitle] = useState("");
  const [quickCreatePriority, setQuickCreatePriority] = useState("P2");
  const [quickCreateAssigneeId, setQuickCreateAssigneeId] = useState("");
  const [detailTask, setDetailTask] = useState<any | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const saveTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const { fitView } = useReactFlow();

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

  const syncNodesWithTasks = useCallback(() => {
    if (!tasks) return;
    const groupedByStatus: Record<TaskStatus, any[]> = {
      inbox: [],
      assigned: [],
      in_progress: [],
      review: [],
      done: [],
      blocked: [],
    };

    tasks.forEach((task: any) => {
      const status = getDisplayStatus(task);
      groupedByStatus[status]?.push(task);
    });

    const taskNodes: Node[] = tasks.map((task: any, index: number) => {
      const status = getDisplayStatus(task);
      const statusGroup = groupedByStatus[status] || [];
      const groupIndex = statusGroup.findIndex((t) => t._id === task._id);
      const position = task.canvasPosition || createDefaultPosition(status, groupIndex === -1 ? index : groupIndex);
      return {
        id: task._id,
        type: "task",
        data: { task, agents },
        position,
      } as Node;
    });

    const zoneNodes: Node<ZoneNodeData>[] = statusZones.map((zone) => ({
      id: `zone:${zone.key}`,
      type: "zone",
      data: { label: zone.label, tone: zone.tone },
      position: { x: zone.x, y: zone.y },
      draggable: false,
      selectable: false,
    }));

    const nextNodes: Node[] = [...zoneNodes, ...taskNodes];

    setNodes((prev) => {
      if (prev.length === nextNodes.length && prev.every((node) => {
        const next = nextNodes.find((n) => n.id === node.id);
        return next && node.position.x === next.position.x && node.position.y === next.position.y;
      })) {
        return prev.map((node) => ({
          ...node,
          data: node.type === "task" ? { ...node.data, agents } : node.data,
        }));
      }
      return nextNodes;
    });
  }, [tasks, agents, setNodes]);

  useEffect(() => {
    syncNodesWithTasks();
  }, [syncNodesWithTasks]);

  useEffect(() => {
    if (nodes.length > 0 && !viewportReady) {
      fitView({ padding: 0.2, duration: 400 });
      setViewportReady(true);
    }
  }, [nodes.length, fitView, viewportReady]);

  const handleNodeDragStop: NodeMouseHandler = async (_event, node) => {
    if (node.type === "zone") return;
    const task = tasks?.find((t: any) => t._id === node.id);
    if (!task || !operatorId) return;

    const nextStatus = getStatusFromPosition(node.position.x) || getDisplayStatus(task);

    if (saveTimerRef.current[node.id]) {
      clearTimeout(saveTimerRef.current[node.id]);
    }

    saveTimerRef.current[node.id] = setTimeout(async () => {
      await updateTask({
        taskId: task._id,
        canvasPosition: {
          x: node.position.x,
          y: node.position.y,
        },
      });

      if (nextStatus && nextStatus !== getDisplayStatus(task)) {
        await updateStatus({
          taskId: task._id,
          status: nextStatus,
          updatedBy: operatorId,
        });
      }
    }, 300);
  };

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

  const handleNodeDoubleClick: NodeMouseHandler = (_event, node) => {
    if (node.type === "zone") return;
    const task = tasks?.find((t: any) => t._id === node.id);
    if (!task) return;
    setDetailTask(task);
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      {/* Header */}
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
                <h1 className="text-sm font-bold text-stone-800 tracking-tight">MISSION CANVAS</h1>
                <p className="text-[10px] text-stone-400 -mt-0.5">Freeform Task Board</p>
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
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Mission Canvas</span>
            </div>
            <button
              onClick={() => setQuickCreateOpen(true)}
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              快速创建
            </button>
          </div>

          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              onNodesChange={onNodesChange}
              nodeTypes={{ task: TaskNode, zone: ZoneNode }}
              fitView
              minZoom={0.2}
              maxZoom={2.2}
              onNodeDragStop={handleNodeDragStop}
              onNodeDoubleClick={handleNodeDoubleClick}
              panOnDrag
              zoomOnScroll
              className="bg-stone-50"
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#E7E5E4" />
              <MiniMap
                nodeColor={(node) => {
                  if (node.type === "task") return "#FDBA74";
                  if (node.type === "zone") return "#E7E5E4";
                  return "#D6D3D1";
                }}
                maskColor="rgba(255,255,255,0.6)"
                zoomable
                pannable
              />
              <Controls position="bottom-right" showZoom showFitView />
            </ReactFlow>
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

const ZoneNode = ({ data }: ZoneNodeProps) => {
  return (
    <div className={`rounded-2xl border px-4 py-2 text-xs font-semibold ${data.tone}`}>
      {data.label}
    </div>
  );
};

const TaskNode = ({ data }: { data: { task: any; agents: any } }) => {
  const { task, agents } = data;
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

  return (
    <div
      className={`rounded-2xl border p-3 transition-all bg-white shadow-sm min-w-[220px] ${
        isBlocked ? "border-rose-400 bg-rose-50/40" : "border-stone-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${priorityStyle}`}>
          {task.priority}
        </span>
        <span className="text-[10px] text-stone-400 font-mono">{getShortTaskId(task)}</span>
      </div>
      <h4 className="font-semibold text-[13px] text-stone-800 mb-1 line-clamp-2 leading-snug">
        {task.title}
      </h4>
      {task.description && (
        <p className="text-[11px] text-stone-400 mb-2.5 line-clamp-2 leading-relaxed">{task.description}</p>
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
          {assignees.length > 0 && <span className="text-[10px] text-stone-400 ml-0.5">{assignees[0]?.name}</span>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] ${statusAgeClass} flex items-center gap-1`}>
            <Clock className="w-3 h-3" />
            {statusAgeLabel}
          </span>
          {dueInfo && <span className={`text-[10px] ${dueInfo.className}`}>{dueInfo.label}</span>}
        </div>
      </div>
    </div>
  );
};

export default function KanbanCanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasBoard />
    </ReactFlowProvider>
  );
}
