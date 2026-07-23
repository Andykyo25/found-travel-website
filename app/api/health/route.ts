import { NextResponse } from "next/server";
import { isRailwayStorageConfigured } from "@/lib/railway-storage";
import { isStudioAuthConfigured } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    storageConfigured: isRailwayStorageConfigured(),
    studioAuthConfigured: isStudioAuthConfigured(),
  });
}
