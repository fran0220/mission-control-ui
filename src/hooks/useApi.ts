/**
 * React hooks for REST API - replaces Convex useQuery/useMutation
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { tasksApi, agentsApi, activitiesApi } from "@/lib/api";

// Generic hook for polling data
function usePollingQuery<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 5000
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        const result = await fetcher();
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setError(e as Error);
          console.error("API fetch error:", e);
        }
      }
    };

    // Initial fetch
    fetchData();
    
    // Poll every intervalMs
    const interval = setInterval(fetchData, intervalMs);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetcher, intervalMs]);

  return data;
}

// Hook for tasks list
export function useTasks() {
  return usePollingQuery(() => tasksApi.list(), 3000);
}

// Hook for agents list
export function useAgents() {
  return usePollingQuery(() => agentsApi.list(), 10000);
}

// Hook for activities
export function useActivities(limit: number = 30) {
  const fetcher = useCallback(() => activitiesApi.getRecent({ limit }), [limit]);
  return usePollingQuery(fetcher, 5000);
}

// Mutation hooks
export function useUpdateStatus() {
  const [loading, setLoading] = useState(false);
  
  const mutate = useCallback(async (args: { taskId: string; status: string; updatedBy?: string }) => {
    setLoading(true);
    try {
      await tasksApi.updateStatus({ taskId: args.taskId, status: args.status });
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { mutate, loading };
}

export function useApproveReview() {
  const [loading, setLoading] = useState(false);
  
  const mutate = useCallback(async (args: { taskId: string; reviewerId: string; reviewComment?: string }) => {
    setLoading(true);
    try {
      await tasksApi.approveReview({
        taskId: args.taskId,
        reviewerId: args.reviewerId,
        comment: args.reviewComment,
      });
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { mutate, loading };
}

export function useRejectReview() {
  const [loading, setLoading] = useState(false);
  
  const mutate = useCallback(async (args: { taskId: string; reviewerId: string; reviewComment?: string }) => {
    setLoading(true);
    try {
      await tasksApi.rejectReview({
        taskId: args.taskId,
        reviewerId: args.reviewerId,
        reason: args.reviewComment || "Rejected",
      });
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { mutate, loading };
}

export function useQuickCreate() {
  const [loading, setLoading] = useState(false);
  
  const mutate = useCallback(async (args: { title: string; priority?: string; assigneeId?: string; createdBy: string }) => {
    setLoading(true);
    try {
      await tasksApi.quickCreate(args);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { mutate, loading };
}
