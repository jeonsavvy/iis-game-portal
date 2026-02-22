import Link from "next/link";

import { PipelineTerminal } from "@/components/PipelineTerminal";
import { RoleActions } from "@/components/RoleActions";
import { SignOutButton } from "@/components/SignOutButton";
import { TriggerForm } from "@/components/TriggerForm";
import { ManualApprovalForm } from "@/components/ManualApprovalForm";
import { canReadPipelineLogs } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";
import type { PipelineLog } from "@/types/pipeline";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>Studio Console</h1>
        <p style={{ margin: 0 }}>Sign in is required to access Studio Console.</p>
        <Link className="button" href="/login?next=/admin">
          Go to Login
        </Link>
      </section>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;

  if (!canReadPipelineLogs(role)) {
    return (
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>Studio Console</h1>
        <p style={{ margin: 0 }}>
          Access denied. master_admin role is required. (signed in as {user.email ?? user.id})
        </p>
        <div>
          <SignOutButton />
        </div>
      </section>
    );
  }

  const validatedRole = role as AppRole;

  const { data: logs } = await supabase
    .from("pipeline_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h1 style={{ margin: 0 }}>Studio Console</h1>
          <p style={{ margin: 0 }}>
            Role: {validatedRole} · {user.email ?? user.id}
          </p>
        </div>
        <SignOutButton />
      </div>
      <TriggerForm />
      <ManualApprovalForm />
      <RoleActions role={validatedRole} />
      <PipelineTerminal initialLogs={(logs ?? []) as PipelineLog[]} />
    </section>
  );
}
