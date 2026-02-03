import { minioClient } from "@/lib/minio-server";

export const runtime = "nodejs";

const BUCKET = "team-assets";
const PREFIX = "designs/";

export async function DELETE(
  _request: Request,
  context: { params: { path?: string[] } }
) {
  const key = `${PREFIX}${(context.params.path || []).join("/")}`;
  if (!key || key === PREFIX) {
    return new Response(JSON.stringify({ error: "invalid_path" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    await minioClient.removeObject(BUCKET, key);
    return Response.json({ ok: true, path: key });
  } catch (error) {
    console.error("Failed to delete MinIO object:", error);
    return new Response(JSON.stringify({ error: "failed_to_delete_object" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
