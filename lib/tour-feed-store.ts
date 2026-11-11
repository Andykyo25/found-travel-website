import "server-only";
import { readTourFeedObject, writeTourFeedObject } from "./railway-storage";
import type { FeedLinks, FeedSnapshot } from "./tour-feed-overlay";

// 同步結果留在記憶體，前台讀取不用每次都去 Bucket；每 5 分鐘在背景重讀一次，
// 這樣即使同步是在另一台伺服器跑的也會跟上。
type FeedState = { snapshot: FeedSnapshot | null; links: FeedLinks };
const reloadAfterMs = 5 * 60_000;
let state: FeedState | null = null;
let loadedAt = 0;
let loading: Promise<FeedState> | null = null;

function asSnapshot(value: unknown): FeedSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<FeedSnapshot>;
  return typeof candidate.syncedAt === "string" && Array.isArray(candidate.products) && Array.isArray(candidate.matches)
    ? (candidate as FeedSnapshot)
    : null;
}

function asLinks(value: unknown): FeedLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function load(): Promise<FeedState> {
  loading ??= Promise.all([readTourFeedObject("snapshot"), readTourFeedObject("links")])
    .then(([snapshot, links]) => {
      state = { snapshot: asSnapshot(snapshot), links: asLinks(links) };
      loadedAt = Date.now();
      return state;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** 讀不到同步結果時回傳空的：官網照常顯示業務填的內容。 */
export async function getTourFeedState(): Promise<FeedState> {
  if (state) {
    if (Date.now() - loadedAt > reloadAfterMs) void load().catch((error) => console.error("Unable to reload tour feed", error));
    return state;
  }
  try {
    return await load();
  } catch (error) {
    console.error("Unable to load tour feed", error);
    loadedAt = Date.now();
    state = { snapshot: null, links: {} };
    return state;
  }
}

export async function saveTourFeedSnapshot(snapshot: FeedSnapshot) {
  await writeTourFeedObject("snapshot", snapshot);
  state = { snapshot, links: state?.links ?? asLinks(await readTourFeedObject("links")) };
  loadedAt = Date.now();
}

export async function saveTourFeedLink(tripId: string, key: string | null) {
  const links = { ...asLinks(await readTourFeedObject("links")) };
  if (key === null) delete links[tripId];
  else links[tripId] = key;
  await writeTourFeedObject("links", links);
  state = { snapshot: state?.snapshot ?? asSnapshot(await readTourFeedObject("snapshot")), links };
  loadedAt = Date.now();
  return links;
}
