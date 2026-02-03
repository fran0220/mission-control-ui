import { minioClient } from "@/lib/minio-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "team-assets";
const PREFIX = "designs/";

type Asset = {
  path: string;
  name: string;
  size: number;
  lastModified: number | null;
  category: string;
};

type ListResponse = {
  assets: Asset[];
  categories: Record<string, Asset[]>;
};

const getCategoryFromPath = (path: string) => {
  const trimmed = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const parts = trimmed.split("/").filter(Boolean);
  return parts[0] || "uncategorized";
};

const listObjects = async () => {
  const stream = minioClient.listObjectsV2(BUCKET, PREFIX, true);
  const assets: Asset[] = [];

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (obj) => {
      if (!obj.name || obj.name.endsWith("/")) return;
      const category = getCategoryFromPath(obj.name);
      assets.push({
        path: obj.name,
        name: obj.name.split("/").pop() || obj.name,
        size: obj.size ?? 0,
        lastModified: obj.lastModified ? obj.lastModified.getTime() : null,
        category,
      });
    });
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve());
  });

  return assets;
};

export async function GET() {
  try {
    const assets = await listObjects();
    const categories: Record<string, Asset[]> = {};
    for (const asset of assets) {
      if (!categories[asset.category]) {
        categories[asset.category] = [];
      }
      categories[asset.category].push(asset);
    }
    const payload: ListResponse = { assets, categories };
    return Response.json(payload);
  } catch (error) {
    console.error("Failed to list MinIO objects:", error);
    return new Response(JSON.stringify({ error: "failed_to_list_objects" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
