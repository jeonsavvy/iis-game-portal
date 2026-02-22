import { PipelineTerminal } from "@/components/PipelineTerminal";
import { RoleActions } from "@/components/RoleActions";
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
    return <p>Sign in is required to access Studio Console.</p>;
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;

  if (!canReadPipelineLogs(role)) {
    return <p>Access denied. master_admin role is required.</p>;
  }

  const validatedRole = role as AppRole;

  const { data: logs } = await supabase
    .from("pipeline_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <h1>Studio Console</h1>
      <p>Role: {validatedRole}</p>
      <TriggerForm />
      <ManualApprovalForm />
      <RoleActions role={validatedRole} />
      <PipelineTerminal initialLogs={(logs ?? []) as PipelineLog[]} />
    </section>
  );
}
