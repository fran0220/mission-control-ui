import { Client } from "minio";

export const minioClient = new Client({
  endPoint: "minio-production-e654.up.railway.app",
  port: 443,
  useSSL: true,
  accessKey: "admin",
  secretKey: "EPxtMkGstFW0dXWjKwrB",
});
