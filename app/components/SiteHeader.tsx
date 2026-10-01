import Link from "next/link";
import { MobileNav, type NavLink } from "./MobileNav";

const navigation: NavLink[] = [
  { href: "/#journeys", label: "精選行程" },
  { href: "/dates", label: "出發團期" },
  { href: "/find-trip", label: "幫我找旅行" },
  { href: "/about", label: "關於我們" },
];

export function SiteHeader({ brandName, lineUrl, active = "", home = false }: {
  brandName: string;
  lineUrl: string;
  active?: string;
  home?: boolean;
}) {
  return <>
    {process.env.NODE_ENV === "development" && process.env.FOUND_DESIGN_PREVIEW === "1" && <div className="design-preview-note">本機設計預覽 <span>行程採用正式站公開內容快照 · 未發布</span></div>}
    <header className="site-header" role="banner">
    <Link className="brand site-brand" href="/" aria-label={`${brandName}首頁`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand-logo" src="/brand/logo-mark.png" alt="" width="58" height="46" />
      <span>{brandName}<small>FOUND TRAVEL</small></span>
    </Link>
    <nav className="site-navigation" aria-label="主要導覽">
      {navigation.map(link => <Link key={link.href} href={home && link.href === "/#journeys" ? "#journeys" : link.href}
        aria-current={active === link.href ? "page" : undefined}>{link.label}</Link>)}
    </nav>
    <div className="site-header-actions">
      <Link className="site-header-contact" href="/contact" aria-current={active === "/contact" ? "page" : undefined}>聊聊你的旅行 <span aria-hidden="true">↗</span></Link>
      <MobileNav links={navigation} lineUrl={lineUrl} brandName={brandName} />
    </div>
  </header></>;
}
