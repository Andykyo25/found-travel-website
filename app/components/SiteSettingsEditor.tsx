"use client";

import type { Destination, SiteContent } from "@/lib/site-content";
import { Field, StudioSaveBar, useSiteContentDraft } from "./StudioDraft";

const destinationPresets: Array<{ label: string; value: Destination }> = [
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

export function SiteSettingsEditor({
  initialContent,
  initialUpdatedAt,
}: {
  initialContent: SiteContent;
  initialUpdatedAt: string | null;
}) {
  const { draft, status, updateRoot, save } = useSiteContentDraft(
    initialContent,
    initialUpdatedAt,
  );

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
          <Field
            label="首頁大圖網址或網站路徑"
            hint="顯示在首頁最上方的滿版背景照。留空會自動使用第一個行程的封面圖。建議用寬幅橫圖（如 1920×1080）。"
            wide
          >
            <input
              placeholder="留空 = 自動使用第一個行程的封面圖"
              value={draft.heroImage}
              onChange={(event) => updateRoot("heroImage", event.target.value)}
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

      <StudioSaveBar status={status} />
    </form>
  );
}
