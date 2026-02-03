"use client";

import { useEffect, useMemo, useState } from "react";
import { getObjectUrl } from "@/lib/minio";

const CATEGORY_ORDER = ["concept", "direction-c", "direction-c-v2", "cmf", "renders"];

type Asset = {
  path: string;
  name: string;
  size: number;
  lastModified: number | null;
  category: string;
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

export default function DesignsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [preview, setPreview] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const allAssets = Array.isArray(data.assets) ? data.assets : [];
        // 只显示图片文件
        const imageAssets = allAssets.filter((a: Asset) => 
          /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name)
        );
        setAssets(imageAssets);
        setLoading(false);
      })
      .catch((err) => {
        if (canceled) return;
        console.error("加载失败:", err);
        setError("加载失败，请稍后重试");
        setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  // 构建目录结构
  const directories = useMemo(() => {
    const dirMap = new Map<string, Asset[]>();
    
    assets.forEach((asset) => {
      // 从路径提取目录 designs/concept/direction-c-v2/xxx.png -> concept/direction-c-v2
      const pathParts = asset.path.replace(/^designs\//, "").split("/");
      pathParts.pop(); // 移除文件名
      const dir = pathParts.join("/") || "root";
      
      if (!dirMap.has(dir)) {
        dirMap.set(dir, []);
      }
      dirMap.get(dir)!.push(asset);
    });
    
    // 排序目录
    const sortedDirs = Array.from(dirMap.keys()).sort((a, b) => {
      const aIdx = CATEGORY_ORDER.findIndex(c => a.includes(c));
      const bIdx = CATEGORY_ORDER.findIndex(c => b.includes(c));
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    
    return { map: dirMap, sorted: sortedDirs };
  }, [assets]);

  // 当前显示的图片
  const displayAssets = useMemo(() => {
    if (activeCategory === "all") {
      return assets;
    }
    return directories.map.get(activeCategory) || [];
  }, [assets, activeCategory, directories]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        {/* 左侧目录导航 */}
        <aside className="col-span-12 md:col-span-3 space-y-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              📁 目录导航
            </h2>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors flex items-center justify-between ${
                    activeCategory === "all"
                      ? "bg-amber-100 text-amber-700"
                      : "hover:bg-stone-100 text-stone-600"
                  }`}
                >
                  <span className="truncate">📂 全部</span>
                  <span className="text-xs text-stone-400">{assets.length}</span>
                </button>
              </li>
              {directories.sorted.map((dir) => (
                <li key={dir}>
                  <button
                    onClick={() => setActiveCategory(dir)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors flex items-center justify-between ${
                      activeCategory === dir
                        ? "bg-amber-100 text-amber-700"
                        : "hover:bg-stone-100 text-stone-600"
                    }`}
                  >
                    <span className="truncate">📁 {dir}</span>
                    <span className="text-xs text-stone-400">
                      {directories.map.get(dir)?.length || 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700">
              💡 <strong>提示</strong><br/>
              • 点击图片查看大图<br/>
              • 共 {assets.length} 张设计图
            </p>
          </div>
        </aside>

        {/* 右侧图片网格 */}
        <main className="col-span-12 md:col-span-9 bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="h-12 px-4 flex items-center border-b border-stone-100 bg-stone-50 gap-3">
            <span className="text-sm font-semibold text-stone-600">
              🖼️ {activeCategory === "all" ? "全部设计" : activeCategory}
            </span>
            <span className="text-xs text-stone-400">
              ({displayAssets.length} 张)
            </span>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-stone-400 text-sm text-center py-12">
                ⏳ 加载中...
              </div>
            ) : error ? (
              <div className="text-rose-500 text-sm text-center py-12">
                ❌ {error}
              </div>
            ) : displayAssets.length === 0 ? (
              <div className="text-stone-400 text-sm text-center py-12">
                暂无图片
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayAssets.map((asset) => (
                  <button
                    key={asset.path}
                    onClick={() => setPreview(asset)}
                    className="group relative aspect-square bg-stone-100 border border-stone-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-amber-300 transition-all"
                  >
                    <img
                      src={getObjectUrl(asset.path)}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white text-xs truncate font-medium">
                        {asset.name}
                      </p>
                      <p className="text-white/70 text-[10px]">
                        {formatFileSize(asset.size)} · {formatDate(asset.lastModified)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 预览弹窗 */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="max-w-5xl w-full max-h-[90vh] flex flex-col">
            <img
              src={getObjectUrl(preview.path)}
              alt={preview.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl mx-auto"
            />
            <div className="text-center mt-4">
              <p className="text-white font-medium">{preview.name}</p>
              <p className="text-white/60 text-sm">
                {formatFileSize(preview.size)} · {formatDate(preview.lastModified)}
              </p>
              <p className="text-white/40 text-xs mt-2">点击任意位置关闭</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
