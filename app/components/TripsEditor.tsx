"use client";

import { useEffect, useState } from "react";
import type {
  SiteContent,
  Trip,
  TripDeparture,
  TripDocumentType,
  TripPlan,
  TripPlanDepartureMode,
} from "@/lib/site-content";
import { parseDepartureDate, formatDepartureDate, upcomingDepartures, formatPrice } from "@/lib/trip-values";
import { addDepartureBatch, type DepartureBatchRow } from "@/lib/departure-batch";
import { firstUnfinishedTrip, tripDraftProblems } from "@/lib/trip-validation";
import {
  keepSinglePlanCoveringAll,
  planAppliesToDeparture,
  planCoversAllDepartures,
  tripPlanLabel,
} from "@/lib/trip-plans";
import {
  coverThumbnail,
  formatStartPrice,
  lowestUpcomingPrice,
  priceMismatch,
  resolveTripPrice,
  tripListSummary,
} from "@/lib/trip-summary";
import {
  countExpiredDepartures,
  isExpiredDeparture,
  removeExpiredDepartures,
  sortDeparturesByDate,
} from "@/lib/departure-tools";
import { DepartureBatchEditor } from "./DepartureBatchEditor";
import { DeparturePriceTool } from "./DeparturePriceTool";
import { ContentHistoryPanel } from "./ContentHistoryPanel";
import { TripPlanCard } from "./TripPlanCard";
import { Field, StudioSaveBar, useSiteContentDraft } from "./StudioDraft";

type TripFilter = "all" | "featured" | "other" | "todo";

const filterOptions: Array<{ id: TripFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "featured", label: "精選" },
  { id: "other", label: "其他" },
  { id: "todo", label: "待補資料" },
];

function createPlan(): TripPlan {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `plan-${Date.now()}`,
    airline: "",
    title: "",
    summary: "",
    price: "",
    documentType: "pdf",
    documentUrl: "",
    documentName: "查看完整行程",
    departureMode: "selected",
    departureIds: [],
  };
}

