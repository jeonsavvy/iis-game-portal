import { AdminLoginForm } from "@/components/AdminLoginForm";
import { normalizeNextPath, parseAllowedAdminEmails } from "@/lib/auth/admin-auth";

type LoginSearchParams = {
  next?: string;
  error?: string;
};

export default async function LoginPage({ searchParams }: { searchParams?: Promise<LoginSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const nextPath = normalizeNextPath(params.next, "/admin");
  const allowedEmails = parseAllowedAdminEmails(process.env.ADMIN_ALLOWED_EMAILS);
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";

  if (previewMode) {
    return (
      <section className="surface arcade-empty-state" style={{ display: "grid", gap: 12, maxWidth: 720, margin: "24px auto" }}>
        <h3>프리뷰 모드 로그인 비활성화</h3>
        <p>현재는 데모 검수 모드이므로 매직링크 로그인을 건너뛰고 Studio Console을 바로 확인할 수 있습니다.</p>
        <a className="button button-primary" href="/admin">
          스튜디오 콘솔 열기
        </a>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 16, paddingTop: 16 }}>
      <AdminLoginForm nextPath={nextPath} allowedEmails={allowedEmails} initialError={params.error ?? null} />
    </section>
  );
}
