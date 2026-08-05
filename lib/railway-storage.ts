import "server-only";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  isContactRequestKey,
  orphanedTripPdfDecision,
} from "@/lib/storage-keys";

const contentKey = "content/site-content.json";
const contactPrefix = "contact-requests/";
const tripPdfPrefix = "trip-pdfs/";
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

export async function deleteContactRequestObject(key: string) {
  if (!isContactRequestKey(key)) throw new Error("Invalid contact request key");

  const storage = getClient();
  if (!storage) throw new Error("Railway Storage Bucket is unavailable");

  await storage.client.send(
    new DeleteObjectCommand({
      Bucket: storage.config.bucket,
      Key: key,
    }),
  );
}

export type StoredContactRequestObject = {
  key: string;
  value: unknown;
};

// 回傳未經驗證的原始物件，由 lib/contact-requests.ts 負責正規化。
export async function listContactRequestObjects(
  limit: number,
): Promise<StoredContactRequestObject[] | null> {
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
      if (isContactRequestKey(object.Key)) keys.push(object.Key);
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
        return { key, value: JSON.parse(raw) as unknown };
      } catch {
        return null;
      }
    }),
  );

  return loaded.filter(
    (item): item is StoredContactRequestObject => item !== null,
  );
}

export async function uploadTripPdf(
  bytes: Uint8Array,
  filename: string,
  uploadedBy: string,
) {
  const storage = getClient();
  if (!storage) throw new Error("Railway Storage Bucket is unavailable");

  const key = `${tripPdfPrefix}${Date.now()}-${crypto.randomUUID()}.pdf`;
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

export type TripPdfCleanupResult = {
  deleted: number;
  protectedRecent: number;
};

// 已從發布內容移除的 PDF 可立即刪除；其他從未發布的上傳檔保留 24 小時，
// 避免另一位管理員剛上傳、尚未按下儲存時被誤判為孤兒檔案。
export async function cleanupOrphanedTripPdfs({
  referencedKeys,
  immediatelyRemoveKeys = new Set<string>(),
  now = Date.now(),
}: {
  referencedKeys: ReadonlySet<string>;
  immediatelyRemoveKeys?: ReadonlySet<string>;
  now?: number;
}): Promise<TripPdfCleanupResult> {
  const storage = getClient();
  if (!storage) throw new Error("Railway Storage Bucket is unavailable");

  const deleteKeys: string[] = [];
  let protectedRecent = 0;
  let continuationToken: string | undefined;

  do {
    const page = await storage.client.send(
      new ListObjectsV2Command({
        Bucket: storage.config.bucket,
        Prefix: tripPdfPrefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of page.Contents ?? []) {
      const decision = orphanedTripPdfDecision({
        key: object.Key,
        lastModified: object.LastModified,
        referencedKeys,
        immediatelyRemoveKeys,
        now,
      });
      if (decision === "delete") deleteKeys.push(object.Key!);
      if (decision === "protect-recent") protectedRecent += 1;
    }

    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  for (let index = 0; index < deleteKeys.length; index += 1000) {
    const keys = deleteKeys.slice(index, index + 1000);
    const result = await storage.client.send(
      new DeleteObjectsCommand({
        Bucket: storage.config.bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
    if (result.Errors?.length) {
      throw new Error(`Unable to delete ${result.Errors.length} orphan PDFs`);
    }
  }

  return { deleted: deleteKeys.length, protectedRecent };
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
