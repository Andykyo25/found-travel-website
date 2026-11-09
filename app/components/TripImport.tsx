"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  importListFileName,
  matchImportFiles,
  parseImportList,
  pathInsideSelectedFolder,
  tripWithDocuments,
  type ImportMatch,
} from "@/lib/trip-import";

type Phase = "pick" | "ready" | "running" | "done" | "error";

const uploadConcurrency = 2;
// 每傳完這麼多個行程的 PDF 就先存一次：中途斷線時，已完成的行程已經在網站上。
const tripsPerSave = 25;
const cacheKey = "found-trip-import-uploads";

function readUploadCache(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(cacheKey) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeUploadCache(value: Record<string, string>) {
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(value));
  } catch {
    // 無痕模式等情況存不了，只是中斷後要重傳，不影響匯入。
  }
}

const fileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;
const megabytes = (bytes: number) => `${Math.round(bytes / 1024 / 1024).toLocaleString("en-US")} MB`;

async function uploadPdf(file: File) {
  let lastError = "PDF 上傳失敗";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/studio/pdf", { method: "POST", body: data });
      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (response.ok && result.url) return result.url;
      lastError = result.error ?? lastError;
      if (response.status === 401 || response.status === 413 || response.status === 415) break;
    } catch {
      lastError = "網路連線中斷，PDF 上傳失敗";
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  throw new Error(`「${file.name}」${lastError}`);
}

