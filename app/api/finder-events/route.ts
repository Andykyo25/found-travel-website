import { NextRequest, NextResponse } from "next/server";
import { finderEvents } from "@/lib/finder-events";
import { isSameOriginRequest } from "@/lib/studio-auth";

// Operational counters only; these events are not proof of unique visitors or sales.
let windowStart = Date.now();
let count = 0;
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 403 });
  if (Date.now() - windowStart > 60000) { windowStart = Date.now(); count = 0; }
  if (++count > 300) return new NextResponse(null, { status: 429 });
  const raw = await request.text();
  if (raw.length > 100) return new NextResponse(null, { status: 400 });
  try {
    const { event } = JSON.parse(raw);
    if (!finderEvents.includes(event)) return new NextResponse(null, { status: 400 });
    console.info(JSON.stringify({ metric: "travel_finder", event, at: new Date().toISOString() }));
    return new NextResponse(null, { status: 204 });
  } catch { return new NextResponse(null, { status: 400 }); }
}
