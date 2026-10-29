import "server-only";

import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// 業務自己改的密碼，雜湊後存在 Bucket（不會存明碼）。
//
// 設計重點：
// - 登入時：有自己改過的密碼就只認它；舊的環境變數密碼不再有效。
// - 忘記密碼時：管理者到 Railway 把該帳號的密碼改成新的，記錄裡綁定的「環境變數密碼指紋」
//   就對不上，自己改的密碼自動作廢，回到管理者設定的密碼，不需要手動去刪 Bucket 檔案。
// - 帳號本身（誰有權限）仍然完全由環境變數決定；這裡只管密碼。

export const passwordMinLength = 10;
export const passwordMaxLength = 128;

export type PasswordRecord = {
  v: 1;
  salt: string;
  hash: string;
  baseSalt: string;
  baseHash: string;
  changedAt: string;
};

const keyLength = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

function equal(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function passwordRecordKey(email: string) {
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `studio-passwords/${digest}.json`;
}

export function validateNewPassword(newPassword: unknown, currentPassword: string): string | null {
  if (typeof newPassword !== "string") return "請輸入新密碼";
  if (newPassword.length < passwordMinLength) return `新密碼至少需要 ${passwordMinLength} 個字元`;
  if (newPassword.length > passwordMaxLength) return `新密碼最多 ${passwordMaxLength} 個字元`;
  if (newPassword === currentPassword) return "新密碼不能和目前的密碼一樣";
  if (newPassword.trim() !== newPassword) return "新密碼的開頭和結尾不能有空白";
  return null;
}

/** envPassword：該帳號目前在環境變數裡設定的密碼，用來綁定這筆記錄（見上方說明）。 */
export async function createPasswordRecord(
  newPassword: string,
  envPassword: string,
  now = new Date(),
): Promise<PasswordRecord> {
  const salt = randomBytes(16);
  const baseSalt = randomBytes(16);
  const [hash, baseHash] = await Promise.all([derive(newPassword, salt), derive(envPassword, baseSalt)]);
  return {
    v: 1,
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
    baseSalt: baseSalt.toString("base64"),
    baseHash: baseHash.toString("base64"),
    changedAt: now.toISOString(),
  };
}

export function parsePasswordRecord(value: unknown): PasswordRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.v !== 1) return null;
  for (const field of ["salt", "hash", "baseSalt", "baseHash", "changedAt"] as const) {
    if (typeof record[field] !== "string" || !record[field]) return null;
  }
  const decode = (field: string) => Buffer.from(record[field] as string, "base64");
  if (decode("salt").length !== 16 || decode("hash").length !== keyLength) return null;
  if (decode("baseSalt").length !== 16 || decode("baseHash").length !== keyLength) return null;
  return record as unknown as PasswordRecord;
}

/**
 * ok：密碼正確；wrong：密碼錯誤；
 * void：管理者之後改過環境變數密碼，這筆自己改的密碼已作廢，呼叫端要改用環境變數密碼。
 */
export async function checkPasswordRecord(
  record: PasswordRecord,
  password: string,
  envPassword: string,
): Promise<"ok" | "wrong" | "void"> {
  const base = await derive(envPassword, Buffer.from(record.baseSalt, "base64"));
  if (!equal(base, Buffer.from(record.baseHash, "base64"))) return "void";
  const candidate = await derive(password, Buffer.from(record.salt, "base64"));
  return equal(candidate, Buffer.from(record.hash, "base64")) ? "ok" : "wrong";
}

/**
 * 登入密碼的判定結果。只有 status 會影響回給瀏覽器的訊息；reason 只寫進伺服器 log，
 * 讓管理者在 Railway 查得到原因，又不會讓外人知道哪個帳號存在、有沒有改過密碼。
 */
export type PasswordVerdict =
  | { status: "ok" }
  | { status: "invalid"; reason: "wrong-password" }
  | { status: "invalid"; reason: "self-set-password"; changedAt: string }
  | { status: "unavailable"; error: unknown };

/**
 * loadRecord：讀 Bucket 裡這個帳號自己改的密碼記錄，沒有就回傳 null、讀取失敗就丟錯。
 * matchesEnv：輸入的密碼是否等於環境變數裡的密碼（由呼叫端用 timing-safe 比對）。
 */
export async function judgePassword(options: {
  password: string;
  envPassword: string;
  matchesEnv: boolean;
  loadRecord: () => Promise<unknown | null>;
}): Promise<PasswordVerdict> {
  let record;
  try {
    record = parsePasswordRecord(await options.loadRecord());
  } catch (error) {
    // 讀不到就無法確定這個帳號有沒有改過密碼；寧可暫時不能登入，也不放行舊密碼。
    return { status: "unavailable", error };
  }
  if (record) {
    const outcome = await checkPasswordRecord(record, options.password, options.envPassword);
    if (outcome === "ok") return { status: "ok" };
    if (outcome === "wrong") {
      return { status: "invalid", reason: "self-set-password", changedAt: record.changedAt };
    }
  }
  return options.matchesEnv ? { status: "ok" } : { status: "invalid", reason: "wrong-password" };
}
