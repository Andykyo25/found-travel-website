import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioLoginForm } from "@/app/components/StudioLoginForm";
import { getStudioUser } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "後台登入",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioLoginPage() {
  if (await getStudioUser()) redirect("/studio");

  return (
    <main className="studio-login-shell">
      <section className="studio-login-card">
        <Link className="brand studio-login-brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/brand/logo.png" alt="" />
          <span>找到了旅行社</span>
        </Link>
        <p className="eyebrow">
          <span />
          PRIVATE STUDIO
        </p>
        <h1>行程內容管理</h1>
        <p className="studio-login-intro">
          請使用業務團隊核准的 Email 與密碼登入。前台網站不需要登入即可瀏覽。
        </p>
        <StudioLoginForm />
        <Link className="text-link studio-login-back" href="/">
          ← 回到公開網站
        </Link>
      </section>
    </main>
  );
}
