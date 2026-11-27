import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDrivePdfs,
  autoLinkPlan,
  drivePlanKey,
  drivePlanStatus,
  driveTime,
  findReplacement,
  flattenDriveTree,
  isDraftPath,
  resolveBySiblings,
  siteDocumentTime,
  suggestDriveFile,
  uploadedAtFromKey,
} from "../lib/drive-pdf.ts";

// 仿照業務系統 /api/itineraries-tree 的回應；檔名與編號是虛構的。
const tree = {
  id: "root0000000000",
  name: "11.韓國",
  path: "11.韓國",
  files: [],
  subfolders: [
    {
      id: "folder00000001",
      name: "2.釜山",
      path: "11.韓國 > 2.釜山",
      files: [
        { id: "busanTR0000001", name: "「釜慶邱」釜山五日.pdf", url: "https://drive.google.com/file/d/busanTR0000001/view", modifiedTime: "2026/11/27 17:01:53" },
        { id: "busanDoc000001", name: "報名須知.docx", modifiedTime: "2026/11/01 10:00:00" },
      ],
      subfolders: [],
    },
    {
      id: "folder00000002",
      name: "5.高=釜山",
      path: "11.韓國 > 5.高=釜山",
      files: [{ id: "busanKH0000001", name: "「釜慶邱」釜山五日.pdf", modifiedTime: "2026/11/20 09:00:00" }],
      subfolders: [
        {
          id: "folder00000003",
          name: "待修中",
          path: "11.韓國 > 5.高=釜山 > 待修中",
          files: [{ id: "busanDraft0001", name: "釜山「親子」五日.pdf", modifiedTime: "2026/11/25 16:32:41" }],
          subfolders: [],
        },
      ],
    },
  ],
};

test("flattens the folder tree into PDFs with Taipei times converted to UTC", () => {
  const files = flattenDriveTree(tree);
  assert.deepEqual(
    files.map((file) => [file.id, file.path, file.modified]),
    [
      ["busanTR0000001", "11.韓國 > 2.釜山", "2026-11-27T09:01:53.000Z"],
      ["busanKH0000001", "11.韓國 > 5.高=釜山", "2026-11-20T01:00:00.000Z"],
      ["busanDraft0001", "11.韓國 > 5.高=釜山 > 待修中", "2026-11-25T08:32:41.000Z"],
    ],
  );
  assert.equal(driveTime("not a date"), "");
  assert.deepEqual(flattenDriveTree({ files: [{ id: "../../etc", name: "x.pdf" }] }), []);
});

const files = flattenDriveTree(tree);
const plan = (overrides = {}) => ({ id: "p1", airline: "易斯達航空", title: "台北出發", departureAirport: "桃園", ...overrides });

test("links a site PDF to the Drive file with the same name, ignoring width and spaces", () => {
  const extra = [...files, { id: "seoul00000001", name: "首爾「冰柱節」六日.pdf", path: "10.首爾", modified: "" }];
  const found = autoLinkPlan(plan(), "首爾「冰柱節」 六日.PDF", extra);
  assert.equal("file" in found && found.file.id, "seoul00000001");
  // 旅展資料夾的檔名多了排序用的前綴，Drive 上沒有。
  const loose = autoLinkPlan(plan(), "更1.首爾「冰柱節」六日.pdf", extra);
  assert.equal("file" in loose && loose.file.id, "seoul00000001");
  // 批次匯入存的檔名帶著旅展資料夾的路徑。
  const withFolder = autoLinkPlan(plan(), "旅展行程/5.韓國 A/首爾/更1.首爾「冰柱節」六日.pdf", extra);
  assert.equal("file" in withFolder && withFolder.file.id, "seoul00000001");
  assert.deepEqual(autoLinkPlan(plan(), "沒有這個檔.pdf", extra), { problem: "unmatched" });
});

