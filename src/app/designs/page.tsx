"use client";

import { useEffect, useState } from "react";
import { listObjects, getObjectUrl } from "@/lib/minio";

const categories = ["concept", "cmf", "renders"];

export default function DesignsPage() {
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(
      categories.map(async (cat) => {
        const objs = await listObjects(`designs/${cat}/`);
        const files = objs
          .map((o: any) => o.name)
          .filter((name: string) => /\.(png|jpg|jpeg|webp|gif)$/i.test(name));
        return [cat, files] as const;
      })
    ).then((results) => {
      const next: Record<string, string[]> = {};
      results.forEach(([cat, files]) => {
        next[cat] = files;
      });
      setImages(next);
    });
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
              {cat}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(images[cat] || []).map((img) => (
                <button
                  key={img}
                  onClick={() => setPreview(img)}
                  className="group relative aspect-square bg-white border border-stone-200 rounded-lg overflow-hidden"
                >
                  <img
                    src={getObjectUrl(img)}
                    alt={img}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setPreview(null)}>
          <div className="max-w-4xl w-full px-6">
            <img src={getObjectUrl(preview)} alt={preview} className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
