import { NextRequest, NextResponse } from "next/server";
import {
  canChangeStudioPassword,
  clearLoginFailures,
  getStudioUserFromRequest,
  isSameOriginRequest,
  loginRetryAfter,
  recordLoginFailure,
  setStudioPassword,
  verifyStudioCredentials,
} from "@/lib/studio-auth";
import { validateNewPassword } from "@/lib/studio-passwords";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "無效的操作來源" }, { status: 403 });
  }
  const user = getStudioUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  if (!canChangeStudioPassword()) {
    return NextResponse.json(
      { error: "目前無法在這裡修改密碼（資料儲存空間尚未設定完成），請聯絡網站管理者。" },
      { status: 503 },
    );
  }

  let input: { currentPassword?: unknown; newPassword?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  }
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword.slice(0, 512) : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";

  // 目前密碼輸入錯誤和登入共用同一套次數限制，避免被拿來猜密碼。
  const retryAfter = loginRetryAfter(request, user.email);
  if (retryAfter > 0) {
    const minutes = Math.max(1, Math.ceil(retryAfter / 60));
    return NextResponse.json(
      { error: `目前密碼輸入錯誤次數太多，請在約 ${minutes} 分鐘後再試。` },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }
  if (!(await verifyStudioCredentials(user.email, currentPassword))) {
    recordLoginFailure(request, user.email);
    return NextResponse.json({ error: "目前的密碼不正確" }, { status: 400 });
  }
  clearLoginFailures(request, user.email);

  const invalid = validateNewPassword(newPassword, currentPassword);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    await setStudioPassword(user.email, newPassword);
  } catch (error) {
    console.error("Unable to save studio password", error);
    return NextResponse.json({ error: "暫時無法儲存新密碼，請稍後再試" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
