"use client";

import { ASSETS, getObjectUrl } from "@/lib/minio";

export default function CadPage() {
  const cadFiles = ASSETS.cad;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
            🔧 CAD 文件
          </h2>
          
          {cadFiles.length === 0 ? (
            <p className="text-stone-400">暂无 CAD 文件</p>
          ) : (
            <div className="space-y-3">
              {cadFiles.map((file) => (
                <div 
                  key={file.path}
                  className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200"
                >
                  <div>
                    <p className="font-medium text-stone-700">{file.name}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {file.name.endsWith(".step") || file.name.endsWith(".stp") 
                        ? "STEP 格式 - 适用于 CAD 软件" 
                        : "STL 格式 - 适用于 3D 打印"}
                    </p>
                  </div>
                  <a
                    href={getObjectUrl(file.path)}
                    download={file.name}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    下载
                  </a>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              💡 <strong>提示：</strong>STEP 文件可用 FreeCAD、Fusion 360、SolidWorks 等软件打开。
              STL 文件可直接用于 3D 打印切片。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
