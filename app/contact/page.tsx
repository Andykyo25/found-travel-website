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

export default async function ContactPage() {
  const content = await getSiteContent();

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
          填寫下方表單後，業務顧問會收到通知，並在您希望的時段與您聯繫。
          想先聊聊也可以直接用 LINE 找我們。
        </p>

        <ContactForm lineUrl={content.lineUrl} />
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