function createTrip(): Trip {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `trip-${Date.now()}`,
    // 名稱、天數、分類、地區與封面圖都先留白（欄位內有範例提示），
    // 避免忘了修改就把預設字樣或別團的照片發布到網站。
    featured: true,
    badge: "",
    region: "",
    days: "",
    title: "",
    summary: "",
    price: "價格請洽詢",
    // 新行程的起始價格預設跟著團期最低價走，不用再手動維護。
    priceMode: "auto",
    image: "",
    // 大多數行程只有一個版本：預設就適用所有團期，版本名稱先用「標準行程」。
    plans: [{ ...createPlan(), title: "標準行程", departureMode: "all" }],
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
  if (tripDraftProblems(trip).length > 0) issues.push("資料未填完");
  if (trip.plans.length === 0) issues.push("缺航空方案");
  else if (!trip.plans.some((plan) => plan.documentUrl)) {
    issues.push("缺行程資料");
  } else if (trip.plans.some((plan) => !plan.documentUrl)) {
    issues.push("方案待補");
  }

  if (priceMismatch(trip, todayTime) !== null) issues.push("起價與團期不符");

  if (trip.departures.length === 0) {
    issues.push("缺團期");
  } else {
    const hasUpcoming = trip.departures.some((departure) => {
      const parsed = parseDepartureDate(departure.date);
      // 日期打成自由文字時無法判斷，一律當作還有效。
      return parsed !== null && parsed.time >= todayTime;
    });
    if (trip.departures.some((d) => !parseDepartureDate(d.date)))
      issues.push("日期無效");
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
  const { draft, setDraft, status, setStatus, markChanged, save, dirty } =
    useSiteContentDraft(initialContent, initialUpdatedAt);
  // 新增行程／版本後，捲動到新的區塊並聚焦第一個欄位，避免按了卻看不出有反應。
  const [revealId, setRevealId] = useState<string | null>(null);
  useEffect(() => {
    if (!revealId) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(revealId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.querySelector<HTMLInputElement>("input:not([type=file])")?.focus({ preventScroll: true });
      setRevealId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [revealId]);

  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<TripFilter>("all");
  const [uploadingPlanKey, setUploadingPlanKey] = useState<string | null>(null);
  const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null);
  const [openPlanIds, setOpenPlanIds] = useState<Set<string>>(() => new Set(initialContent.trips.flatMap(trip => trip.plans.slice(0, 1).map(plan => plan.id))));
  const setPlanOpen = (planId: string, open: boolean) => setOpenPlanIds(current => {
    if (current.has(planId) === open) return current;
    const next = new Set(current);
    if (open) next.add(planId); else next.delete(planId);
    return next;
  });
  const [openTripIds, setOpenTripIds] = useState<Set<string>>(
    () =>
      new Set(
        initialContent.trips.length <= 4
          ? initialContent.trips.map((trip) => trip.id)
          : [],
      ),
  );

  // 已過期的團期預設收合，只留還有用的；要核對或編輯時再展開。
  const [expiredShownIds, setExpiredShownIds] = useState<Set<string>>(() => new Set());
  // 剛新增或正在編輯的團期，就算日期已過也不要收起來，否則輸入到一半列就消失了。
  const [revealedDepartureIds, setRevealedDepartureIds] = useState<Set<string>>(() => new Set());
  const revealDepartures = (ids: string[]) =>
    setRevealedDepartureIds((current) => {
      if (ids.every((id) => current.has(id))) return current;
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return next;
    });
  const toggleExpiredShown = (id: string) => {
    if (expiredShownIds.has(id)) setRevealedDepartureIds(new Set());
    setExpiredShownIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const updateTripPlans = (
    tripIndex: number,
    updater: (plans: TripPlan[]) => TripPlan[],
  ) => {
    setDraft((current) => ({
      ...current,
      trips: current.trips.map((trip, index) =>
        index === tripIndex ? { ...trip, plans: updater(trip.plans) } : trip,
      ),
    }));
    markChanged();
  };

  const updatePlan = <K extends keyof TripPlan>(
    tripIndex: number,
    planIndex: number,
    key: K,
    value: TripPlan[K],
  ) => {
    updateTripPlans(tripIndex, (plans) =>
      plans.map((plan, index) =>
        index === planIndex ? { ...plan, [key]: value, ...(key === "documentUrl" ? { documentUpdatedAt: "" } : {}) } : plan,
      ),
    );
  };

  const changeDocumentType = (
    tripIndex: number,
    planIndex: number,
    documentType: TripDocumentType,
  ) => {
    updateTripPlans(tripIndex, (plans) =>
      plans.map((plan, index) =>
        index === planIndex
          ? {
              ...plan,
              documentType,
              documentUrl: "",
              documentName: "查看完整行程",
              documentUpdatedAt: "",
            }
          : plan,
      ),
    );
  };

  const addPlan = (tripIndex: number) => {
    const plan = createPlan();
    updateTripPlans(tripIndex, (plans) => [...plans, plan]);
    setPlanOpen(plan.id, true);
    setRevealId(`studio-plan-${plan.id}`);
    setStatus({
      kind: "idle",
      message: "已新增行程版本，請填寫航空公司與版本名稱",
    });
  };

  const copyPlan = (tripIndex: number, plan: TripPlan) => {
    const copy = { ...plan, ...createPlan(), airline: plan.airline, title: `${plan.title}（副本）`, summary: plan.summary, price: plan.price, flight: plan.flight, accommodation: plan.accommodation, documentType: plan.documentType };
    updateTripPlans(tripIndex, plans => [...plans, copy]);
    setPlanOpen(copy.id, true);
    setStatus({ kind: "idle", message: "已複製版本內容，請設定此版本的 PDF 與團期後儲存。" });
  };

  const addBatchToPlan = (tripId: string, planId: string, rows: DepartureBatchRow[]): string | null => {
    const trip = draft.trips.find(item => item.id === tripId);
    if (!trip) return "此行程已不存在，請重新開啟。";
    try {
      // 只有一個版本時維持「適用所有團期」，之後新增的日期才不會變成沒有版本可套用。
      const updated = keepSinglePlanCoveringAll(trip, addDepartureBatch(trip, planId, rows, () => crypto.randomUUID()));
      const known = new Set(trip.departures.map(item => item.id));
      revealDepartures(updated.departures.filter(item => !known.has(item.id)).map(item => item.id));
      setDraft(current => ({ ...current, trips: current.trips.map(item => item.id === tripId ? updated : item) }));
      markChanged();
      return null;
    } catch (error) { return error instanceof Error ? error.message : "無法新增團期，請重新檢查。"; }
  };

  const removePlan = (tripIndex: number, planIndex: number) => {
    const plan = draft.trips[tripIndex]?.plans[planIndex];
    if (
      !plan ||
      !window.confirm(
        `確定刪除「${plan.airline}｜${plan.title}」方案嗎？儲存後該方案的 PDF 將進入清理流程。`,
      )
    ) {
      return;
    }
    updateTripPlans(tripIndex, (plans) =>
      plans.filter((_, index) => index !== planIndex),
    );
  };

  const movePlan = (tripIndex: number, planIndex: number, offset: -1 | 1) => {
    updateTripPlans(tripIndex, (plans) => {
      const target = planIndex + offset;
      if (target < 0 || target >= plans.length) return plans;
      const next = [...plans];
      [next[planIndex], next[target]] = [next[target], next[planIndex]];
      return next;
    });
  };

  const changePlanDepartureMode = (
    tripIndex: number,
    planIndex: number,
    departureMode: TripPlanDepartureMode,
  ) => {
    const departureIds =
      departureMode === "selected"
        ? (draft.trips[tripIndex]?.departures.map(
            (departure) => departure.id,
          ) ?? [])
        : [];
    updateTripPlans(tripIndex, (plans) =>
      plans.map((plan, index) =>
        index === planIndex ? { ...plan, departureMode, departureIds } : plan,
      ),
    );
  };

  const togglePlanDeparture = (
    tripIndex: number,
    planIndex: number,
    departureId: string,
  ) => {
    updateTripPlans(tripIndex, (plans) =>
      plans.map((plan, index) => {
        if (index !== planIndex) return plan;
        const departureIds = plan.departureIds.includes(departureId)
          ? plan.departureIds.filter((id) => id !== departureId)
          : [...plan.departureIds, departureId];
        return { ...plan, departureIds };
      }),
    );
  };

  const addTrip = () => {
    const trip = createTrip();
    setDraft((current) => ({ ...current, trips: [...current.trips, trip] }));
    setOpenTripIds((current) => new Set(current).add(trip.id));
    trip.plans.forEach(plan => setPlanOpen(plan.id, true));
    setKeyword("");
    setFilter("all");
    setRevealId(`studio-trip-${trip.id}`);
    setStatus({
      kind: "idle",
      message: "已新增空白行程（在清單最下方），填寫完成後請記得儲存",
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
    const created = createDeparture();
    revealDepartures([created.id]);
    setDraft((current) => ({
      ...current,
      trips: current.trips.map((trip, index) =>
        index === tripIndex
          ? keepSinglePlanCoveringAll(trip, {
              ...trip,
              departures: [...trip.departures, created],
            })
          : trip,
      ),
    }));
    markChanged();
  };

  // 起始價格：自動＝跟著團期最低價；手動＝自己填。切成自動時，只有一個版本的行程
  // 會一併清掉版本起價（原本與行程起價相同），避免前台卡片顯示舊價格。
  const setPriceMode = (tripIndex: number, mode: "auto" | "manual") => {
    setDraft((current) => ({
      ...current,
      trips: current.trips.map((trip, index) => {
        if (index !== tripIndex) return trip;
        if (mode === "manual") {
          return { ...trip, priceMode: undefined, price: resolveTripPrice(trip, todayTime) };
        }
        return {
          ...trip,
          priceMode: "auto",
          price: resolveTripPrice({ ...trip, priceMode: "auto" }, todayTime),
          plans:
            trip.plans.length === 1
              ? trip.plans.map((plan) => ({ ...plan, price: "" }))
              : trip.plans,
        };
      }),
    }));
    markChanged();
  };

  // 封面圖片直接上傳：沿用首頁輪播照片的上傳服務（同樣會縮圖並轉成 WebP）。
  const uploadCover = async (tripIndex: number, file: File) => {
    const trip = draft.trips[tripIndex];
    if (!trip) return;
    if (file.size > 8 * 1024 * 1024) {
      setStatus({ kind: "error", message: "請選擇 8 MB 以內的照片" });
      return;
    }
    setUploadingCoverId(trip.id);
    setStatus({ kind: "saving", message: `正在上傳 ${file.name}…` });
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/studio/hero-image", { method: "POST", body });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "照片上傳失敗");
      const url = result.url;
      setDraft((current) => ({
        ...current,
        trips: current.trips.map((item) => (item.id === trip.id ? { ...item, image: url } : item)),
      }));
      setStatus({ kind: "success", message: "照片已上傳，請再按「儲存並更新網站」完成發布" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "照片上傳失敗，請再試一次",
      });
    } finally {
      setUploadingCoverId(null);
    }
  };

  // 儲存前把「自動計算」的起始價格寫成目前的最新值。
  const withAutoPrices = (content: SiteContent): SiteContent => ({
    ...content,
    trips: content.trips.map((trip) =>
      trip.priceMode === "auto" ? { ...trip, price: resolveTripPrice(trip, todayTime) } : trip,
    ),
  });

  const updateDeparture = <K extends keyof TripDeparture>(
    tripIndex: number,
    departureIndex: number,
    key: K,
    value: TripDeparture[K],
  ) => {
    const editedId = draft.trips[tripIndex]?.departures[departureIndex]?.id;
    if (editedId) revealDepartures([editedId]);
    updateTripDepartures(tripIndex, (departures) =>
      departures.map((departure, index) =>
        index === departureIndex ? { ...departure, [key]: value } : departure,
      ),
    );
  };

  const replaceTrip = (tripIndex: number, next: Trip) => {
    setDraft((current) => ({
      ...current,
      trips: current.trips.map((trip, index) => (index === tripIndex ? next : trip)),
    }));
    markChanged();
  };

  const clearExpiredDepartures = (tripIndex: number) => {
    const trip = draft.trips[tripIndex];
    if (!trip) return;
    const { trip: cleaned, removed } = removeExpiredDepartures(trip, todayTime);
    if (removed === 0) return;
    if (
      !window.confirm(
        `確定清除「${trip.title || "這個行程"}」已過期的 ${removed} 個團期嗎？這些團期不會再顯示在前台；按儲存後才會生效，儲存前重新整理頁面即可放棄。`,
      )
    ) {
      return;
    }
    replaceTrip(tripIndex, cleaned);
    setStatus({ kind: "idle", message: `已清除 ${removed} 個已過期團期，請按儲存更新網站` });
  };

  const removeDeparture = (tripIndex: number, departureIndex: number) => {
    const departureId = draft.trips[tripIndex]?.departures[departureIndex]?.id;
    setDraft((current) => ({
      ...current,
      trips: current.trips.map((trip, index) =>
        index === tripIndex
          ? {
              ...trip,
              departures: trip.departures.filter(
                (_, index) => index !== departureIndex,
              ),
              plans: trip.plans.map((plan) => ({
                ...plan,
                departureIds: departureId
                  ? plan.departureIds.filter((id) => id !== departureId)
                  : plan.departureIds,
              })),
            }
          : trip,
      ),
    }));
    markChanged();
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

  const uploadPdf = async (
    tripIndex: number,
    planIndex: number,
    file: File,
  ) => {
    const trip = draft.trips[tripIndex];
    const plan = trip?.plans[planIndex];
    if (!trip || !plan) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ kind: "error", message: "請選擇 PDF 檔案" });
      return;
    }

    const uploadKey = `${trip.id}:${plan.id}`;
    setUploadingPlanKey(uploadKey);
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
        trips: current.trips.map((item) =>
          item.id === trip.id
            ? {
                ...item,
                plans: item.plans.map((itemPlan) =>
                  itemPlan.id === plan.id
                    ? {
                        ...itemPlan,
                        documentType: "pdf",
                        documentUrl: result.url ?? "",
                        documentName: result.filename ?? file.name,
                        documentUpdatedAt: "",
                      }
                    : itemPlan,
                ),
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
      setUploadingPlanKey(null);
    }
  };

  const needle = keyword.trim().toLowerCase();
  // 保留原始索引，所有增刪與排序操作都以完整陣列為準。
  const visibleTrips = draft.trips
    .map((trip, index) => ({
      trip,
      index,
      issues: tripIssues(trip, todayTime),
    }))
    .filter(({ trip, issues }) => {
      if (filter === "featured" && !trip.featured) return false;
      if (filter === "other" && trip.featured) return false;
      if (filter === "todo" && issues.length === 0) return false;
      if (!needle) return true;
      return [
        trip.title,
        trip.region,
        trip.badge,
        trip.days,
        trip.price,
        ...trip.plans.flatMap((plan) => [plan.airline, plan.title]),
      ]
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
        // 收合起來的行程不會跑瀏覽器內建的必填檢查，所以儲存前再檢查一次，
        // 並直接展開、捲到第一筆沒填完的行程。
        const unfinished = firstUnfinishedTrip(draft);
        if (unfinished) {
          setFilter("all");
          setKeyword("");
          setOpenTripIds((current) => new Set(current).add(unfinished.id));
          setRevealId(`studio-trip-${unfinished.id}`);
          setStatus({ kind: "error", message: unfinished.message });
          return;
        }
        void save(withAutoPrices);
      }}
    >
      <section className="studio-section studio-guide">
        <h2>業務上架流程</h2>
        <div className="studio-guide-grid">
          <span>
            <b>1</b> 新增行程
          </span>
          <span>
            <b>2</b> 建立航空版本、上傳文件與新增團期
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
            <div
              className="trip-filter-pills"
              role="group"
              aria-label="行程篩選"
            >
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
          <div className="empty-trips">
            尚未建立行程，請按「新增行程」開始。
          </div>
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
          {visibleTrips.map(({ trip, index, issues }) => {
            const summary = tripListSummary(trip, todayTime);
            const simple = trip.plans.length === 1;
            const expiredCount = countExpiredDepartures(trip, todayTime);
            const showExpired = expiredShownIds.has(trip.id);
            const hideExpired = expiredCount > 0 && !showExpired;
            const isHiddenRow = (departure: TripDeparture) =>
              hideExpired && isExpiredDeparture(departure, todayTime) && !revealedDepartureIds.has(departure.id);
            const visibleDepartureCount = trip.departures.filter((departure) => !isHiddenRow(departure)).length;
            return (
            <div
              id={`studio-trip-${trip.id}`}
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
                  <span className="studio-trip-thumb" aria-hidden="true">
                    {trip.image.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverThumbnail(trip.image)} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <i>無封面</i>
                    )}
                  </span>
                  <span className="studio-trip-summary">
                    <span className="studio-trip-line">
                      <span className="studio-trip-index">{index + 1}</span>
                      <span className="studio-trip-name">{trip.title || "（尚未命名的新行程）"}</span>
                      {!trip.featured ? (
                        <span className="studio-trip-tag">其他</span>
                      ) : null}
                      {issues.map((issue) => (
                        <span className="studio-trip-issue" key={issue}>
                          {issue}
                        </span>
                      ))}
                    </span>
                    <span className="studio-trip-meta">
                      <span>{summary.price || "價格未填"}</span>
                      <span>
                        {summary.nextDate
                          ? `下一團 ${summary.nextDate}・共 ${summary.upcomingCount} 團`
                          : summary.totalDepartures > 0
                            ? "團期都已過"
                            : "尚無團期"}
                      </span>
                      <span className={summary.documentsReady < summary.documentsTotal || summary.documentsTotal === 0 ? "is-warn" : undefined}>
                        {summary.documentsTotal === 0
                          ? "尚無行程文件"
                          : summary.documentsTotal === 1
                            ? summary.documentsReady === 1 ? "行程文件已備妥" : "行程文件待補"
                            : `行程文件 ${summary.documentsReady}/${summary.documentsTotal} 已備妥`}
                      </span>
                    </span>
                  </span>
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
                        placeholder="例如：東京慢旅 5日"
                        value={trip.title}
                        onChange={(event) =>
                          updateTrip(index, "title", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="天數">
                      <input
                        required
                        placeholder="例如：5日"
                        value={trip.days}
                        onChange={(event) =>
                          updateTrip(index, "days", event.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="分類標籤"
                      hint="首頁會用它做成篩選分類，例如：日本、韓國、北歐。"
                    >
                      <input
                        required
                        placeholder="例如：日本"
                        value={trip.badge}
                        onChange={(event) =>
                          updateTrip(index, "badge", event.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="地區小字"
                      hint="顯示在行程卡片上的小字，例如：東京・箱根。"
                    >
                      <input
                        required
                        placeholder="例如：東京・箱根"
                        value={trip.region}
                        onChange={(event) =>
                          updateTrip(index, "region", event.target.value)
                        }
                      />
                    </Field>
                    <div className="field start-price-field">
                      <span>起始價格</span>
                      <small>顯示在行程卡片與日期頁。選「自動」會取目前最低的團期價格，不用再手動維護。</small>
                      <div className="document-type-switch" role="group" aria-label="起始價格計算方式">
                        <button
                          type="button"
                          aria-pressed={trip.priceMode === "auto"}
                          className={trip.priceMode === "auto" ? "active" : ""}
                          onClick={() => setPriceMode(index, "auto")}
                        >
                          自動（團期最低價）
                        </button>
                        <button
                          type="button"
                          aria-pressed={trip.priceMode !== "auto"}
                          className={trip.priceMode !== "auto" ? "active" : ""}
                          onClick={() => setPriceMode(index, "manual")}
                        >
                          自己填寫
                        </button>
                      </div>
                      {trip.priceMode === "auto" ? (
                        <output className="start-price-auto">
                          <strong>{summary.price || "價格請洽詢"}</strong>
                          <small>
                            {lowestUpcomingPrice(trip, todayTime) !== null
                              ? `取自還沒出發的團期中最低的價格（共 ${summary.upcomingCount} 團）。新增或修改團期價格後會自動更新。`
                              : "還沒有可計算的團期價格，先顯示這段文字。新增團期並填上價格後會自動換成最低價。"}
                          </small>
                        </output>
                      ) : (
                        <>
                          <input
                            required
                            placeholder="例如：NT$31,900 起／人"
                            value={trip.price}
                            onChange={(event) =>
                              updateTrip(index, "price", event.target.value)
                            }
                          />
                          {priceMismatch(trip, todayTime) !== null ? (
                            <p className="start-price-warn" role="status">
                              團期裡目前最低價是 <b>{formatStartPrice(priceMismatch(trip, todayTime)!)}</b>，和上面填的不一樣。
                              <button type="button" onClick={() => setPriceMode(index, "auto")}>
                                改成自動計算
                              </button>
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                    <div className="field field-wide cover-field" role="group" aria-label="封面圖片">
                      <span>封面圖片</span>
                      <small>橫幅照片、寬度 1600px 以上效果最好。可直接從電腦上傳，或貼上圖片網址。</small>
                      <div className="cover-field-body">
                        <div className="cover-field-preview">
                          {trip.image.trim() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              className="cover-preview"
                              src={trip.image.trim()}
                              alt={`${trip.title || "新行程"}封面預覽`}
                              onError={(event) => {
                                event.currentTarget.dataset.broken = "true";
                              }}
                              onLoad={(event) => {
                                delete event.currentTarget.dataset.broken;
                              }}
                            />
                          ) : (
                            <span className="cover-empty">尚未選擇封面</span>
                          )}
                        </div>
                        <div className="cover-field-controls">
                          <label className="file-picker cover-upload">
                            <span>
                              {uploadingCoverId === trip.id
                                ? "照片上傳中…"
                                : trip.image.trim()
                                  ? "更換照片（從電腦上傳）"
                                  : "從電腦上傳照片"}
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              disabled={uploadingCoverId !== null}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void uploadCover(index, file);
                                event.target.value = "";
                              }}
                            />
                          </label>
                          <small>JPG、PNG 或 WebP，8 MB 以內。上傳後請按最下方的儲存。</small>
                          <input
                            required
                            aria-label="封面圖片網址"
                            placeholder="或貼上圖片網址 https://…"
                            value={trip.image}
                            onChange={(event) =>
                              updateTrip(index, "image", event.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <Field label="行程簡介" wide>
                      <textarea
                        required
                        placeholder="說明這趟旅程的特色與適合對象。行程卡片上只會顯示前 3 行，完整內容請放在行程文件。"
                        value={trip.summary}
                        onChange={(event) =>
                          updateTrip(index, "summary", event.target.value)
                        }
                      />
                    </Field>
                  </div>

                  <div className="plan-editor">
                    <div className="plan-editor-heading">
                      <div>
                        <h4>{simple ? "航空與行程文件" : "航空／行程版本"}</h4>
                        <small>
                          {simple
                            ? "這個行程只需要一份行程文件。如果同一行程有不同航空或不同內容，可以再加一個版本。"
                            : "每一份 PDF 或 Drive 行程建立成一個版本。展開航空名稱即可管理差異、文件與團期。"}
                        </small>
                      </div>
                      <button
                        className={`button button-small${simple ? " button-quiet" : " button-secondary"}`}
                        type="button"
                        onClick={() => addPlan(index)}
                      >
                        {simple ? "＋ 加另一個航空版本" : "＋新增版本"}
                      </button>
                    </div>

                    {trip.plans.length > 0 ? (
                      <div className="plan-editor-list">
                        {trip.plans.map((plan, planIndex) => {
                          const uploadKey = `${trip.id}:${plan.id}`;
                          const selectedDepartureCount =
                            plan.departureMode === "all"
                              ? trip.departures.length
                              : plan.departureIds.length;

                          const extraFields = (
                            <>
                                <Field
                                  label="版本起價（選填）"
                                  hint="留空時顯示行程的共用起價。"
                                >
                                  <input
                                    placeholder="例如：29,900 起"
                                    value={plan.price}
                                    onChange={(event) =>
                                      updatePlan(
                                        index,
                                        planIndex,
                                        "price",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field>
                                <details className="field-wide finder-editor-overrides"><summary>進階配對設定（選填，通常不用填）</summary><p>直接沿用既有團期、地區、航空與價格。價格已寫明「／人」、航班已寫明「桃園出發」時會自動讀取；資料不足會另外標示待確認。只有需要補充或更正時才填以下欄位。</p><div className="field-grid"><Field label="服務類型覆寫（選填）" hint="未設定仍可列入待確認版本；不會猜測客製或機票服務。">
                                  <select value={plan.serviceType ?? "unknown"} onChange={event => updatePlan(index, planIndex, "serviceType", event.target.value as TripPlan["serviceType"])}>
                                    <option value="unknown">待確認</option><option value="group">跟團旅行</option><option value="custom">自組／客製團</option><option value="partial">機票／機加酒／包車</option>
                                  </select>
                                </Field>
                                <Field label="出發機場覆寫（選填）" hint="優先讀取此處；留空時讀取航班或摘要中明確的出發機場。">
                                  <input maxLength={40} value={plan.departureAirport ?? ""} onChange={event => updatePlan(index, planIndex, "departureAirport", event.target.value)} />
                                </Field>
                                <Field label="價格基準覆寫（選填）" hint="價格已明列／人、／房時可不填；未知或矛盾資料不會當成已符合預算。">
                                  <select value={plan.priceBasis ?? "unknown"} onChange={event => updatePlan(index, planIndex, "priceBasis", event.target.value as TripPlan["priceBasis"])}>
                                    <option value="unknown">待確認</option><option value="person">每人</option><option value="room">每房</option><option value="group">整團</option>
                                  </select>
                                </Field>
                                <Field label="文件內容確認日期" hint="由業務確認內容後填寫，不代表即時團位。">
                                  <input type="date" value={plan.documentUpdatedAt ?? ""} onChange={event => updatePlan(index, planIndex, "documentUpdatedAt", event.target.value)} />
                                </Field>
                                </div></details><Field label="航班時段（選填）">
                                  <input maxLength={120} placeholder="例如：早去晚回" value={plan.flight ?? ""} onChange={event => updatePlan(index, planIndex, "flight", event.target.value)} />
                                </Field>
                                <Field label="住宿安排（選填）">
                                  <input maxLength={120} placeholder="例如：兩晚升等五星飯店" value={plan.accommodation ?? ""} onChange={event => updatePlan(index, planIndex, "accommodation", event.target.value)} />
                                </Field>
                                <Field label="版本差異摘要" wide>
                                  <textarea
                                    required={!simple}
                                    placeholder="說明航班時間、住宿或行程內容差異。"
                                    value={plan.summary}
                                    onChange={(event) =>
                                      updatePlan(
                                        index,
                                        planIndex,
                                        "summary",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field>
                            </>
                          );

                          const body = (
                            <>
                              <h5 className="plan-step-title">{simple ? "1. 航空公司" : "1. 航空與版本差異"}</h5>
                              <div className="field-grid plan-fields">
                                <Field label="航空公司">
                                  <input
                                    required
                                    placeholder="例如：長榮航空"
                                    value={plan.airline}
                                    onChange={(event) =>
                                      updatePlan(
                                        index,
                                        planIndex,
                                        "airline",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field>
                                <Field label="版本名稱">
                                  <input
                                    required
                                    placeholder="例如：早去晚回精選版"
                                    value={plan.title}
                                    onChange={(event) =>
                                      updatePlan(
                                        index,
                                        planIndex,
                                        "title",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field>
                                {simple ? (
                                  <details className="field-wide plan-more-settings">
                                    <summary>更多設定（航班、住宿、備註，通常不用填）</summary>
                                    <div className="field-grid">{extraFields}</div>
                                  </details>
                                ) : (
                                  extraFields
                                )}
                              </div>

                              <div className="plan-document-editor">
                                <h5 className="plan-step-title">{simple ? "2. 行程文件" : "2. 此版本的行程文件"}</h5>
                                <div
                                  className="document-type-switch"
                                  role="group"
                                  aria-label={`方案 ${planIndex + 1} 行程資料來源`}
                                >
                                  <button
                                    type="button"
                                    aria-pressed={plan.documentType === "pdf"}
                                    className={
                                      plan.documentType === "pdf"
                                        ? "active"
                                        : ""
                                    }
                                    onClick={() =>
                                      changeDocumentType(
                                        index,
                                        planIndex,
                                        "pdf",
                                      )
                                    }
                                  >
                                    上傳 PDF
                                  </button>
                                  <button
                                    type="button"
                                    aria-pressed={plan.documentType === "drive"}
                                    className={
                                      plan.documentType === "drive"
                                        ? "active"
                                        : ""
                                    }
                                    onClick={() =>
                                      changeDocumentType(
                                        index,
                                        planIndex,
                                        "drive",
                                      )
                                    }
                                  >
                                    Drive 網址
                                  </button>
                                </div>

                                {plan.documentType === "pdf" ? (
                                  <div className="pdf-upload">
                                    <label className="file-picker">
                                      <span>
                                        {uploadingPlanKey === uploadKey
                                          ? "正在上傳…"
                                          : plan.documentUrl
                                            ? `已上傳：${plan.documentName}`
                                            : "選擇 PDF 檔案"}
                                      </span>
                                      <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        disabled={
                                          uploadingPlanKey === uploadKey
                                        }
                                        onChange={(event) => {
                                          const file = event.target.files?.[0];
                                          if (file)
                                            void uploadPdf(
                                              index,
                                              planIndex,
                                              file,
                                            );
                                          event.target.value = "";
                                        }}
                                      />
                                    </label>
                                    <small>
                                      單一檔案上限 25
                                      MB；上傳完成後請按最下方儲存按鈕。
                                    </small>
                                  </div>
                                ) : (
                                  <Field
                                    label="Google Drive 分享網址"
                                    hint="請先把檔案權限設為「知道連結的任何人都可查看」"
                                    wide
                                  >
                                    <input
                                      type="url"
                                      placeholder="https://drive.google.com/..."
                                      value={plan.documentUrl}
                                      onChange={(event) =>
                                        updatePlan(
                                          index,
                                          planIndex,
                                          "documentUrl",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </Field>
                                )}
                                {plan.documentUrl && <a className="plan-document-preview" href={plan.documentUrl} target="_blank" rel="noreferrer">預覽：{plan.documentName || tripPlanLabel(plan)} ↗</a>}
                              </div>

                              {!simple ? (
                              <div className="plan-departure-editor">
                                <h5 className="plan-step-title">3. 此版本的出發日期與價格</h5>
                                <DepartureBatchEditor trip={trip} plan={plan} todayTime={todayTime} onAdd={rows => addBatchToPlan(trip.id, plan.id, rows)} />
                                <details className="plan-existing-departures">
                                  <summary>套用既有團期（目前 {selectedDepartureCount} 個）</summary>
                                <div className="plan-departure-heading">
                                  <strong>適用團期</strong>
                                  <small>
                                    {trip.departures.length === 0
                                      ? "可使用上方的月曆多選新增"
                                      : `目前套用 ${selectedDepartureCount} 個團期`}
                                  </small>
                                </div>
                                <div
                                  className="plan-departure-mode"
                                  role="group"
                                  aria-label={`方案 ${planIndex + 1} 適用團期`}
                                >
                                  <button
                                    type="button"
                                    aria-pressed={plan.departureMode === "all"}
                                    className={
                                      plan.departureMode === "all"
                                        ? "active"
                                        : ""
                                    }
                                    onClick={() =>
                                      changePlanDepartureMode(
                                        index,
                                        planIndex,
                                        "all",
                                      )
                                    }
                                  >
                                    適用所有團期
                                  </button>
                                  <button
                                    type="button"
                                    aria-pressed={
                                      plan.departureMode === "selected"
                                    }
                                    className={
                                      plan.departureMode === "selected"
                                        ? "active"
                                        : ""
                                    }
                                    onClick={() =>
                                      changePlanDepartureMode(
                                        index,
                                        planIndex,
                                        "selected",
                                      )
                                    }
                                  >
                                    指定部分團期
                                  </button>
                                </div>

                                {plan.departureMode === "selected" &&
                                trip.departures.length > 0 ? (
                                  <>
                                  <div className="plan-month-actions" role="group" aria-label="按月份批次套用既有團期">
                                    {[...new Set(trip.departures.map(d => parseDepartureDate(d.date)).filter(d => d !== null).map(d => `${d.year}/${String(d.month).padStart(2, "0")}`))].sort().map(month => {
                                      const ids = trip.departures.filter(d => formatDepartureDate(d.date).startsWith(`${month}/`)).map(d => d.id);
                                      const allSelected = ids.every(id => plan.departureIds.includes(id));
                                      return <button type="button" key={month} aria-pressed={allSelected} onClick={() => updatePlan(index, planIndex, "departureIds", allSelected ? plan.departureIds.filter(id => !ids.includes(id)) : [...new Set([...plan.departureIds, ...ids])])}>{month} {allSelected ? "取消整月" : "全選整月"}</button>;
                                    })}
                                  </div>
                                  <div className="plan-departure-options">
                                    {trip.departures.map((departure) => (
                                      <label key={departure.id}>
                                        <input
                                          type="checkbox"
                                          checked={plan.departureIds.includes(
                                            departure.id,
                                          )}
                                          onChange={() =>
                                            togglePlanDeparture(
                                              index,
                                              planIndex,
                                              departure.id,
                                            )
                                          }
                                        />
                                        <span>
                                          {departure.date || "日期待填"} · {formatPrice(departure.price)}
                                          {departure.note && ` · ${departure.note}`}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                  </>
                                ) : null}
                                </details>
                              </div>
                              ) : null}
                              <details className="plan-public-preview">
                                <summary>{simple ? "3." : "4."} 預覽旅客看到的版本卡片</summary>
                                {plan.documentUrl ? <TripPlanCard plan={plan} departures={upcomingDepartures(trip.departures, todayTime)} fallbackPrice={summary.price} tripId={trip.id} days={trip.days} openInquiryInNewTab /> : <p>設定 PDF 或 Drive 網址後即可預覽。未設定文件的版本不會顯示在前臺。</p>}
                              </details>
                            </>
                          );

                          return simple ? (
                            <div
                              className="plan-editor-card plan-editor-single"
                              id={`studio-plan-${plan.id}`}
                              key={plan.id}
                            >
                              {body}
                            </div>
                          ) : (
                            <details
                              className="plan-editor-card"
                              id={`studio-plan-${plan.id}`}
                              key={plan.id}
                              open={openPlanIds.has(plan.id)}
                              onToggle={event => setPlanOpen(plan.id, event.currentTarget.open)}
                              onInvalidCapture={event => { event.currentTarget.open = true; setPlanOpen(plan.id, true); }}
                            >
                              <summary className="plan-editor-card-heading">
                                <div>
                                  <span>行程版本 {planIndex + 1} · {plan.documentUrl ? (plan.documentType === "pdf" ? "PDF 已備妥" : "Drive 已設定") : "待補行程文件"} · {selectedDepartureCount} 個團期</span>
                                  <strong>
                                    {plan.airline || "航空公司待填"}｜
                                    {plan.title || "版本名稱待填"}
                                  </strong>
                                </div>
                                <span>{openPlanIds.has(plan.id) ? "收合 −" : "編輯 ＋"}</span>
                              </summary>
                              <div className="trip-editor-actions">
                                <button type="button" onClick={() => copyPlan(index, plan)}>複製版本</button>
                                <button
                                  type="button"
                                  onClick={() => movePlan(index, planIndex, -1)}
                                  disabled={planIndex === 0}
                                  aria-label={`將方案 ${planIndex + 1} 往上移`}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => movePlan(index, planIndex, 1)}
                                  disabled={planIndex === trip.plans.length - 1}
                                  aria-label={`將方案 ${planIndex + 1} 往下移`}
                                >
                                  ↓
                                </button>
                                <button
                                  className="danger"
                                  type="button"
                                  onClick={() => removePlan(index, planIndex)}
                                >
                                  刪除
                                </button>
                              </div>
                              {body}
                            </details>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="plan-editor-empty">
                        尚未建立版本。請新增版本後再上傳行程文件。
                      </div>
                    )}
                  </div>

                  <div className="departure-editor">
                    <div className="departure-editor-heading">
                      <div>
                        <h4>{simple ? "出發日期與價格" : "出發日期表"}</h4>
                        <small>
                          {simple
                            ? "用下方的月曆一次新增多個日期，也可以逐筆新增與修改。"
                            : "可在上方各版本內批次新增，並在此修改既有團期。共用團期的價格修改會影響所有套用版本。"}
                          日期輸入 20260402 會自動轉成 2026/04/02，價格輸入 26800
                          會自動加上逗號；日期無效或空白的列必須修正或移除後才能儲存。
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

                    {simple ? (
                      <>
                        <DepartureBatchEditor
                          trip={trip}
                          plan={trip.plans[0]}
                          todayTime={todayTime}
                          single
                          onAdd={(rows) => addBatchToPlan(trip.id, trip.plans[0].id, rows)}
                        />
                        {!planCoversAllDepartures(trip.plans[0], trip.departures) ? (
                          <p className="departure-uncovered" role="status">
                            有{" "}
                            {trip.departures.filter((d) => !planAppliesToDeparture(trip.plans[0], d.id)).length}{" "}
                            個日期還沒套用到這份行程文件，前台不會顯示它們。
                            <button
                              type="button"
                              onClick={() => changePlanDepartureMode(index, 0, "all")}
                            >
                              全部套用
                            </button>
                          </p>
                        ) : null}
                      </>
                    ) : null}

                    {trip.departures.length > 1 ? (
                      <div className="departure-tools">
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => replaceTrip(index, sortDeparturesByDate(trip))}
                        >
                          依日期排序
                        </button>
                        {expiredCount > 0 ? (
                          <>
                            <span className="departure-expired-count">已過期 {expiredCount} 個</span>
                            <button
                              type="button"
                              className="button button-secondary button-small"
                              aria-pressed={showExpired}
                              onClick={() => toggleExpiredShown(trip.id)}
                            >
                              {showExpired ? "收合已過期團期" : "顯示已過期團期"}
                            </button>
                            <button
                              type="button"
                              className="button button-quiet button-small"
                              onClick={() => clearExpiredDepartures(index)}
                            >
                              清除已過期團期
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    <DeparturePriceTool
                      trip={trip}
                      todayTime={todayTime}
                      onApply={(next) => replaceTrip(index, next)}
                    />

                    {trip.departures.length > 0 && visibleDepartureCount === 0 ? (
                      <div className="departure-empty">
                        目前沒有還沒出發的團期。已過期的 {expiredCount} 個團期已收合，可新增新的日期。
                      </div>
                    ) : null}

                    {visibleDepartureCount > 0 ? (
                      <div className="departure-rows">
                        <div
                          className="departure-row departure-row-head"
                          aria-hidden="true"
                        >
                          <span>出發日期／團期備註</span>
                          <span>價格</span>
                          <span />
                        </div>
                        {trip.departures.map((departure, departureIndex) => (
                          isHiddenRow(departure) ? null : (
                          <div
                            className={`departure-row${isExpiredDeparture(departure, todayTime) ? " is-expired" : ""}`}
                            key={departure.id}
                          >
                            <div>
                              {simple ? null : <small className="departure-version-label">{trip.plans.filter(plan => planAppliesToDeparture(plan, departure.id)).map(tripPlanLabel).join("、") || "尚未套用任何版本"}</small>}
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
                                aria-label="團期備註"
                                placeholder="例如：長榮早去晚回／升等住宿"
                                value={departure.note ?? ""}
                                maxLength={120}
                                onChange={(event) =>
                                  updateDeparture(
                                    index,
                                    departureIndex,
                                    "note",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
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
                          )
                        ))}
                      </div>
                    ) : trip.departures.length === 0 ? (
                      <div className="departure-empty">尚未填寫出發日期。</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      </section>

      <ContentHistoryPanel
        current={draft}
        dirty={dirty}
        onRestore={(content, label) => {
          setDraft(content);
          markChanged();
          setStatus({
            kind: "idle",
            message: `已載入「${label}」的內容，確認沒問題後請按「儲存並更新網站」才會生效`,
          });
        }}
      />

      <StudioSaveBar status={status} busy={Boolean(uploadingPlanKey || uploadingCoverId)} dirty={dirty} />
    </form>
  );
}
