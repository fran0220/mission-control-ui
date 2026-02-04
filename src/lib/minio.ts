// MinIO 公共访问 URL 工具（客户端安全）
// Bucket 已设置为 public download，直接通过 HTTP 访问

const MINIO_URL = process.env.NEXT_PUBLIC_MINIO_URL || "https://minio-production-e654.up.railway.app";
const BUCKET = process.env.NEXT_PUBLIC_MINIO_BUCKET || "team-assets";

export function getObjectUrl(objectName: string) {
  return `${MINIO_URL}/${BUCKET}/${objectName}`;
}

// 分类文档结构
export const ASSETS = {
  docs: {
    prd: [
      { name: "PRD-情感机器人围棋模块", path: "docs/prd/PRD-情感机器人围棋模块.md" },
    ],
    dd: [
      { name: "硬件架构问答", path: "docs/dd/DD-硬件架构问答.md" },
      { name: "软硬件协同问答", path: "docs/dd/DD-软硬件协同问答.md" },
      { name: "竞品硬件对比", path: "docs/dd/DD-竞品硬件对比.md" },
      { name: "投资人问答汇总", path: "docs/dd/DD-投资人问答汇总.md" },
    ],
    bom: [
      { name: "BOM-硬件物料清单", path: "docs/bom/BOM-硬件物料清单.md" },
    ],
    review: [
      { name: "投资人尽调文档审查", path: "docs/review/REVIEW-投资人尽调文档.md" },
    ],
  },
  designs: {
    concept: [
      { name: "robot-concept-v1.png", path: "designs/concept/robot-concept-v1.png" },
    ],
    cmf: [],
    renders: [],
  },
  cad: [
    { 
      name: "围棋模块外壳", 
      step: "cad/go-module/go-module-housing.step",
      gltf: "cad/go-module/go-module-housing.gltf",
      hasPreview: true 
    },
    { 
      name: "围棋模块机械臂", 
      step: "cad/go-module/go-module-arm.step",
      gltf: "cad/go-module/go-module-arm.gltf",
      hasPreview: true 
    },
  ],
};

// 文档分类标签
export const DOC_CATEGORIES = {
  prd: { label: "📋 产品需求", color: "amber" },
  dd: { label: "💼 投资人尽调", color: "blue" },
  bom: { label: "📦 物料清单", color: "green" },
  review: { label: "✅ 审查报告", color: "purple" },
};
