"use client";

import { useState } from "react";
import type { Destination, SiteContent, Trip } from "@/lib/site-content";

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

export function StudioEditor({
  initialContent,
}: {
  initialContent: SiteContent;
}) {
  const [draft, setDraft] = useState(initialContent);
  const [status, setStatus] = useState<Status>({
    kind: "idle",
    message: "尚未有變更",
  });

  const updateRoot = <K extends keyof SiteContent>(
    key: K,
    value: SiteContent[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus({ kind: "idle", message: "有尚未儲存的變更" });
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
    setStatus({ kind: "idle", message: "有尚未儲存的變更" });
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

  return (
    <form
      className="studio-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <section className="studio-section">
        <h2>首頁主內容</h2>
        <p>修改品牌名稱、首頁標題與最上方公告。</p>
        <div className="field-grid">
          <Field label="品牌名稱">
            <input
              value={draft.brandName}
              onChange={(event) => updateRoot("brandName", event.target.value)}
            />
          </Field>
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
        </div>
      </section>

      <section className="studio-section">
        <h2>影片與即時小工具</h2>
        <p>影片可貼入一般 YouTube 網址；小工具會自動顯示選定地點的時間、天氣與匯率。</p>
        <div className="field-grid">
          <Field label="影片區標題">
            <input
              value={draft.videoTitle}
              onChange={(event) => updateRoot("videoTitle", event.target.value)}
            />
          </Field>
          <Field label="YouTube 網址" hint="例如：https://youtu.be/影片代碼">
            <input
              type="url"
              value={draft.videoUrl}
              onChange={(event) => updateRoot("videoUrl", event.target.value)}
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
        <h2>精選行程</h2>
        <p>每個欄位都可以直接修改；亮點與每日行程請一行填一項。</p>
        {draft.trips.map((trip, index) => (
          <div className="studio-trip" key={trip.id}>
            <h3>
              行程 {index + 1}・{trip.title}
            </h3>
            <div className="field-grid">
              <Field label="行程名稱">
                <input
                  value={trip.title}
                  onChange={(event) =>
                    updateTrip(index, "title", event.target.value)
                  }
                />
              </Field>
              <Field label="天數">
                <input
                  value={trip.days}
                  onChange={(event) =>
                    updateTrip(index, "days", event.target.value)
                  }
                />
              </Field>
              <Field label="分類標籤">
                <input
                  value={trip.badge}
                  onChange={(event) =>
                    updateTrip(index, "badge", event.target.value)
                  }
                />
              </Field>
              <Field label="地區小字">
                <input
                  value={trip.region}
                  onChange={(event) =>
                    updateTrip(index, "region", event.target.value)
                  }
                />
              </Field>
              <Field label="起始價格">
                <input
                  value={trip.price}
                  onChange={(event) =>
                    updateTrip(index, "price", event.target.value)
                  }
                />
              </Field>
              <Field label="圖片網址或網站路徑">
                <input
                  value={trip.image}
                  onChange={(event) =>
                    updateTrip(index, "image", event.target.value)
                  }
                />
              </Field>
              <Field label="行程簡介" wide>
                <textarea
                  value={trip.summary}
                  onChange={(event) =>
                    updateTrip(index, "summary", event.target.value)
                  }
                />
              </Field>
              <Field label="行程亮點" hint="每行一項" wide>
                <textarea
                  value={trip.highlights}
                  onChange={(event) =>
                    updateTrip(index, "highlights", event.target.value)
                  }
                />
              </Field>
              <Field label="每日行程" hint="每行一天" wide>
                <textarea
                  value={trip.itinerary}
                  onChange={(event) =>
                    updateTrip(index, "itinerary", event.target.value)
                  }
                />
              </Field>
            </div>
          </div>
        ))}
      </section>

      <section className="studio-section">
        <h2>聯絡資訊</h2>
        <p>請把示範資料換成團隊實際使用的信箱、電話與 LINE 網址。</p>
        <div className="field-grid">
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
          <Field label="聯絡信箱">
            <input
              type="email"
              value={draft.contactEmail}
              onChange={(event) =>
                updateRoot("contactEmail", event.target.value)
              }
            />
          </Field>
          <Field label="聯絡電話">
            <input
              value={draft.contactPhone}
              onChange={(event) =>
                updateRoot("contactPhone", event.target.value)
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
          disabled={status.kind === "saving"}
        >
          {status.kind === "saving" ? "儲存中…" : "儲存並更新網站"}
        </button>
      </div>
    </form>
  );
}
