"use client";

import { useState } from "react";
import type {
  Destination,
  SiteContent,
  Trip,
  TripDocumentType,
} from "@/lib/site-content";

type Status =
  | { kind: "idle"; message: string }
  | { kind: "saving"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const destinationPresets: Array<{
  label: string;
  value: Destination;
}> = [
  {
    label: "東京・日圓",
    value: {
      city: "東京",
      timezone: "Asia/Tokyo",
      currency: "JPY",
      latitude: 35.6762,
      longitude: 139.6503,
    },
  },
  {
    label: "札幌・日圓",
    value: {
      city: "札幌",
      timezone: "Asia/Tokyo",
      currency: "JPY",
      latitude: 43.0618,
      longitude: 141.3545,
    },
  },
  {
    label: "峇里島・印尼盾",
    value: {
      city: "峇里島",
      timezone: "Asia/Makassar",
      currency: "IDR",
      latitude: -8.4095,
      longitude: 115.1889,
    },
  },
  {
    label: "首爾・韓元",
    value: {
      city: "首爾",
      timezone: "Asia/Seoul",
      currency: "KRW",
      latitude: 37.5665,
      longitude: 126.978,
    },
  },
  {
    label: "巴黎・歐元",
    value: {
      city: "巴黎",
      timezone: "Europe/Paris",
      currency: "EUR",
      latitude: 48.8566,
      longitude: 2.3522,
    },
  },
];

function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field${wide ? " field-wide" : ""}`}>
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
      {children}
    </label>
  );
}

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
  };
}

export function StudioEditor({
  initialContent,
}: {
  initialContent: SiteContent;
}) {
  const [draft, setDraft] = useState(initialContent);
  const [uploadingTripId, setUploadingTripId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({
    kind: "idle",
    message: "尚未有變更",
  });
  const [openTripIds, setOpenTripIds] = useState<Set<string>>(
    () =>
      new Set(
        initialContent.trips.length <= 4
          ? initialContent.trips.map((trip) => trip.id)
          : [],
      ),
  );

  const markChanged = () => {
    setStatus({ kind: "idle", message: "有尚未儲存的變更" });
  };

  const toggleTripOpen = (id: string) => {
    setOpenTripIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setAllTripsOpen = (open: boolean) => {
    setOpenTripIds(
      open ? new Set(draft.trips.map((trip) => trip.id)) : new Set(),
    );
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

  const updateRoot = <K extends keyof SiteContent>(
    key: K,
    value: SiteContent[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
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
          ? { ...trip, documentType, documentUrl: "", documentName: "查看完整行程" }
          : trip,
      ),
    }));
    markChanged();
  };

  const addTrip = () => {
    const trip = createTrip();
    setDraft((current) => ({
      ...current,
      trips: [...current.trips, trip],
    }));
    setOpenTripIds((current) => {
      const next = new Set(current);
      next.add(trip.id);
      return next;
    });
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

  const save = async () => {
    setStatus({ kind: "saving", message: "儲存中…" });
    try {
      const response = await fetch("/api/studio/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as {
        content?: SiteContent;
        error?: string;
      };

      if (!response.ok || !result.content) {
        throw new Error(result.error ?? "儲存失敗");
      }

      setDraft(result.content);
      setStatus({
        kind: "success",
        message: "已儲存，重新整理網站即可看到最新內容",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "儲存失敗",
      });
    }
  };

  const destinationValue = Math.max(
    0,
    destinationPresets.findIndex(
      ({ value }) =>
        value.city === draft.destination.city &&
        value.currency === draft.destination.currency,
    ),
  );

  const featuredCount = draft.trips.filter((trip) => trip.featured).length;
  const allTripsOpen =
    draft.trips.length > 0 &&
    draft.trips.every((trip) => openTripIds.has(trip.id));

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
          <span><b>1</b> 新增行程</span>
          <span><b>2</b> 上傳 PDF 或貼上 Google Drive 連結</span>
          <span><b>3</b> 儲存並更新網站</span>
        </div>
      </section>

      <section className="studio-section">
        <h2>首頁主內容</h2>
        <p>商標與首頁影片已固定使用公司提供的正式素材。</p>
        <div className="field-grid">
          <Field label="公告文字">
            <input
              value={draft.announcement}
              onChange={(event) =>
                updateRoot("announcement", event.target.value)
              }
            />
          </Field>
          <Field label="主標上方小字">
            <input
              value={draft.heroKicker}
              onChange={(event) => updateRoot("heroKicker", event.target.value)}
            />
          </Field>
          <Field label="首頁主標" wide>
            <textarea
              value={draft.heroTitle}
              onChange={(event) => updateRoot("heroTitle", event.target.value)}
            />
          </Field>
          <Field label="首頁介紹" wide>
            <textarea
              value={draft.heroText}
              onChange={(event) => updateRoot("heroText", event.target.value)}
            />
          </Field>
          <Field label="影片區標題" wide>
            <input
              value={draft.videoTitle}
              onChange={(event) => updateRoot("videoTitle", event.target.value)}
            />
          </Field>
          <Field label="小工具顯示地點" wide>
            <select
              value={String(destinationValue)}
              onChange={(event) => {
                const preset =
                  destinationPresets[Number(event.target.value)] ??
                  destinationPresets[0];
                updateRoot("destination", preset.value);
              }}
            >
              {destinationPresets.map((preset, index) => (
                <option value={String(index)} key={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="studio-section">
        <div className="studio-section-heading">
          <div>
            <h2>行程管理</h2>
            <p>
              共 {draft.trips.length} 筆 ・ 精選 {featuredCount} ・ 其他{" "}
              {draft.trips.length - featuredCount}
              。「精選」顯示在首頁上方大卡片，「其他」收在首頁「更多行程」。
            </p>
          </div>
          <div className="studio-heading-actions">
            {draft.trips.length > 1 ? (
              <button
                className="button button-secondary button-small"
                type="button"
                onClick={() => setAllTripsOpen(!allTripsOpen)}
              >
                {allTripsOpen ? "全部收合" : "全部展開"}
              </button>
            ) : null}
            <button
              className="button button-small"
              type="button"
              onClick={addTrip}
            >
              ＋ 新增行程
            </button>
          </div>
        </div>

        {draft.trips.length === 0 ? (
          <div className="empty-trips">
            尚未建立行程，請按「新增行程」開始。
          </div>
        ) : null}

        <div className="studio-trip-list">
          {draft.trips.map((trip, index) => (
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
                      disabled={index === 0}
                      aria-label={`將${trip.title}往前移`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTrip(index, 1)}
                      disabled={index === draft.trips.length - 1}
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
              <div className="document-type-switch" role="group" aria-label="行程資料來源">
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
                  <small>單一檔案上限 25 MB；上傳完成後請按最下方儲存按鈕。</small>
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
                        updateTrip(index, "documentUrl", event.target.value)
                      }
                    />
                  </Field>
                </div>
              )}

              <div className="field-grid document-label-field">
                <Field label="前端按鈕文字" wide>
                  <input
                    value={trip.documentName}
                    onChange={(event) =>
                      updateTrip(index, "documentName", event.target.value)
                    }
                  />
                </Field>
              </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="studio-section">
        <h2>公司與聯絡資訊</h2>
        <p>公司登記資料會顯示於網站頁尾；LINE 連結是主要洽詢管道。</p>
        <div className="field-grid">
          <Field label="公司名稱" wide>
            <input
              value={draft.companyName}
              onChange={(event) =>
                updateRoot("companyName", event.target.value)
              }
            />
          </Field>
          <Field label="旅行業執照">
            <input
              value={draft.businessLicense}
              onChange={(event) =>
                updateRoot("businessLicense", event.target.value)
              }
            />
          </Field>
          <Field label="品保協會編號">
            <input
              value={draft.qualityLicense}
              onChange={(event) =>
                updateRoot("qualityLicense", event.target.value)
              }
            />
          </Field>
          <Field label="統一編號">
            <input
              value={draft.taxId}
              onChange={(event) => updateRoot("taxId", event.target.value)}
            />
          </Field>
          <Field label="負責人">
            <input
              value={draft.representative}
              onChange={(event) =>
                updateRoot("representative", event.target.value)
              }
            />
          </Field>
          <Field label="公司地址" wide>
            <input
              value={draft.address}
              onChange={(event) => updateRoot("address", event.target.value)}
            />
          </Field>
          <Field label="聯絡區標題" wide>
            <input
              value={draft.contactTitle}
              onChange={(event) =>
                updateRoot("contactTitle", event.target.value)
              }
            />
          </Field>
          <Field label="聯絡區說明" wide>
            <textarea
              value={draft.contactText}
              onChange={(event) =>
                updateRoot("contactText", event.target.value)
              }
            />
          </Field>
          <Field label="LINE 網址" wide>
            <input
              type="url"
              value={draft.lineUrl}
              onChange={(event) => updateRoot("lineUrl", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="studio-actions">
        <span className={`studio-status ${status.kind}`}>
          {status.message}
        </span>
        <button
          className="button"
          type="submit"
          disabled={status.kind === "saving" || Boolean(uploadingTripId)}
        >
          {status.kind === "saving" ? "處理中…" : "儲存並更新網站"}
        </button>
      </div>
    </form>
  );
}
