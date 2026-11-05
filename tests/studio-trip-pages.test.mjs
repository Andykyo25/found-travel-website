import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("studio lists trips as cards and edits one trip at a time on its own URL", async () => {
  const [editor, page, draft, contentEditor] = await Promise.all(
    [
      "../app/components/TripsEditor.tsx",
      "../app/studio/page.tsx",
      "../app/components/StudioDraft.tsx",
      "../app/components/TripContentEditor.tsx",
    ].map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );

  // 列表是卡片，不再是一長串可以開合的行程。
  assert.match(editor, /className="studio-trip-cards"/);
  assert.doesNotMatch(editor, /openTripIds|全部展開|studio-trip-toggle/);
  // 點卡片進入單一行程頁，網址同步成 ?trip=，上一頁與重新整理都回到同一個行程。
  assert.match(editor, /window\.history\.pushState\(null, "", id \? `\/studio\?trip=\$\{encodeURIComponent\(id\)\}` : "\/studio"\)/);
  assert.match(editor, /addEventListener\("popstate"/);
  assert.match(page, /initialTripId=\{typeof trip === "string" \? trip : null\}/);
  // 行程頁分成固定的區段，有區段導覽；版本卡片直接展開。
  for (const id of ["trip-basic", "trip-content", "trip-plans", "trip-departures"]) {
    assert.match(editor, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(editor, /openPlanIds|<details\s+className="plan-editor-card"/);
  // 卡片與行程頁標出還沒儲存的行程；草稿與儲存仍是同一份，切換行程不會弄丟修改。
  assert.match(draft, /savedJson: saved/);
  assert.match(editor, /tripDirty\(trip\) \? <span className="studio-trip-dirty">未儲存<\/span>/);
  // 儲存時有沒填完的行程，直接打開那個行程。
  assert.match(editor, /if \(unfinished\.id !== activeTripId\) openTrip\(unfinished\.id\)/);
  // 行程內容在編輯頁直接展開，不用再點開。
  assert.doesNotMatch(contentEditor, /<details\s+className="field-wide trip-content-editor"/);
});
