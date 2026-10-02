import { getSiteContentWithMeta, defaultSiteContent } from "@/lib/site-content";
import { taipeiTodayTime } from "@/lib/trip-values";
import { TravelFinder } from "@/app/components/TravelFinder";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SplitText } from "@/app/components/SplitText";

export const dynamic = "force-dynamic";
export const metadata = { title: "幫我找適合的旅行", description: "先整理日期、預算與旅行需求，比較行程，再交給顧問確認。", alternates: { canonical: "/find-trip" } };

export default async function FindTripPage() {
  const { content, available } = await getSiteContentWithMeta()
    .then(({ content }) => ({ content, available: true }))
    .catch(() => ({ content: { ...defaultSiteContent, trips: [] }, available: false }));
  return <>
  <main className="finder-shell public-page">
    <a className="skip-link" href="#finder-content">跳至旅行需求整理</a>
    <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} active="/find-trip" />
    <div className="finder-intro" id="finder-content"><p className="eyebrow">FIND YOUR JOURNEY</p><SplitText as="h1" text="先說說，你想怎麼旅行？" /><p>不用先留電話。整理幾個想法，找到值得比較的選擇，再一起確認細節。</p></div>
    {!available && <p role="status" className="finder-empty">行程資料暫時無法載入，請稍後重試。您仍可先整理需求交給顧問；目前不提供商品配對。</p>}
    <TravelFinder trips={content.trips} lineUrl={content.lineUrl} today={taipeiTodayTime()} />
  </main>
  <SiteFooter content={content} />
  </>;
}
