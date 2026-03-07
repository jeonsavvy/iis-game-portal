import Link from "next/link";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { Card } from "@/components/ui/card";
import { normalizeNextPath, parseAllowedStaffEmails } from "@/lib/auth/admin-auth";

type LoginSearchParams = {
  next?: string;
  error?: string;
};

export default async function LoginPage({ searchParams }: { searchParams?: Promise<LoginSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const nextPath = normalizeNextPath(params.next, "/workspace");
  const allowedEmails = parseAllowedStaffEmails(process.env.ADMIN_ALLOWED_EMAILS);
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";

  if (previewMode) {
    return (
      <Card className="mx-auto grid max-w-3xl gap-4 rounded-[2rem] border-white/10 bg-[#111118]/88 p-8 text-left">
        <h1 className="font-display text-4xl tracking-[-0.05em] text-foreground">프리뷰 모드 로그인 비활성화</h1>
        <p className="text-sm leading-7 text-muted-foreground">현재는 데모 검수 모드이므로 매직링크 로그인을 건너뛰고 운영실을 바로 확인할 수 있습니다.</p>
        <div>
          <Link className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground" href={nextPath}>
            계속 진행
          </Link>
        </div>
      </Card>
    );
  }

  return <AdminLoginForm nextPath={nextPath} allowedEmails={allowedEmails} initialError={params.error ?? null} />;
}
