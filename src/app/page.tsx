"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Circle,
  Clock,
  MessageSquare,
  ChevronRight,
  Zap
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "blocked" | "done";
type Priority = "P0" | "P1" | "P2" | "P3";

const statusColumns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "inbox", label: "INBOX", color: "bg-slate-400" },
  { key: "assigned", label: "ASSIGNED", color: "bg-blue-400" },
  { key: "in_progress", label: "IN PROGRESS", color: "bg-amber-400" },
  { key: "review", label: "REVIEW", color: "bg-purple-400" },
  { key: "done", label: "DONE", color: "bg-emerald-400" },
];

const priorityColors: Record<Priority, string> = {
  P0: "bg-red-100 text-red-700 border-red-200",
  P1: "bg-orange-100 text-orange-700 border-orange-200",
  P2: "bg-blue-100 text-blue-700 border-blue-200",
  P3: "bg-slate-100 text-slate-600 border-slate-200",
};

const roleColors: Record<string, string> = {
  "项目主控": "bg-red-100 text-red-600",
  "调研分析": "bg-blue-100 text-blue-600",
  "产品经理": "bg-purple-100 text-purple-600",
  "硬件负责": "bg-amber-100 text-amber-600",
  "软件开发": "bg-green-100 text-green-600",
  "测试验证": "bg-cyan-100 text-cyan-600",
};

export default function MissionControl() {
  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list);
  const activities = useQuery(api.activities.getRecent, { limit: 30 });

  const activeAgents = agents?.filter(a => a.status === "active").length || 0;
  const totalTasks = tasks?.length || 0;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("zh-CN", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-gray-900">MISSION CONTROL</span>
            </div>
            <div className="px-3 py-1 bg-gray-100 rounded text-sm text-gray-600">
              Robot Team
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{activeAgents}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Agents Active</div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{totalTasks}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Tasks in Queue</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-gray-900">{timeStr}</div>
              <div className="text-xs text-gray-500 uppercase">{dateStr}</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <main className="flex h-[calc(100vh-64px)]">
        {/* Left: Agents */}
        <AgentsPanel agents={agents} tasks={tasks} />

        {/* Center: Mission Queue (Kanban) */}
        <MissionQueue tasks={tasks} agents={agents} />

        {/* Right: Live Feed */}
        <LiveFeed activities={activities} agents={agents} tasks={tasks} />
      </main>
    </div>
  );
}

// ============================================
// Agents Panel
// ============================================
function AgentsPanel({ agents, tasks }: { agents: any; tasks: any }) {
  return (
    <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">● AGENTS</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{agents?.length || 0}</span>
        </div>
      </div>
      
      <div className="p-2 space-y-1">
        {agents?.map((agent: any) => {
          const agentTasks = tasks?.filter((t: any) => t.assigneeIds?.includes(agent._id)) || [];
          const roleColor = roleColors[agent.role] || "bg-gray-100 text-gray-600";
          
          return (
            <div 
              key={agent._id} 
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                  {agent.name[0]}
                </div>
                {agent.status === "active" && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-gray-900">{agent.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${roleColor}`}>
                    {agent.role.slice(0, 2)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    agent.status === "active" 
                      ? "bg-amber-100 text-amber-700" 
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {agent.status === "active" ? "● WORKING" : "○ IDLE"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Mission Queue (Kanban Board)
// ============================================
function MissionQueue({ tasks, agents }: { tasks: any; agents: any }) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#f5f5f5]">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">● MISSION QUEUE</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full p-4 gap-3 min-w-max">
          {statusColumns.map((col) => {
            const columnTasks = tasks?.filter((t: any) => t.status === col.key) || [];
            
            return (
              <div key={col.key} className="w-64 flex-shrink-0 flex flex-col">
                {/* Column Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-auto">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {columnTasks.map((task: any) => (
                    <TaskCard key={task._id} task={task} agents={agents} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, agents }: { task: any; agents: any }) {
  const priorityColor = priorityColors[task.priority as Priority] || priorityColors.P2;
  const assignees = agents?.filter((a: any) => task.assigneeIds?.includes(a._id)) || [];
  const creator = agents?.find((a: any) => a._id === task.createdBy);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group">
      {/* Priority Badge */}
      <div className="flex items-start justify-between mb-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${priorityColor}`}>
          {task.priority}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm text-gray-900 mb-1.5 line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags - extract from title/description */}
      <div className="flex flex-wrap gap-1 mb-2">
        {task.priority === "P0" && (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">urgent</span>
        )}
        {task.status === "blocked" && (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">blocked</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {/* Assignees */}
        <div className="flex items-center gap-1">
          {assignees.length > 0 ? (
            <>
              <div className="flex -space-x-1.5">
                {assignees.slice(0, 2).map((a: any) => (
                  <div
                    key={a._id}
                    className="w-5 h-5 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600"
                    title={a.name}
                  >
                    {a.name[0]}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-gray-500 ml-1">{assignees[0]?.name}</span>
            </>
          ) : creator ? (
            <>
              <div className="w-5 h-5 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-amber-600">
                {creator.name[0]}
              </div>
              <span className="text-[10px] text-gray-500 ml-1">{creator.name}</span>
            </>
          ) : null}
        </div>

        {/* Time */}
        <span className="text-[10px] text-gray-400">
          {formatDistanceToNow(task.createdAt, { addSuffix: false, locale: zhCN })}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Live Feed
// ============================================
function LiveFeed({ activities, agents, tasks }: { activities: any; agents: any; tasks: any }) {
  // Group activities by type
  const recentActivities = activities?.slice(0, 20) || [];

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">● LIVE FEED</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-gray-500">LIVE</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
        <FilterTab label="All" active />
        <FilterTab label={`Tasks ${tasks?.length || 0}`} />
        <FilterTab label="Comments" />
        <FilterTab label="Status" />
      </div>

      {/* Agent Pills */}
      <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-1">
        <button className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
          All Agents
        </button>
        {agents?.slice(0, 4).map((agent: any) => {
          const count = tasks?.filter((t: any) => t.assigneeIds?.includes(agent._id)).length || 0;
          return (
            <button
              key={agent._id}
              className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              ○ {agent.name} {count}
            </button>
          );
        })}
      </div>

      {/* Activities */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {recentActivities.map((activity: any) => {
          const agent = agents?.find((a: any) => a._id === activity.agentId);
          const task = tasks?.find((t: any) => t._id === activity.taskId);

          return (
            <div key={activity._id} className="group">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0 mt-0.5">
                  {agent?.name?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-medium text-xs text-amber-600">{agent?.name || "System"}</span>
                    <span className="text-xs text-gray-500">
                      {activity.type === "task_created" && "创建了任务"}
                      {activity.type === "task_assigned" && "分配了任务"}
                      {activity.type === "status_changed" && "更新了状态"}
                      {activity.type === "message_sent" && "评论了"}
                      {activity.type === "agent_heartbeat" && "心跳检查"}
                    </span>
                  </div>
                  {task && (
                    <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">
                      "{task.title}" <ChevronRight className="w-3 h-3 inline text-gray-400" />
                    </p>
                  )}
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    {formatDistanceToNow(activity.createdAt, { addSuffix: true, locale: zhCN })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {(!activities || activities.length === 0) && (
          <div className="text-center py-8 text-gray-400 text-sm">
            暂无活动
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTab({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`text-[10px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
        active 
          ? "bg-emerald-100 text-emerald-700" 
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
