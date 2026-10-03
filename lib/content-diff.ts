// 還原舊版本前，先用白話告訴業務「換回去之後會有什麼不同」。只 import type。
import type { SiteContent } from "./site-content";

export type RestoreSummary = {
  /** 舊版本有、目前畫面沒有：還原後會多出來的行程 */
  added: string[];
  /** 目前畫面有、舊版本沒有：還原後會消失的行程 */
  removed: string[];
  /** 兩邊都有，但內容不同：會被換回舊內容的行程 */
  changed: string[];
  reordered: boolean;
  /** 首頁文字、聯絡資訊、輪播照片等行程以外的設定有不同 */
  settingsChanged: boolean;
  unchanged: boolean;
};

const label = (trip: { title: string }) => trip.title.trim() || "（未命名行程）";

export function summarizeContentRestore(current: SiteContent, snapshot: SiteContent): RestoreSummary {
  const currentById = new Map(current.trips.map((trip) => [trip.id, trip]));
  const snapshotById = new Map(snapshot.trips.map((trip) => [trip.id, trip]));

  const added = snapshot.trips.filter((trip) => !currentById.has(trip.id)).map(label);
  const removed = current.trips.filter((trip) => !snapshotById.has(trip.id)).map(label);
  const changed = snapshot.trips
    .filter((trip) => {
      const existing = currentById.get(trip.id);
      return existing !== undefined && JSON.stringify(existing) !== JSON.stringify(trip);
    })
    .map(label);

  const commonOrder = (trips: SiteContent["trips"], other: Map<string, unknown>) =>
    trips.filter((trip) => other.has(trip.id)).map((trip) => trip.id).join("\n");
  const reordered = commonOrder(current.trips, snapshotById) !== commonOrder(snapshot.trips, currentById);

  const settings = (content: SiteContent) => JSON.stringify({ ...content, trips: undefined });
  const settingsChanged = settings(current) !== settings(snapshot);

  return {
    added,
    removed,
    changed,
    reordered,
    settingsChanged,
    unchanged: !added.length && !removed.length && !changed.length && !reordered && !settingsChanged,
  };
}

/** 把摘要轉成給業務看的幾行白話。 */
export function describeRestore(summary: RestoreSummary): string[] {
  if (summary.unchanged) return ["這個版本和目前畫面上的內容一樣，不需要還原。"];
  const names = (items: string[]) => {
    const shown = items.slice(0, 4).map((item) => `「${item}」`).join("、");
    return items.length > 4 ? `${shown} 等 ${items.length} 個` : shown;
  };
  const lines: string[] = [];
  if (summary.added.length) lines.push(`會多回 ${summary.added.length} 個行程：${names(summary.added)}`);
  if (summary.removed.length) lines.push(`會少掉 ${summary.removed.length} 個行程：${names(summary.removed)}`);
  if (summary.changed.length) lines.push(`${summary.changed.length} 個行程的內容會換回舊的：${names(summary.changed)}`);
  if (summary.reordered) lines.push("行程的排列順序會換回舊的");
  if (summary.settingsChanged) lines.push("網站設定（首頁文字、輪播照片、聯絡資訊等）會換回舊的");
  return lines;
}
