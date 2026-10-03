import { StudioHeader } from "@/app/components/StudioHeader";
import { StudioPasswordForm } from "@/app/components/StudioPasswordForm";
import { canChangeStudioPassword, requireStudioUser } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "修改密碼",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioAccountPage() {
  const user = await requireStudioUser();

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="account" />

      <section className="studio-panel">
        <div className="studio-section">
          <div className="studio-section-heading">
            <div>
              <h2>修改密碼</h2>
              <p>
                可以隨時換成自己好記的密碼，不用再請管理者處理。換好之後，下次登入請用新密碼。
                已經登入的裝置不受影響，最久 8 小時後會自動登出。
              </p>
            </div>
          </div>
          <StudioPasswordForm canChange={canChangeStudioPassword()} />
          <p className="studio-password-note">
            忘記密碼時，請聯絡網站管理者重設；管理者重設後，原本自己設定的密碼會自動失效。
          </p>
        </div>
      </section>
    </main>
  );
}
