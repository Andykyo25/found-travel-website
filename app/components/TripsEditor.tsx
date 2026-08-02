"use client";

import { useState } from "react";
import type {
  SiteContent,
  Trip,
  TripDeparture,
  TripDocumentType,
} from "@/lib/site-content";
import { parseDepartureDate } from "@/lib/trip-filters";
import { Field, StudioSaveBar, useSiteContentDraft } from "./StudioDraft";

type TripFilter = "all" | "featured" | "other" | "todo";

const filterOptions: Array<{ id: TripFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "featured", label: "精選" },
  { id: "other", label: "其他" },
  { id: "todo", label: "待補資料" },
];

function createTrip(): Trip {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `trip-${Date.now()}`,
    featured: true,
    badge: "精選行程",
    region: "DESTINATION",
    days: "5日",
    title: "新行程",
    summary: "請填寫這趟旅程最吸引人的特色與適合對象。",
    price: "價格請洽詢",
    image: "/trips/tokyo.jpg",
    documentType: "pdf",
    documentUrl: "",
    documentName: "查看完整行程",
    departures: [],
  };
}

function createDeparture(): TripDeparture {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `departure-${Date.now()}`,
    date: "",
    price: "",
  };
}

function formatDepartureDate(value: string) {
  const digits = value.trim();
  if (!/^\d{6,8}$/.test(digits)) return value;

  const year = digits.slice(0, 4);
  const rest = digits.slice(4);
  let month = "";
  let day = "";
  if (rest.length === 4) {
    month = rest.slice(0, 2);
    day = rest.slice(2);
  } else if (rest.length === 2) {
    month = rest.slice(0, 1);
    day = rest.slice(1);
  } else {
    const twoDigitMonth = Number(rest.slice(0, 2));
    if (twoDigitMonth >= 1 && twoDigitMonth <= 12) {
      month = rest.slice(0, 2);
      day = rest.slice(2);
    } else {
      month = rest.slice(0, 1);
      day = rest.slice(1);
    }
  }

  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) {
    return value;
  }

  return `${year}/${String(monthNumber).padStart(2, "0")}/${String(
    dayNumber,
  ).padStart(2, "0")}`;
}

function formatDeparturePrice(value: string) {
  const trimmed = value.trim();
  if (!/^[0-9,]+$/.test(trimmed)) return value;
  const digits = trimmed.replace(/,/g, "");
  if (!digits) return value;
  return Number(digits).toLocaleString("en-US");
}

// 讓業務不用逐一展開就看得出哪幾團還沒補齊。
// todayTime 由伺服端算好傳進來，避免前後端各自取當天日期造成 hydration 不一致。
function tripIssues(trip: Trip, todayTime: number) {
  const issues: string[] = [];
  if (!trip.documentUrl) issues.push("缺行程資料");

  if (trip.departures.length === 0) {
    issues.push("缺團期");
  } else {
    const hasUpcoming = trip.departures.some((departure) => {
      const parsed = parseDepartureDate(departure.date);
      // 日期打成自由文字時無法判斷，一律當作還有效。
      return !parsed || parsed.time >= todayTime;
    });
    if (!hasUpcoming) issues.push("團期已過");
  }

  return issues;
}

