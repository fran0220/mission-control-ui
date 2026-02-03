"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ASSETS, DOC_CATEGORIES, getObjectUrl } from "@/lib/minio";

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

          {/* 文档内容 */}
          <main className="col-span-12 md:col-span-9 bg-white border border-stone-200 rounded-lg p-6 overflow-x-auto">
            {loading ? (
              <div className="text-stone-400 text-center py-8">加载中...</div>
            ) : activeDoc ? (
              <article className="prose prose-stone prose-sm md:prose-base max-w-none
                prose-headings:font-bold prose-headings:text-stone-800
                prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-4
                prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                prose-h3:text-lg
                prose-p:text-stone-600 prose-p:leading-relaxed
                prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline
                prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-stone-900 prose-pre:text-stone-100
                prose-table:border-collapse prose-table:w-full
                prose-th:bg-stone-100 prose-th:border prose-th:border-stone-300 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                prose-td:border prose-td:border-stone-200 prose-td:px-3 prose-td:py-2
                prose-tr:even:bg-stone-50
                prose-ul:list-disc prose-ul:pl-6
                prose-ol:list-decimal prose-ol:pl-6
                prose-li:my-1
                prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:bg-amber-50 prose-blockquote:pl-4 prose-blockquote:py-2
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </article>
            ) : (
              <p className="text-stone-400 text-center py-8">选择一个文档查看</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
