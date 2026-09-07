import {
  formatDepartureDate,
  formatPrice,
  upcomingDepartures,
} from "@/lib/trip-values";
import { publishedTripPlans, tripPlanLabel } from "@/lib/trip-plans";
import Link from "next/link";
import { ContactForm } from "@/app/components/ContactForm";
import { getSiteContent } from "@/lib/site-content";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "聯絡表單",
  description:
    "留下聯絡方式與想去的地方，找到了旅行社的業務顧問會在您方便的時段主動與您聯繫。",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [content, params] = await Promise.all([getSiteContent(), searchParams]);
  const trip = content.trips.find((t) => t.id === params.trip);
  const departure =
    trip &&
    upcomingDepartures(trip.departures).find((d) => d.id === params.departure);
  const plan =
    trip &&
    publishedTripPlans(trip).find(
      (p) =>
        p.id === params.plan &&
        (!departure ||
          p.departureMode === "all" ||
          p.departureIds.includes(departure.id)),
    );
  const initialMessage = trip
    ? [
        `想諮詢：${trip.title}`,
        departure ? `出發日期：${formatDepartureDate(departure.date)}` : "",
        departure?.note ? `團期備註：${departure.note}` : "",
        departure?.price ? `參考價格：${formatPrice(departure.price)}` : "",
        plan ? `方案：${tripPlanLabel(plan)}` : "",
        "同行人數：",
        "其他需求：",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <main className="contact-shell">
      <header className="dates-header">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/brand/logo-mark.png" alt="" />
          <span>{content.brandName}</span>
        </Link>
        <Link className="button button-secondary button-small" href="/">
          回首頁
        </Link>
      </header>

      <section className="contact-card">
        <p className="eyebrow">
          <span />
          CONTACT US
        </p>
        <h1>留下聯絡方式，讓顧問來找你。</h1>
        <p className="contact-card-lede">
          填寫下方表單後，我們會保存您的需求，並安排顧問於您希望的時段與您聯繫。
          想先聊聊也可以直接用 LINE 找我們。
        </p>

        <ContactForm
          key={initialMessage}
          lineUrl={content.lineUrl}
          initialMessage={initialMessage}
        />
      </section>

      <section className="contact-aside">
        <div>
          <strong>{content.companyName}</strong>
          <span>{content.businessLicense}</span>
          <span>{content.qualityLicense}</span>
          <span>地址：{content.address}</span>
        </div>
        <a
          className="button button-secondary"
          href={content.lineUrl}
          target="_blank"
          rel="noreferrer"
        >
          改用 LINE 諮詢 <span aria-hidden="true">↗</span>
        </a>
      </section>

      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
  );
}
