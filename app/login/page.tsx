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

  return (
    <section style={{ display: "grid", gap: 16, paddingTop: 16 }}>
      <AdminLoginForm nextPath={nextPath} allowedEmails={allowedEmails} initialError={params.error ?? null} />
    </section>
  );
}
