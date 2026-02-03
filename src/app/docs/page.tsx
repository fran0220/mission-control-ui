"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { listObjects, getObjectUrl } from "@/lib/minio";

export default function DocsPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    listObjects("docs/").then((objs) => {
      const names = objs
        .map((o: any) => o.name)
        .filter((name: string) => name.endsWith(".md"));
      setFiles(names);
      if (names.length > 0) setActive(names[0]);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    fetch(getObjectUrl(active))
      .then((res) => res.text())
      .then(setContent);
  }, [active]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3 bg-white border border-stone-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">文档列表</h2>
          <ul className="space-y-1">
            {files.map((file) => (
              <li key={file}>
                <button
                  onClick={() => setActive(file)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                    active === file
                      ? "bg-amber-100 text-amber-700"
                      : "hover:bg-stone-100 text-stone-600"
                  }`}
                >
                  {file.replace("docs/", "")}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <main className="col-span-12 md:col-span-9 bg-white border border-stone-200 rounded-lg p-6 prose prose-stone max-w-none">
          {active ? <ReactMarkdown>{content}</ReactMarkdown> : <p>暂无文档</p>}
        </main>
      </div>
    </div>
  );
}
