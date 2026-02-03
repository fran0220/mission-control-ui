"use client";

import { useState } from "react";
import { ASSETS, getObjectUrl } from "@/lib/minio";

const categories = ["concept", "cmf", "renders"] as const;

export default function DesignsPage() {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {categories.map((cat) => {
          const images = ASSETS.designs[cat] || [];
          return (
            <section key={cat}>
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
                🎨 {cat}
              </h2>
              {images.length === 0 ? (
                <p className="text-stone-400 text-sm">暂无 {cat} 图片</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((img) => (
                    <button
                      key={img.path}
                      onClick={() => setPreview(img.path)}
                      className="group relative aspect-square bg-white border border-stone-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <img
                        src={getObjectUrl(img.path)}
                        alt={img.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                        {img.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {preview && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" 
          onClick={() => setPreview(null)}
        >
          <div className="max-w-4xl w-full">
            <img 
              src={getObjectUrl(preview)} 
              alt={preview} 
              className="w-full h-auto rounded-lg shadow-2xl" 
            />
            <p className="text-white text-center mt-4 text-sm">点击任意位置关闭</p>
          </div>
        </div>
      )}
    </div>
  );
}
