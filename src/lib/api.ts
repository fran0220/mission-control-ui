/**
 * REST API wrapper for self-hosted Convex backend
 * Replaces Convex React hooks with direct HTTP calls
 */

const rawUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const API_BASE = (rawUrl && rawUrl !== "undefined" && rawUrl !== "null")
  ? rawUrl
  : "https://convex-backend-production-3dbe.up.railway.app";

async function query<T>(path: string, args: Record<string, any> = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.status === "error") {
    throw new Error(data.errorMessage || "Unknown error");
  }
  
  return data.value as T;
}

async function mutation<T>(path: string, args: Record<string, any> = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.status === "error") {
    throw new Error(data.errorMessage || "Unknown error");
  }
  
  return data.value as T;
}

// Tasks API
export const tasksApi = {
  list: () => query<any[]>("tasks:list"),
  updateStatus: (args: { taskId: string; status: string }) => 
    mutation("tasks:updateStatus", args),
  approveReview: (args: { taskId: string; reviewerId: string; comment?: string }) =>
    mutation("tasks:approveReview", args),
  rejectReview: (args: { taskId: string; reviewerId: string; reason: string }) =>
    mutation("tasks:rejectReview", args),
  quickCreate: (args: { title: string; priority?: string; assigneeId?: string; createdBy: string }) =>
    mutation("tasks:quickCreate", args),
};

// Agents API
export const agentsApi = {
  list: () => query<any[]>("agents:list"),
};

// Activities API
export const activitiesApi = {
  getRecent: (args: { limit?: number }) => query<any[]>("activities:getRecent", args),
};
