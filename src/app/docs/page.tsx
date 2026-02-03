"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ASSETS, getObjectUrl } from "@/lib/minio";

export default function DocsPage() {
  const [active, setActive] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");

  const files = ASSETS.docs;

  useEffect(() => {
    if (files.length > 0 && !active) {
      setActive(files[0].path);
    }
  }, [files, active]);

  useEffect(() => {
    if (!active) return;
    fetch(getObjectUrl(active))
      .then((res) => res.text())
      .then(setContent)
      .catch(() => setContent("加载失败"));
  }, [active]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3 bg-white border border-stone-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">📑 文档列表</h2>
          <ul className="space-y-1">
            {files.map((file) => (
              <li key={file.path}>
                <button
                  onClick={() => setActive(file.path)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                    active === file.path
                      ? "bg-amber-100 text-amber-700"
                      : "hover:bg-stone-100 text-stone-600"
                  }`}
                >
                  {file.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <main className="col-span-12 md:col-span-9 bg-white border border-stone-200 rounded-lg p-6 prose prose-stone max-w-none">
          {active ? <ReactMarkdown>{content}</ReactMarkdown> : <p className="text-stone-400">选择一个文档查看</p>}
        </main>
      </div>
    </div>
  );
}
