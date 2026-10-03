import { ContactRequestTable } from "@/app/components/ContactRequestTable";
import { StudioHeader } from "@/app/components/StudioHeader";
import { isContactNotifyConfigured } from "@/lib/contact-notify";
import {
  contactRequestListLimit,
  getContactRequests,
} from "@/lib/contact-requests";
import { requireStudioUser } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "聯絡諮詢",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioContactsPage() {
  const user = await requireStudioUser();
  const { requests, loadStatus } = await getContactRequests();
  const notifyReady = isContactNotifyConfigured();

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="contacts" />

      <section className="studio-panel">
        <div className="studio-section">
          <div className="studio-section-heading">
            <div>
              <h2>客人聯絡表單</h2>
              <p>
                客人在前台「聯絡表單」送出的諮詢，最新的排在最前面。聯絡過後請按「標示已聯絡」，同事就知道不用再打一次
                {requests.length >= contactRequestListLimit
                  ? `（僅顯示最近 ${contactRequestListLimit} 筆）`
                  : ""}
                。
              </p>
            </div>
          </div>

          {loadStatus === "unconfigured" ? (
            <div className="contact-table-empty">
              目前無法讀取聯絡表單資料（資料儲存空間尚未設定完成），請聯絡網站管理者。
            </div>
          ) : loadStatus === "error" ? (
            <p className="studio-warning" role="alert">
              目前讀取不到客人的聯絡表單，所以無法確認有沒有新的詢問。
              請稍後重新整理；在恢復前，請不要把這頁當成「目前沒有詢問」。若持續發生，請聯絡網站管理者。
            </p>
          ) : (
            <>
              {!notifyReady ? (
                <p className="studio-warning">
                  尚未設定 LINE 通知變數，客人送出的表單仍會存下來並顯示在這裡，
                  但業務群組不會收到即時通知。
                </p>
              ) : null}
              <ContactRequestTable requests={requests} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