test("picks between same-named files by departure city, otherwise asks staff", () => {
  const fromKaohsiung = autoLinkPlan(plan({ title: "高雄出發", departureAirport: "高雄" }), "「釜慶邱」釜山五日.pdf", files);
  assert.equal("file" in fromKaohsiung && fromKaohsiung.file.id, "busanKH0000001");
  const fromTaipei = autoLinkPlan(plan(), "「釜慶邱」釜山五日.pdf", files);
  assert.equal("file" in fromTaipei && fromTaipei.file.id, "busanTR0000001");

  const twins = [
    { id: "twinA00000001", name: "精彩五日.pdf", path: "13.大阪 > 1.AK亞航", modified: "" },
    { id: "twinB00000001", name: "精彩五日.pdf", path: "13.大阪 > 2.VZ泰越捷", modified: "" },
  ];
  const unclear = autoLinkPlan(plan({ airline: "長榮航空" }), "精彩五日.pdf", twins);
  assert.equal("problem" in unclear && unclear.problem, "ambiguous");
  const byAirline = autoLinkPlan(plan({ airline: "泰國亞洲航空" }), "精彩五日.pdf", twins);
  assert.equal("file" in byAirline && byAirline.file.id, "twinA00000001");
});

test("uses words from the plan name to pick between same-named files, then the sibling's leftover", () => {
  const twins = [
    { id: "busanEarly0001", name: "「巨濟島」釜山五日.pdf", path: "11.韓國 > 2.釜山 > 早去晚回五天 > 一站(彩妝)", modified: "" },
    { id: "busanRegular01", name: "「巨濟島」釜山五日.pdf", path: "11.韓國 > 3.釜山=正航 > 一站(彩妝)", modified: "" },
  ];
  const early = autoLinkPlan(plan({ title: "台北出發・早去晚回" }), "「巨濟島」釜山五日.pdf", twins);
  assert.equal("file" in early && early.file.id, "busanEarly0001");
  const plain = autoLinkPlan(plan({ title: "台北出發" }), "「巨濟島」釜山五日.pdf", twins);
  assert.equal("problem" in plain && plain.problem, "ambiguous");
  assert.equal(resolveBySiblings(["busanEarly0001", "busanRegular01"], ["busanEarly0001"]), "busanRegular01");
  assert.equal(resolveBySiblings(["busanEarly0001", "busanRegular01"], []), null);
  assert.equal(resolveBySiblings(["a", "b", "c"], ["a"]), null);
});

test("dates the site's PDF by its 行程更新日 (end of that Taipei day), else by upload time", () => {
  const key = "trip-pdfs/1787791025337-37e1657f-5b3c-436b-89fe-d9c651eb6044.pdf";
  assert.equal(new Date(siteDocumentTime({ documentUpdatedAt: "2026-11-04" }, key)).toISOString(), "2026-11-04T15:59:59.000Z");
  assert.equal(siteDocumentTime({ documentUpdatedAt: "" }, key), 1787791025337);
  assert.equal(siteDocumentTime({}, key), 1787791025337);
});

test("suggests the closest Drive file only when days, bracket name and grade agree", () => {
  const drive = [
    { id: "vietnamStd0001", name: "1. (--)精彩北越5日-星宇.pdf", path: "07.河內 > 1.河內=JX", modified: "" },
    { id: "vietnamSix0001", name: "1. (--)精彩北越6日-越捷-台北出發.pdf", path: "07.河內 > 2.河內=VJ", modified: "" },
    { id: "seoulSkiTR0001", name: "(TR)首爾「滑雪」五日-AQUAFIELD高陽汗蒸幕.pdf", path: "10.首爾", modified: "" },
  ];
  assert.equal(suggestDriveFile("旅展行程/4.河內/10. (午晚)精彩北越5日-星宇.pdf", drive)?.id, "vietnamStd0001");
  // 快閃與精彩是不同等級、賞楓與滑雪是不同行程：名稱再像也不建議。
  assert.equal(suggestDriveFile("1. 快閃北越6日-越捷-台北出發.pdf", drive), null);
  assert.equal(suggestDriveFile("(TR)首爾「賞楓」五日-AQUAFIELD高陽汗蒸幕.pdf", drive), null);
  assert.equal(suggestDriveFile("東京河口湖溫泉螃蟹五日.pdf", drive), null);
});

test("finds a re-uploaded file with the same name in the same folder", () => {
  const previous = { driveName: "「釜慶邱」釜山五日.pdf", drivePath: "11.韓國 > 2.釜山" };
  assert.equal(findReplacement(previous, files)?.id, "busanTR0000001");
  assert.equal(findReplacement({ ...previous, drivePath: "11.韓國 > 9.別的" }, files), null);
});