export function TripsEditor({
  initialContent,
  initialUpdatedAt,
  todayTime,
}: {
  initialContent: SiteContent;
  initialUpdatedAt: string | null;
  todayTime: number;
}) {
  const { draft, setDraft, status, setStatus, markChanged, save } =
    useSiteContentDraft(initialContent, initialUpdatedAt);

  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<TripFilter>("all");
  const [uploadingTripId, setUploadingTripId] = useState<string | null>(null);
  const [openTripIds, setOpenTripIds] = useState<Set<string>>(
    () =>
      new Set(
        initialContent.trips.length <= 4
          ? initialContent.trips.map((trip) => trip.id)
          : [],
      ),
  );

  const toggleTripOpen = (id: string) => {
    setOpenTripIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFeatured = (index: number) => {
    setDraft((current) => ({
      ...current,
      trips: current.trips.map((trip, tripIndex) =>
        tripIndex === index ? { ...trip, featured: !trip.featured } : trip,
      ),
    }));
    markChanged();
  };

  const updateTrip = <K extends keyof Trip>(
    index: number,
    key: K,
    value: Trip[K],
  ) => {
    setDraft((current) => ({
      ...current,
      trips: current.trips.map((trip, tripIndex) =>
        tripIndex === index ? { ...trip, [key]: value } : trip,
      ),
    }));
    markChanged();
  };

  const changeDocumentType = (
    index: number,
    documentType: TripDocumentType,
  ) => {
    setDraft((current) => ({
      ...current,
      trips: current.trips.map((trip, tripIndex) =>
        tripIndex === index
          ? {
              ...trip,
              documentType,
              documentUrl: "",
              documentName: "查看完整行程",
            }
          : trip,
      ),
    }));
    markChanged();
  };

  const addTrip = () => {
    const trip = createTrip();
    setDraft((current) => ({ ...current, trips: [...current.trips, trip] }));
    setOpenTripIds((current) => new Set(current).add(trip.id));
    setKeyword("");
    setFilter("all");
    setStatus({
      kind: "idle",
      message: "已新增空白行程，填寫完成後請記得儲存",
    });
  };

  const removeTrip = (index: number) => {
    const trip = draft.trips[index];
    if (!trip || !window.confirm(`確定刪除「${trip.title}」嗎？`)) return;
    setDraft((current) => ({
      ...current,
      trips: current.trips.filter((_, tripIndex) => tripIndex !== index),
    }));
    setStatus({ kind: "idle", message: "行程已移除，請儲存以更新網站" });
  };

  const moveTrip = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= draft.trips.length) return;
    setDraft((current) => {
      const trips = [...current.trips];
      [trips[index], trips[target]] = [trips[target], trips[index]];
      return { ...current, trips };
    });
    markChanged();
  };

  const updateTripDepartures = (
    tripIndex: number,
    updater: (departures: TripDeparture[]) => TripDeparture[],
  ) => {
    setDraft((current) => ({
      ...current,
      trips: current.trips.map((trip, index) =>
        index === tripIndex
          ? { ...trip, departures: updater(trip.departures) }
          : trip,
      ),
    }));
    markChanged();
  };

  const addDeparture = (tripIndex: number) => {
    updateTripDepartures(tripIndex, (departures) => [
      ...departures,
      createDeparture(),
    ]);
  };

  const updateDeparture = <K extends keyof TripDeparture>(
    tripIndex: number,
    departureIndex: number,
    key: K,
    value: TripDeparture[K],
  ) => {
    updateTripDepartures(tripIndex, (departures) =>
      departures.map((departure, index) =>
        index === departureIndex ? { ...departure, [key]: value } : departure,
      ),
    );
  };

  const removeDeparture = (tripIndex: number, departureIndex: number) => {
    updateTripDepartures(tripIndex, (departures) =>
      departures.filter((_, index) => index !== departureIndex),
    );
  };

  const moveDeparture = (
    tripIndex: number,
    departureIndex: number,
    offset: -1 | 1,
  ) => {
    updateTripDepartures(tripIndex, (departures) => {
      const target = departureIndex + offset;
      if (target < 0 || target >= departures.length) return departures;
      const next = [...departures];
      [next[departureIndex], next[target]] = [
        next[target],
        next[departureIndex],
      ];
      return next;
    });
  };

  const uploadPdf = async (index: number, file: File) => {
    const trip = draft.trips[index];
    if (!trip) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ kind: "error", message: "請選擇 PDF 檔案" });
      return;
    }

    setUploadingTripId(trip.id);
    setStatus({ kind: "saving", message: `正在上傳 ${file.name}…` });

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/studio/pdf", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as {
        url?: string;
        filename?: string;
        error?: string;
      };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "PDF 上傳失敗");
      }

      setDraft((current) => ({
        ...current,
        trips: current.trips.map((item, tripIndex) =>
          tripIndex === index
            ? {
                ...item,
                documentType: "pdf",
                documentUrl: result.url ?? "",
                documentName: result.filename ?? file.name,
              }
            : item,
        ),
      }));
      setStatus({
        kind: "success",
        message: "PDF 已上傳，請再按「儲存並更新網站」完成發布",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "PDF 上傳失敗",
      });
    } finally {
      setUploadingTripId(null);
    }
  };

  const needle = keyword.trim().toLowerCase();
  // 保留原始索引，所有增刪與排序操作都以完整陣列為準。
  const visibleTrips = draft.trips
    .map((trip, index) => ({ trip, index, issues: tripIssues(trip, todayTime) }))
    .filter(({ trip, issues }) => {
      if (filter === "featured" && !trip.featured) return false;
      if (filter === "other" && trip.featured) return false;
      if (filter === "todo" && issues.length === 0) return false;
      if (!needle) return true;
      return [trip.title, trip.region, trip.badge, trip.days, trip.price]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

  const featuredCount = draft.trips.filter((trip) => trip.featured).length;
  const todoCount = draft.trips.filter(
    (trip) => tripIssues(trip, todayTime).length > 0,
  ).length;
  const filtering = needle !== "" || filter !== "all";
  const allVisibleOpen =
    visibleTrips.length > 0 &&
    visibleTrips.every(({ trip }) => openTripIds.has(trip.id));

  const setAllVisibleOpen = (open: boolean) => {
    setOpenTripIds((current) => {
      const next = new Set(current);
      for (const { trip } of visibleTrips) {
        if (open) next.add(trip.id);
        else next.delete(trip.id);
      }
      return next;
    });
  };

  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <section className="studio-section studio-guide">
        <h2>業務上架流程</h2>
        <div className="studio-guide-grid">
          <span>
            <b>1</b> 新增行程
          </span>
          <span>
            <b>2</b> 上傳行程 PDF／Drive 並填出發日期
          </span>
          <span>
            <b>3</b> 儲存並更新網站
          </span>
        </div>
      </section>

      <section className="studio-section">
        <div className="studio-section-heading">
          <div>
            <h2>行程管理</h2>
            <p>
              共 {draft.trips.length} 筆 ・ 精選 {featuredCount} ・ 其他{" "}
              {draft.trips.length - featuredCount}
              {todoCount > 0 ? ` ・ 待補資料 ${todoCount}` : ""}
              。首頁行程區會把「精選」排在前面，「其他」接在後面；一次先顯示 6
              筆，其餘收在「看更多行程」。
            </p>
          </div>
          <div className="studio-heading-actions">
            <button
              className="button button-small"
              type="button"
              onClick={addTrip}
            >
              ＋ 新增行程
            </button>
          </div>
        </div>

        {draft.trips.length > 0 ? (
          <div className="trip-toolbar">
            <input
              className="trip-search"
              type="search"
              placeholder="搜尋行程名稱、地區或分類"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              aria-label="搜尋行程"
            />
            <div className="trip-filter-pills" role="group" aria-label="行程篩選">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`trip-filter-pill${
                    filter === option.id ? " active" : ""
                  }`}
                  aria-pressed={filter === option.id}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label}
                  {option.id === "todo" && todoCount > 0 ? (
                    <small>{todoCount}</small>
                  ) : null}
                </button>
              ))}
            </div>
            {visibleTrips.length > 1 ? (
              <button
                className="button button-secondary button-small"
                type="button"
                onClick={() => setAllVisibleOpen(!allVisibleOpen)}
              >
                {allVisibleOpen ? "全部收合" : "全部展開"}
              </button>
            ) : null}
          </div>
        ) : null}

        {draft.trips.length === 0 ? (
          <div className="empty-trips">尚未建立行程，請按「新增行程」開始。</div>
        ) : null}

        {draft.trips.length > 0 && visibleTrips.length === 0 ? (
          <div className="empty-trips">
            沒有符合條件的行程。
            <button
              className="link-button"
              type="button"
              onClick={() => {
                setKeyword("");
                setFilter("all");
              }}
            >
              清除篩選
            </button>
          </div>
        ) : null}

        {filtering && visibleTrips.length > 0 ? (
          <p className="trip-filter-note">
            篩選中顯示 {visibleTrips.length} / {draft.trips.length}{" "}
            筆。上下移動排序已暫停，請先清除篩選再調整順序。
          </p>
        ) : null}

        <div className="studio-trip-list">
          {visibleTrips.map(({ trip, index, issues }) => (
            <div
              className={`studio-trip${openTripIds.has(trip.id) ? " open" : ""}`}
              key={trip.id}
            >
              <div className="studio-trip-bar">
                <button
                  type="button"
                  className="studio-trip-toggle"
                  onClick={() => toggleTripOpen(trip.id)}
                  aria-expanded={openTripIds.has(trip.id)}
                >
                  <span className="studio-trip-chevron" aria-hidden="true">
                    {openTripIds.has(trip.id) ? "▾" : "▸"}
                  </span>
                  <span className="studio-trip-index">行程 {index + 1}</span>
                  <span className="studio-trip-name">{trip.title}</span>
                  {!trip.featured ? (
                    <span className="studio-trip-tag">其他</span>
                  ) : null}
                  {issues.map((issue) => (
                    <span className="studio-trip-issue" key={issue}>
                      {issue}
                    </span>
                  ))}
                </button>
                <div className="studio-trip-controls">
                  <button
                    type="button"
                    className={`featured-toggle${trip.featured ? " on" : ""}`}
                    onClick={() => toggleFeatured(index)}
                    aria-pressed={trip.featured}
                    title={
                      trip.featured
                        ? "目前為精選，點擊改為其他"
                        : "目前為其他，點擊改為精選"
                    }
                  >
                    {trip.featured ? "★ 精選" : "☆ 其他"}
                  </button>
                  <div className="trip-editor-actions">
                    <button
                      type="button"
                      onClick={() => moveTrip(index, -1)}
                      disabled={filtering || index === 0}
                      title={filtering ? "篩選中無法調整順序" : undefined}
                      aria-label={`將${trip.title}往前移`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTrip(index, 1)}
                      disabled={filtering || index === draft.trips.length - 1}
                      title={filtering ? "篩選中無法調整順序" : undefined}
                      aria-label={`將${trip.title}往後移`}
                    >
                      ↓
                    </button>
                    <button
                      className="danger"
                      type="button"
                      onClick={() => removeTrip(index)}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>

              {openTripIds.has(trip.id) ? (
                <div className="studio-trip-body">
                  <div className="field-grid">
                    <Field label="行程名稱">
                      <input
                        required
                        value={trip.title}
                        onChange={(event) =>
                          updateTrip(index, "title", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="天數">
                      <input
                        required
                        value={trip.days}
                        onChange={(event) =>
                          updateTrip(index, "days", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="分類標籤">
                      <input
                        required
                        value={trip.badge}
                        onChange={(event) =>
                          updateTrip(index, "badge", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="地區小字">
                      <input
                        required
                        value={trip.region}
                        onChange={(event) =>
                          updateTrip(index, "region", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="起始價格">
                      <input
                        required
                        value={trip.price}
                        onChange={(event) =>
                          updateTrip(index, "price", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="封面圖片網址或網站路徑">
                      <input
                        required
                        value={trip.image}
                        onChange={(event) =>
                          updateTrip(index, "image", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="行程簡介" wide>
                      <textarea
                        required
                        value={trip.summary}
                        onChange={(event) =>
                          updateTrip(index, "summary", event.target.value)
                        }
                      />
                    </Field>
                  </div>

                  <div className="document-editor">
                    <h4>完整行程資料</h4>
                    <div
                      className="document-type-switch"
                      role="group"
                      aria-label="行程資料來源"
                    >
                      <button
                        type="button"
                        className={trip.documentType === "pdf" ? "active" : ""}
                        onClick={() => changeDocumentType(index, "pdf")}
                      >
                        上傳 PDF
                      </button>
                      <button
                        type="button"
                        className={trip.documentType === "drive" ? "active" : ""}
                        onClick={() => changeDocumentType(index, "drive")}
                      >
                        Google Drive 網址
                      </button>
                    </div>

                    {trip.documentType === "pdf" ? (
                      <div className="pdf-upload">
                        <label className="file-picker">
                          <span>
                            {uploadingTripId === trip.id
                              ? "正在上傳…"
                              : trip.documentUrl
                                ? `已上傳：${trip.documentName}`
                                : "選擇 PDF 檔案"}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            disabled={uploadingTripId === trip.id}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void uploadPdf(index, file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <small>
                          單一檔案上限 25 MB；上傳完成後請按最下方儲存按鈕。
                        </small>
                      </div>
                    ) : (
                      <div className="field-grid">
                        <Field
                          label="Google Drive 分享網址"
                          hint="請先把檔案權限設為「知道連結的任何人都可查看」"
                          wide
                        >
                          <input
                            type="url"
                            placeholder="https://drive.google.com/..."
                            value={trip.documentUrl}
                            onChange={(event) =>
                              updateTrip(
                                index,
                                "documentUrl",
                                event.target.value,
                              )
                            }
                          />
                        </Field>
                      </div>
                    )}
                  </div>

                  <div className="departure-editor">
                    <div className="departure-editor-heading">
                      <div>
                        <h4>出發日期表</h4>
                        <small>
                          顯示於前台「查看出發時間」頁與「出發團期總表」，沒有日期時前台不顯示該按鈕。日期輸入
                          20260402 會自動轉成 2026/04/02，價格輸入 26800
                          會自動加上逗號；未填日期的列儲存時會略過。
                        </small>
                      </div>
                      <button
                        className="button button-secondary button-small"
                        type="button"
                        onClick={() => addDeparture(index)}
                      >
                        ＋ 新增日期
                      </button>
                    </div>

                    {trip.departures.length > 0 ? (
                      <div className="departure-rows">
                        <div
                          className="departure-row departure-row-head"
                          aria-hidden="true"
                        >
                          <span>出發日期</span>
                          <span>價格</span>
                          <span />
                        </div>
                        {trip.departures.map((departure, departureIndex) => (
                          <div className="departure-row" key={departure.id}>
                            <input
                              aria-label="出發日期"
                              placeholder="2026/09/09"
                              value={departure.date}
                              onChange={(event) =>
                                updateDeparture(
                                  index,
                                  departureIndex,
                                  "date",
                                  event.target.value,
                                )
                              }
                              onBlur={(event) => {
                                const formatted = formatDepartureDate(
                                  event.target.value,
                                );
                                if (formatted !== event.target.value) {
                                  updateDeparture(
                                    index,
                                    departureIndex,
                                    "date",
                                    formatted,
                                  );
                                }
                              }}
                            />
                            <input
                              aria-label="價格"
                              placeholder="26,900"
                              value={departure.price}
                              onChange={(event) =>
                                updateDeparture(
                                  index,
                                  departureIndex,
                                  "price",
                                  event.target.value,
                                )
                              }
                              onBlur={(event) => {
                                const formatted = formatDeparturePrice(
                                  event.target.value,
                                );
                                if (formatted !== event.target.value) {
                                  updateDeparture(
                                    index,
                                    departureIndex,
                                    "price",
                                    formatted,
                                  );
                                }
                              }}
                            />
                            <div className="trip-editor-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  moveDeparture(index, departureIndex, -1)
                                }
                                disabled={departureIndex === 0}
                                aria-label="將日期往上移"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  moveDeparture(index, departureIndex, 1)
                                }
                                disabled={
                                  departureIndex === trip.departures.length - 1
                                }
                                aria-label="將日期往下移"
                              >
                                ↓
                              </button>
                              <button
                                className="danger"
                                type="button"
                                onClick={() =>
                                  removeDeparture(index, departureIndex)
                                }
                              >
                                刪除
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="departure-empty">尚未填寫出發日期。</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <StudioSaveBar status={status} busy={Boolean(uploadingTripId)} />
    </form>
  );
}
