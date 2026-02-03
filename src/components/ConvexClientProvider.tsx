"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const rawUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
// 严格校验 URL，排除 "undefined" 字符串干扰
const convexUrl = (rawUrl && rawUrl !== "undefined" && rawUrl !== "null") 
  ? rawUrl 
  : "https://convex-backend-production-3dbe.up.railway.app";

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
