"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ASSETS, DOC_CATEGORIES, getObjectUrl } from "@/lib/minio";
import "@uiw/react-markdown-preview/markdown.css";

// 动态导入避免 SSR 问题
const MarkdownPreview = dynamic(
  () => import("@uiw/react-markdown-preview").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="text-stone-400 p-4">加载中...</div> }
);

type Category = keyof typeof ASSETS.docs;

export default function DocsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("prd");
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const categories = Object.keys(ASSETS.docs) as Category[];
  const currentDocs = ASSETS.docs[activeCategory] || [];

  useEffect(() => {
    if (currentDocs.length > 0 && !activeDoc) {
      setActiveDoc(currentDocs[0].path);
    }
  }, [currentDocs, activeDoc]);

  useEffect(() => {
    if (!activeDoc) return;
    setLoading(true);
    fetch(getObjectUrl(activeDoc))
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent("# 加载失败\n\n请稍后重试");
        setLoading(false);
      });
  }, [activeDoc]);

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    const docs = ASSETS.docs[cat];
    if (docs.length > 0) {
      setActiveDoc(docs[0].path);
    } else {
      setActiveDoc(null);
      setContent("");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 分类标签 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const meta = DOC_CATEGORIES[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-stone-800 text-white"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
              >
                {meta.label}
                <span className="ml-2 text-xs opacity-70">({ASSETS.docs[cat].length})</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 文档列表 */}
          <aside className="col-span-12 md:col-span-3 bg-white border border-stone-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              {DOC_CATEGORIES[activeCategory].label}
            </h2>
            {currentDocs.length === 0 ? (
              <p className="text-stone-400 text-sm">暂无文档</p>
            ) : (
              <ul className="space-y-1">
                {currentDocs.map((doc) => (
                  <li key={doc.path}>
                    <button
                      onClick={() => setActiveDoc(doc.path)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                        activeDoc === doc.path
                          ? "bg-amber-100 text-amber-700"
                          : "hover:bg-stone-100 text-stone-600"
                      }`}
                    >
                      {doc.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* 文档内容 - 使用 @uiw/react-markdown-preview */}
          <main className="col-span-12 md:col-span-9 bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="h-12 px-4 flex items-center border-b border-stone-100 bg-stone-50">
              <span className="text-sm font-medium text-stone-600">
                {currentDocs.find(d => d.path === activeDoc)?.name || "文档预览"}
              </span>
            </div>
            <div className="p-6 overflow-x-auto" data-color-mode="light">
              {loading ? (
                <div className="text-stone-400 text-center py-8">加载中...</div>
              ) : activeDoc ? (
                <MarkdownPreview 
                  source={content} 
                  style={{ 
                    backgroundColor: "transparent",
                    fontSize: "15px",
                    lineHeight: "1.7"
                  }}
                  wrapperElement={{
                    "data-color-mode": "light"
                  }}
                />
              ) : (
                <p className="text-stone-400 text-center py-8">选择一个文档查看</p>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
