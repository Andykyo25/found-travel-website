import "server-only";
import { isRailwayStorageConfigured } from "./railway-storage";
import { getSiteContentWithMeta, saveSiteContent } from "./site-content";
import { applySummaryRewrites } from "./summary-rewrites";

/**
 * 把重複的行程摘要換成改寫過的版本，存回發布內容（和業務在後台按儲存走同一條路，
 * 所以改之前的內容會留在「內容歷史」，可以還原）。伺服器啟動時跑一次；
 * 已經換過或業務自己改過的行程不會再動，所以之後每次啟動都是什麼也不做。
 */
export async function runSummaryRewrites(): Promise<number> {
  if (!isRailwayStorageConfigured()) return 0;
  const { content, meta } = await getSiteContentWithMeta();
  // 沒有 etag 代表 Bucket 裡還沒有發布內容（拿到的是預設範例），不要把範例存進去。
  if (!meta.etag) return 0;
  const { content: next, changed } = applySummaryRewrites(content);
  if (changed === 0) return 0;
  // 帶著 etag 寫入：這段時間若剛好有人在後台存檔，這次寫入會失敗，等下次啟動再試，不會蓋掉對方的修改。
  await saveSiteContent(next, "系統（行程摘要改寫）", meta.etag, {
    ...content,
    _updatedAt: meta.updatedAt,
    _updatedBy: meta.updatedBy,
  });
  return changed;
}