test("recognises draft folders and upload times from storage keys", () => {
  assert.equal(isDraftPath("01.國  旅 > 4高雄出發 > 1日 > 待修中 > 封面&DM"), true);
  assert.equal(isDraftPath("11.韓國 > 2.釜山"), false);
  assert.equal(uploadedAtFromKey("trip-pdfs/1787791025337-37e1657f-5b3c-436b-89fe-d9c651eb6044.pdf"), 1787791025337);
  assert.equal(uploadedAtFromKey("elsewhere.pdf"), 0);
});

const oldUrl = "/api/trip-pdf?key=trip-pdfs%2F1787791025337-37e1657f-5b3c-436b-89fe-d9c651eb6044.pdf";
const newKey = "trip-pdfs/1795000000000-0f8fad5b-d9cb-469f-a165-70867728950e.pdf";
const content = {
  trips: [
    { id: "busan", plans: [{ id: "p1", documentType: "pdf", documentUrl: oldUrl }, { id: "p2", documentType: "pdf", documentUrl: oldUrl }] },
    { id: "other", plans: [{ id: "p1", documentType: "pdf", documentUrl: oldUrl }] },
  ],
};
const entry = (overrides = {}) => ({
  baseUrl: oldUrl,
  driveId: "busanTR0000001",
  driveName: "「釜慶邱」釜山五日.pdf",
  drivePath: "11.韓國 > 2.釜山",
  linkedBy: "auto",
  driveVersion: "2026-11-27T09:01:53.000Z",
  pdfKey: newKey,
  ...overrides,
});

test("shows the newer Drive PDF to visitors only for the plan it was synced for", () => {
  const state = { syncedAt: "2026-11-27T10:00:00.000Z", plans: { [drivePlanKey("busan", "p1")]: entry() } };
  const result = applyDrivePdfs(content, state, {});
  assert.equal(result.trips[0].plans[0].documentUrl, `/api/trip-pdf?key=${encodeURIComponent(newKey)}`);
  // 同一個行程的另一個方案、別的行程裡同名的方案 ID，都不受影響。
  assert.equal(result.trips[0].plans[1].documentUrl, oldUrl);
  assert.equal(result.trips[1], content.trips[1]);
});

test("stops overriding once staff upload another PDF or turn syncing off", () => {
  const key = drivePlanKey("busan", "p1");
  const replacedByStaff = { syncedAt: "x", plans: { [key]: entry({ baseUrl: "/api/trip-pdf?key=trip-pdfs%2Fsomething-else.pdf" }) } };
  assert.equal(applyDrivePdfs(content, replacedByStaff, {}), content);
  const state = { syncedAt: "x", plans: { [key]: entry() } };
  assert.equal(applyDrivePdfs(content, state, { [key]: "none" }), content);
  assert.equal(applyDrivePdfs(content, null, {}), content);
  // 原本的 PDF 就是最新的（沒有下載新檔）時也不換。
  assert.equal(applyDrivePdfs(content, { syncedAt: "x", plans: { [key]: entry({ pdfKey: "" }) } }, {}), content);
});

test("summarises each plan's state for the studio", () => {
  const key = drivePlanKey("busan", "p1");
  const plan1 = content.trips[0].plans[0];
  assert.equal(drivePlanStatus("busan", plan1, null, {}), "unchecked");
  assert.equal(drivePlanStatus("busan", plan1, { syncedAt: "x", plans: { [key]: entry() } }, {}), "replaced");
  assert.equal(drivePlanStatus("busan", plan1, { syncedAt: "x", plans: { [key]: entry({ pdfKey: "" }) } }, {}), "current");
  assert.equal(drivePlanStatus("busan", plan1, { syncedAt: "x", plans: { [key]: entry({ problem: "missing" }) } }, {}), "missing");
  assert.equal(drivePlanStatus("busan", plan1, { syncedAt: "x", plans: { [key]: entry({ baseUrl: "elsewhere" }) } }, {}), "changed-on-site");
  assert.equal(drivePlanStatus("busan", plan1, null, { [key]: "none" }), "off");
});
