import "server-only";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const contentKey = "content/site-content.json";
const contactPrefix = "contact-requests/";
let cachedClient: S3Client | null = null;

type StorageConfig = {
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  forcePathStyle: boolean;
  region: string;
  secretAccessKey: string;
};

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function getStorageConfig(): StorageConfig | null {
  const bucket = firstValue(process.env.BUCKET_NAME, process.env.BUCKET);
  const endpoint = firstValue(
    process.env.BUCKET_ENDPOINT,
    process.env.ENDPOINT,
  );
  const accessKeyId = firstValue(
    process.env.BUCKET_ACCESS_KEY_ID,
    process.env.ACCESS_KEY_ID,
  );
  const secretAccessKey = firstValue(
    process.env.BUCKET_SECRET_ACCESS_KEY,
    process.env.SECRET_ACCESS_KEY,
  );
  const region =
    firstValue(process.env.BUCKET_REGION, process.env.REGION) || "auto";

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) return null;

  return {
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    region,
    forcePathStyle:
      firstValue(process.env.BUCKET_FORCE_PATH_STYLE).toLowerCase() === "true",
  };
}

function getClient() {
  const config = getStorageConfig();
  if (!config) return null;

  cachedClient ??= new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client: cachedClient, config };
}

export function isRailwayStorageConfigured() {
  return Boolean(getStorageConfig());
}

export async function readSiteContentObject<T>(): Promise<T | null> {
  const storage = getClient();
  if (!storage) return null;

  try {
    const result = await storage.client.send(
      new GetObjectCommand({
        Bucket: storage.config.bucket,
        Key: contentKey,
      }),
    );
    if (!result.Body) return null;
    return JSON.parse(await result.Body.transformToString("utf-8")) as T;
  } catch (error) {
    if (
      error instanceof NoSuchKey ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error.name === "NoSuchKey" || error.name === "NotFound"))
    ) {
      return null;
    }
    throw error;
  }
}

export async function writeSiteContentObject(value: unknown) {
  const storage = getClient();
  if (!storage) throw new Error("Railway Storage Bucket is unavailable");

  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.config.bucket,
      Key: contentKey,
      Body: JSON.stringify(value),
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-store",
    }),
  );
}

// 每筆聯絡單各存成一個物件，避免多位客人同時送出時互相覆蓋。
// 檔名前綴使用毫秒時間戳，字典排序即等於時間排序。
export async function writeContactRequestObject(id: string, value: unknown) {
  const storage = getClient();
  if (!storage) throw new Error("Railway Storage Bucket is unavailable");

  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.config.bucket,
      Key: `${contactPrefix}${Date.now()}-${id}.json`,
      Body: JSON.stringify(value),
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-store",
    }),
  );
}

// 回傳未經驗證的原始物件，由 lib/contact-requests.ts 負責正規化。
export async function listContactRequestObjects(
  limit: number,
): Promise<unknown[] | null> {
  const storage = getClient();
  if (!storage) return null;

  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await storage.client.send(
      new ListObjectsV2Command({
        Bucket: storage.config.bucket,
        Prefix: contactPrefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  const newestFirst = keys.sort().reverse().slice(0, limit);
  const loaded = await Promise.all(
    newestFirst.map(async (key) => {
      try {
        const result = await storage.client.send(
          new GetObjectCommand({
            Bucket: storage.config.bucket,
            Key: key,
          }),
        );
        if (!result.Body) return null;
        const raw = await result.Body.transformToString("utf-8");
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    }),
  );

  return loaded.filter((item) => item !== null);
}

export async function uploadTripPdf(
  bytes: Uint8Array,
  filename: string,
  uploadedBy: string,
) {
  const storage = getClient();
  if (!storage) throw new Error("Railway Storage Bucket is unavailable");

  const key = `trip-pdfs/${Date.now()}-${crypto.randomUUID()}.pdf`;
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.config.bucket,
      Key: key,
      Body: bytes,
      ContentType: "application/pdf",
      ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      Metadata: {
        filename: encodeURIComponent(filename.slice(0, 240)),
        uploadedby: encodeURIComponent(uploadedBy.slice(0, 240)),
      },
    }),
  );

  return key;
}

export async function createTripPdfUrl(key: string) {
  const storage = getClient();
  if (!storage) return null;

  try {
    return await getSignedUrl(
      storage.client,
      new GetObjectCommand({
        Bucket: storage.config.bucket,
        Key: key,
        ResponseContentType: "application/pdf",
        ResponseContentDisposition: "inline",
      }),
      { expiresIn: 5 * 60 },
    );
  } catch {
    return null;
  }
}
