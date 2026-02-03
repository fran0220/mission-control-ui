"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getObjectUrl } from "@/lib/minio";

const CATEGORY_ORDER = ["concept", "cmf", "renders", "direction-c", "direction-c-v2"];

type Asset = {
  path: string;
  name: string;
  size: number;
  lastModified: number | null;
  category: string;
};

type ReviewAction = "approve" | "reject";

type ReviewModalState = {
  action: ReviewAction;
  paths: string[];
};

const statusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: "待审批", className: "bg-amber-50 text-amber-600 border-amber-200" },
  approved: { label: "已通过", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  rejected: { label: "已拒绝", className: "bg-rose-50 text-rose-600 border-rose-200" },
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  const digits = size < 10 && idx > 0 ? 1 : 0;
  return `${size.toFixed(digits)} ${units[idx]}`;
};

const formatDate = (timestamp: number | null) => {
  if (!timestamp) return "--";
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const stripPrefix = (path: string) =>
  path.startsWith("designs/") ? path.slice("designs/".length) : path;

const encodePath = (path: string) =>
  path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

export default function DesignsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [preview, setPreview] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [initializedCategory, setInitializedCategory] = useState(false);

  const agents = useQuery(api.agents.list);
  const designAssets = useQuery((api as any).designAssets.list, {});
  const upsertFromMinio = useMutation((api as any).designAssets.upsertFromMinio);
  const setStatus = useMutation((api as any).designAssets.setStatus);
  const bulkSetStatus = useMutation((api as any).designAssets.bulkSetStatus);
  const softDelete = useMutation((api as any).designAssets.softDelete);

  const operatorId = useMemo(
    () => agents?.find((agent: any) => agent.name === "Xiaomao")?._id || agents?.[0]?._id,
    [agents]
  );

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError(null);
    fetch("/api/designs")
      .then((res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((data) => {
        if (canceled) return;
        setAssets(Array.isArray(data.assets) ? data.assets : []);
      })
      .catch(() => {
        if (canceled) return;
        setError("加载失败，请稍后重试");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const fromAssets = Array.from(new Set(assets.map((asset) => asset.category)));
    const ordered = CATEGORY_ORDER.filter((cat) => fromAssets.includes(cat));
    const extras = fromAssets.filter((cat) => !CATEGORY_ORDER.includes(cat)).sort();
    return ["all", ...ordered, ...extras];
  }, [assets]);

  useEffect(() => {
    if (initializedCategory || categories.length === 0) return;
    const next = categories.includes("concept") ? "concept" : categories[0];
    setActiveCategory(next);
    setInitializedCategory(true);
  }, [categories, initializedCategory]);

  useEffect(() => {
    if (!designAssets || assets.length === 0) return;
    const existing = new Set((designAssets as any[]).map((item) => item.path));
    const missing = assets.filter((asset) => !existing.has(asset.path));
    if (missing.length === 0) return;

    let canceled = false;
    const sync = async () => {
      for (const asset of missing) {
        if (canceled) return;
        await upsertFromMinio({
          path: asset.path,
          name: asset.name,
          category: asset.category,
        });
      }
    };

    void sync();
    return () => {
      canceled = true;
    };
  }, [assets, designAssets, upsertFromMinio]);

  useEffect(() => {
    setSelectedPaths([]);
  }, [activeCategory]);

  const statusMap = useMemo(() => {
    const map = new Map<string, any>();
    (designAssets as any[] | undefined)?.forEach((item) => {
      map.set(item.path, item);
    });
    return map;
  }, [designAssets]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const asset of assets) {
      counts.set(asset.category, (counts.get(asset.category) || 0) + 1);
    }
    return counts;
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const visible = activeCategory === "all"
      ? assets
      : assets.filter((asset) => asset.category === activeCategory);

    return visible.filter((asset) => {
      const record = statusMap.get(asset.path);
      return record?.status !== "rejected";
    });
  }, [assets, activeCategory, statusMap]);

  const toggleSelection = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const clearSelection = () => setSelectedPaths([]);

  const openReviewModal = (action: ReviewAction, paths: string[]) => {
    setReviewModal({ action, paths });
    setReviewComment("");
  };

  const handleReviewSubmit = async () => {
    if (!reviewModal) return;
    setActionBusy(true);
    const status = reviewModal.action === "approve" ? "approved" : "rejected";
    try {
      if (reviewModal.paths.length > 1) {
        await bulkSetStatus({
          paths: reviewModal.paths,
          status,
          reviewerId: operatorId,
          reviewComment: reviewComment || undefined,
        });
      } else {
        await setStatus({
          path: reviewModal.paths[0],
          status,
          reviewerId: operatorId,
          reviewComment: reviewComment || undefined,
        });
      }
      clearSelection();
      setReviewModal(null);
    } catch (err) {
      setError("审批操作失败，请稍后重试");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      await softDelete({ path: deleteTarget.path, reviewerId: operatorId });
      setDeleteTarget(null);
    } catch (err) {
      setError("软删除失败，请稍后重试");
    } finally {
      setActionBusy(false);
    }
  };

  const handleHardDelete = async () => {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      const relativePath = stripPrefix(deleteTarget.path);
      const response = await fetch(`/api/designs/${encodePath(relativePath)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete_failed");
      await softDelete({ path: deleteTarget.path, reviewerId: operatorId });
      setAssets((prev) => prev.filter((asset) => asset.path !== deleteTarget.path));
      setDeleteTarget(null);
    } catch (err) {
      setError("硬删除失败，请稍后重试");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3 space-y-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              📁 目录导航
            </h2>
            {categories.length === 0 ? (
              <p className="text-stone-400 text-sm">暂无目录</p>
            ) : (
              <ul className="space-y-1">
                {categories.map((category) => {
                  const isActive = activeCategory === category;
                  const count =
                    category === "all"
                      ? assets.length
                      : categoryCounts.get(category) || 0;
                  return (
                    <li key={category}>
                      <button
                        onClick={() => {
                          setActiveCategory(category);
                          clearSelection();
                        }}
                        className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors flex items-center justify-between ${
                          isActive
                            ? "bg-amber-100 text-amber-700"
                            : "hover:bg-stone-100 text-stone-600"
                        }`}
                      >
                        <span className="truncate">
                          {category === "all" ? "全部" : category}
                        </span>
                        <span className="text-xs text-stone-400">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700">
              💡 <strong>使用提示</strong>
              <br />• 点击图片查看大图预览
              <br />• 支持批量选择进行审批
              <br />• 删除操作支持软/硬删除
            </p>
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9 bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="h-12 px-4 flex items-center border-b border-stone-100 bg-stone-50 gap-3">
            <span className="text-sm font-semibold text-stone-600">
              🖼️ {activeCategory === "all" ? "全部设计" : activeCategory}
            </span>
            {selectedPaths.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-stone-500">已选 {selectedPaths.length} 项</span>
                <button
                  onClick={() => openReviewModal("approve", selectedPaths)}
                  className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                >
                  ✅ 批量通过
                </button>
                <button
                  onClick={() => openReviewModal("reject", selectedPaths)}
                  className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100"
                >
                  ❌ 批量拒绝
                </button>
                <button
                  onClick={clearSelection}
                  className="text-xs px-2 py-1 rounded bg-stone-100 text-stone-500 hover:bg-stone-200"
                >
                  清空
                </button>
              </div>
            )}
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {loading ? (
              <div className="text-stone-400 text-sm">加载中...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-stone-400 text-sm">暂无图片</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAssets.map((asset) => {
                  const record = statusMap.get(asset.path);
                  const status = record?.status || "pending";
                  const statusMeta = statusStyles[status] || statusStyles.pending;
                  const isSelected = selectedPaths.includes(asset.path);

                  return (
                    <div
                      key={asset.path}
                      className="group relative rounded-lg border border-stone-200 bg-white overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <button
                        onClick={() => setPreview(asset)}
                        className="relative block w-full aspect-square bg-stone-100"
                      >
                        <img
                          src={getObjectUrl(asset.path)}
                          alt={asset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>

                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-stone-700 truncate">
                            {asset.name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-stone-400">
                          <span>{formatFileSize(asset.size)}</span>
                          <span>{formatDate(asset.lastModified)}</span>
                        </div>
                      </div>

                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSelection(asset.path);
                        }}
                        className={`absolute top-2 left-2 w-6 h-6 rounded-full border text-xs flex items-center justify-center ${
                          isSelected
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "bg-white/90 border-stone-200 text-stone-400"
                        }`}
                        title={isSelected ? "取消选择" : "选择"}
                      >
                        {isSelected ? "✓" : ""}
                      </button>

                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openReviewModal("approve", [asset.path]);
                          }}
                          className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 text-xs hover:bg-emerald-100"
                          title="通过"
                        >
                          ✅
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openReviewModal("reject", [asset.path]);
                          }}
                          className="w-7 h-7 rounded bg-rose-50 text-rose-600 text-xs hover:bg-rose-100"
                          title="拒绝"
                        >
                          ❌
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(asset);
                          }}
                          className="w-7 h-7 rounded bg-stone-100 text-stone-600 text-xs hover:bg-stone-200"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {preview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
          onClick={() => setPreview(null)}
        >
          <div className="max-w-5xl w-full" onClick={(event) => event.stopPropagation()}>
            <img
              src={getObjectUrl(preview.path)}
              alt={preview.name}
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            <div className="text-white text-center mt-4 text-sm">
              {preview.name} · {formatFileSize(preview.size)} · {formatDate(preview.lastModified)}
            </div>
            <p className="text-white text-center mt-2 text-xs opacity-80">点击空白处关闭</p>
          </div>
        </div>
      )}

      {reviewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[92%] max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-700">审批操作</h3>
              <p className="text-xs text-stone-400 mt-1">
                {reviewModal.action === "approve" ? "✅ 通过" : "❌ 拒绝"} · 共 {reviewModal.paths.length} 项
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <label className="text-xs font-medium text-stone-500">审批评论（可选）</label>
              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="补充审批意见"
              />
            </div>
            <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setReviewModal(null)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-100"
                disabled={actionBusy}
              >
                取消
              </button>
              <button
                onClick={handleReviewSubmit}
                className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                  reviewModal.action === "approve"
                    ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                    : "text-rose-600 bg-rose-50 hover:bg-rose-100"
                }`}
                disabled={actionBusy}
              >
                确认{reviewModal.action === "approve" ? "通过" : "拒绝"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[92%] max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-700">删除设计图</h3>
              <p className="text-xs text-stone-400 mt-1">{deleteTarget.name}</p>
            </div>
            <div className="px-5 py-4 text-sm text-stone-600 space-y-2">
              <p>请选择删除方式：</p>
              <p className="text-xs text-stone-400">
                软删除仅更新审批状态为拒绝；硬删除会从 MinIO 永久移除文件。
              </p>
            </div>
            <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-100"
                disabled={actionBusy}
              >
                取消
              </button>
              <button
                onClick={handleSoftDelete}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100"
                disabled={actionBusy}
              >
                软删除
              </button>
              <button
                onClick={handleHardDelete}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-stone-50 bg-stone-700 hover:bg-stone-800"
                disabled={actionBusy}
              >
                硬删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
