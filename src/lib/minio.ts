import { Client } from "minio";

const endpoint = process.env.MINIO_ENDPOINT || "";
const accessKey = process.env.MINIO_ACCESS_KEY || "";
const secretKey = process.env.MINIO_SECRET_KEY || "";
const bucket = process.env.MINIO_BUCKET || "";

const client = new Client({
  endPoint: endpoint.replace(/^https?:\/\//, ""),
  useSSL: endpoint.startsWith("https://"),
  accessKey,
  secretKey,
});

export async function listObjects(prefix: string) {
  return new Promise<any[]>((resolve, reject) => {
    const results: any[] = [];
    const stream = client.listObjectsV2(bucket, prefix, true);
    stream.on("data", (obj) => results.push(obj));
    stream.on("end", () => resolve(results));
    stream.on("error", reject);
  });
}

export function getObjectUrl(objectName: string) {
  const base = endpoint.startsWith("http") ? endpoint : `https://${endpoint}`;
  return `${base}/${bucket}/${objectName}`;
}

export async function getObjectText(objectName: string) {
  const obj = await client.getObject(bucket, objectName);
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    obj.on("data", (chunk) => chunks.push(chunk));
    obj.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    obj.on("error", reject);
  });
}
