import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const studioSessionCookie = "found_studio_session";
export const studioSessionMaxAge = 8 * 60 * 60;

export type StudioUser = {
  email: string;
  displayName: string;
};

type LoginAttempt = {
  failures: number;
  lockedUntil: number;
  windowStartedAt: number;
};

const loginWindowMs = 15 * 60 * 1000;
const maxLoginFailures = 5;
const loginAttempts =
  (
    globalThis as typeof globalThis & {
      foundTravelLoginAttempts?: Map<string, LoginAttempt>;
    }
  ).foundTravelLoginAttempts ?? new Map<string, LoginAttempt>();

(
  globalThis as typeof globalThis & {
    foundTravelLoginAttempts?: Map<string, LoginAttempt>;
  }
).foundTravelLoginAttempts = loginAttempts;

function configuredEmail() {
  return (process.env.STUDIO_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

function sessionSecret() {
  const configured = process.env.STUDIO_SESSION_SECRET?.trim();
  if (configured) return configured;
  const password = process.env.STUDIO_ADMIN_PASSWORD ?? "";
  return password
    ? createHash("sha256")
        .update(`found-travel-session\0${password}`)
        .digest("base64url")
    : "";
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
}

function normalizedSessionEmail(email: string) {
  return Buffer.from(email, "utf8").toString("base64url");
}

function decodedSessionEmail(value: string) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

export function isStudioAuthConfigured() {
  return Boolean(
    configuredEmail() &&
      (process.env.STUDIO_ADMIN_PASSWORD ?? "").length >= 10,
  );
}

export function verifyStudioCredentials(email: string, password: string) {
  const expectedEmail = configuredEmail();
  const expectedPassword = process.env.STUDIO_ADMIN_PASSWORD ?? "";
  if (!isStudioAuthConfigured()) return false;

  return (
    safeEqual(email.trim().toLowerCase(), expectedEmail) &&
    safeEqual(password, expectedPassword)
  );
}

export function createStudioSession(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const expiresAt = Math.floor(Date.now() / 1000) + studioSessionMaxAge;
  const payload = `v1.${normalizedSessionEmail(normalizedEmail)}.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyStudioSession(token: string | undefined) {
  if (!token || !isStudioAuthConfigured()) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;

  const payload = parts.slice(0, 3).join(".");
  const expectedSignature = signature(payload);
  if (!safeEqual(parts[3], expectedSignature)) return null;

  const expiresAt = Number(parts[2]);
  const email = decodedSessionEmail(parts[1]).trim().toLowerCase();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) return null;
  if (!safeEqual(email, configuredEmail())) return null;

  return {
    email,
    displayName: email.split("@")[0] || email,
  } satisfies StudioUser;
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() === name) {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    }
  }
  return undefined;
}

export async function getStudioUser() {
  const cookieStore = await cookies();
  return verifyStudioSession(cookieStore.get(studioSessionCookie)?.value);
}

export function getStudioUserFromRequest(request: Request) {
  return verifyStudioSession(
    cookieValue(request.headers.get("cookie"), studioSessionCookie),
  );
}

export async function requireStudioUser() {
  const user = await getStudioUser();
  if (user) return user;
  redirect("/studio/login");
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const requestUrl = new URL(request.url);
      const host =
        request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
        request.headers.get("host") ??
        requestUrl.host;
      const protocol =
        request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
        requestUrl.protocol.replace(":", "");
      return originUrl.host === host && originUrl.protocol === `${protocol}:`;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

function loginAttemptKey(request: Request, email: string) {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return createHash("sha256")
    .update(`${ip}\0${email.trim().toLowerCase()}`)
    .digest("base64url");
}

export function loginRetryAfter(request: Request, email: string) {
  const key = loginAttemptKey(request, email);
  const attempt = loginAttempts.get(key);
  if (!attempt) return 0;
  if (attempt.lockedUntil <= Date.now()) return 0;
  return Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
}

export function recordLoginFailure(request: Request, email: string) {
  const key = loginAttemptKey(request, email);
  const now = Date.now();
  const current = loginAttempts.get(key);
  const expired = !current || now - current.windowStartedAt > loginWindowMs;
  const failures = expired ? 1 : current.failures + 1;

  loginAttempts.set(key, {
    failures,
    windowStartedAt: expired ? now : current.windowStartedAt,
    lockedUntil: failures >= maxLoginFailures ? now + loginWindowMs : 0,
  });
}

export function clearLoginFailures(request: Request, email: string) {
  loginAttempts.delete(loginAttemptKey(request, email));
}
