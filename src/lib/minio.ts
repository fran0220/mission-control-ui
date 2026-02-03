// MinIO 公共访问 URL 工具（客户端安全）
// Bucket 已设置为 public download，直接通过 HTTP 访问

const MINIO_URL = process.env.NEXT_PUBLIC_MINIO_URL || "https://minio-production-e654.up.railway.app";
const BUCKET = process.env.NEXT_PUBLIC_MINIO_BUCKET || "team-assets";

export function getObjectUrl(objectName: string) {
  return `${MINIO_URL}/${BUCKET}/${objectName}`;
}

// 预定义的文件列表（因为 MinIO 列表 API 需要认证）
// 后续可以通过 API 路由动态获取
export const ASSETS = {
  docs: [
    { name: "PRD-情感机器人围棋模块.md", path: "docs/PRD-情感机器人围棋模块.md" },
    { name: "DD-硬件架构问答.md", path: "docs/DD-硬件架构问答.md" },
    { name: "DD-软硬件协同问答.md", path: "docs/DD-软硬件协同问答.md" },
    { name: "DD-竞品硬件对比.md", path: "docs/DD-竞品硬件对比.md" },
    { name: "DD-投资人问答汇总.md", path: "docs/DD-投资人问答汇总.md" },
    { name: "BOM-硬件物料清单.md", path: "docs/BOM-硬件物料清单.md" },
    { name: "REVIEW-投资人尽调文档.md", path: "docs/REVIEW-投资人尽调文档.md" },
  ],
  designs: {
    concept: [
      { name: "robot-concept-v1.png", path: "designs/concept/robot-concept-v1.png" },
    ],
    cmf: [],
    renders: [],
  },
  cad: [
    { name: "arm-mount-v1.step", path: "cad/arm-mount-v1.step" },
  ],
};