export function TripImport({ existingTripIds }: { existingTripIds: string[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [message, setMessage] = useState("");
  const [match, setMatch] = useState<ImportMatch<File> | null>(null);
  const [progress, setProgress] = useState({ files: 0, totalFiles: 0, trips: 0 });
  const [result, setResult] = useState<{ added: number; alreadyThere: number } | null>(null);
  // 這次匯入已經存好的行程（中斷後重按「開始匯入」時略過）。
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const existing = useMemo(() => new Set([...existingTripIds, ...importedIds]), [existingTripIds, importedIds]);

  // React 的型別沒有 webkitdirectory，直接設在元素上（Chrome、Edge、Safari、Firefox 都支援選資料夾）。
  useEffect(() => {
    inputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const pending = match ? match.trips.filter(({ trip }) => !existing.has(trip.id)) : [];
  const pendingFiles = pending.flatMap(({ files }) => [...files.values()]);
  const pendingBytes = pendingFiles.reduce((total, file) => total + file.size, 0);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];
    setResult(null);
    setMatch(null);
    if (picked.length === 0) return;
    const files = new Map<string, File>();
    for (const file of picked) files.set(pathInsideSelectedFolder(file.webkitRelativePath || file.name), file);
    const listFile = files.get(importListFileName);
    if (!listFile) {
      setPhase("error");
      setMessage(`這個資料夾裡找不到「${importListFileName}」，請選擇放行程的那一層資料夾。`);
      return;
    }
    let parsed: ReturnType<typeof parseImportList>;
    try {
      parsed = parseImportList(JSON.parse(await listFile.text()));
    } catch {
      parsed = { error: "匯入清單無法讀取，請重新產生清單" };
    }
    if ("error" in parsed) {
      setPhase("error");
      setMessage(parsed.error);
      return;
    }
    setMatch(matchImportFiles(parsed.list, files));
    setPhase("ready");
    setMessage("");
  }

  async function run() {
    if (!match || pending.length === 0) return;
    setPhase("running");
    setMessage("");
    const cache = readUploadCache();
    const urls = new Map<string, string>();
    let filesDone = 0;
    let added = 0;
    let alreadyThere = 0;
    setProgress({ files: 0, totalFiles: pendingFiles.length, trips: 0 });

    try {
      for (let start = 0; start < pending.length; start += tripsPerSave) {
        const batch = pending.slice(start, start + tripsPerSave);
        const queue = batch.flatMap(({ files }) => [...files.entries()]);
        // 同時傳兩份，避免一次塞爆網路或伺服器。
        await Promise.all(
          Array.from({ length: uploadConcurrency }, async () => {
            for (let next = queue.shift(); next; next = queue.shift()) {
              const [planId, file] = next;
              const cached = cache[fileKey(file)];
              const url = cached ?? (await uploadPdf(file));
              if (!cached) {
                cache[fileKey(file)] = url;
                writeUploadCache(cache);
              }
              urls.set(planId, url);
              filesDone += 1;
              const filesCount = filesDone;
              setProgress((current) => ({ ...current, files: filesCount }));
            }
          }),
        );

        const response = await fetch("/api/studio/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ trips: batch.map(({ trip }) => tripWithDocuments(trip, urls)) }),
        });
        const saved = (await response.json().catch(() => ({}))) as { added?: number; alreadyThere?: number; error?: string };
        if (!response.ok) throw new Error(saved.error ?? "行程儲存失敗，請稍後再按一次匯入");
        added += saved.added ?? 0;
        alreadyThere += saved.alreadyThere ?? 0;
        const tripsCount = start + batch.length;
        setProgress((current) => ({ ...current, trips: tripsCount }));
        setImportedIds((ids) => [...ids, ...batch.map(({ trip }) => trip.id)]);
      }
      writeUploadCache({});
      setResult({ added, alreadyThere });
      setPhase("done");
    } catch (error) {
      setResult({ added, alreadyThere });
      setPhase("error");
      setMessage(
        `${error instanceof Error ? error.message : "匯入中斷"}。已完成的 ${added} 個行程已經在網站上；再按一次「開始匯入」會從沒完成的地方繼續。`,
      );
    }
  }

  const running = phase === "running";
  return (
    <div className="trip-import">
      <label className="trip-import-pick">
        <span className="button button-secondary">選擇資料夾</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          disabled={running}
          onChange={choose}
          aria-label="選擇放行程 PDF 的資料夾"
        />
        <small>選資料夾時瀏覽器會詢問是否上傳資料夾內的檔案，按「上傳」即可；實際只會傳送清單裡列出的 PDF。</small>
      </label>

      {match ? (
        <div className="trip-import-summary" role="status">
          <p>
            清單裡共 <strong>{match.trips.length + match.skippedTrips.length}</strong> 個行程。
            {pending.length > 0 ? (
              <>
                這次會新增 <strong>{pending.length}</strong> 個行程、上傳 <strong>{pendingFiles.length}</strong> 份 PDF（約 {megabytes(pendingBytes)}）。
              </>
            ) : (
              " 全部都已經在網站上，不需要再匯入。"
            )}
            {match.trips.length - pending.length > 0 ? ` 已在網站上的 ${match.trips.length - pending.length} 個行程會略過。` : ""}
          </p>
          {match.missingFiles.length > 0 ? (
            <details>
              <summary>資料夾裡找不到 {match.missingFiles.length} 份 PDF，這些版本會先略過</summary>
              <ul>
                {match.missingFiles.slice(0, 50).map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <p className="trip-import-note">
            新行程會排在現有行程後面、標為「其他」，價格顯示「價格洽詢」。之後在行程管理補上團期與價格，起價會自動計算。
            匯入期間請不要關閉這個分頁。
          </p>
          <button className="button" type="button" onClick={run} disabled={running || pending.length === 0}>
            {running ? "匯入中…" : `開始匯入 ${pending.length} 個行程`}
          </button>
        </div>
      ) : null}

      {running || (phase === "error" && progress.totalFiles > 0) ? (
        <div className="trip-import-progress">
          <progress max={progress.totalFiles || 1} value={progress.files} />
          <span>
            PDF {progress.files} / {progress.totalFiles} ・ 行程 {progress.trips} / {pending.length}
          </span>
        </div>
      ) : null}

      {message ? (
        <p className={`studio-login-status ${phase === "error" ? "error" : "success"}`} role={phase === "error" ? "alert" : "status"}>
          {message}
        </p>
      ) : null}

      {phase === "done" && result ? (
        <p className="studio-login-status success" role="status">
          完成！新增了 {result.added} 個行程{result.alreadyThere ? `（${result.alreadyThere} 個原本就在網站上）` : ""}。
          <a className="studio-status-link" href="/studio"> 回行程管理 </a>
          <a className="studio-status-link" href="/find-trip" target="_blank" rel="noopener"> 查看網站 ↗</a>
        </p>
      ) : null}
    </div>
  );
}
