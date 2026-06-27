import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/error-response";
import { validateTrustedWriteOrigin } from "@/lib/api/request-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}

function assertNoSupabaseError(label: string, result: { error?: { message?: string } | null }) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message ?? "Supabase operation failed"}`);
  }
}

async function deleteSessionScopedRows(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const sessionsResult = await admin.from("sessions").select("id").eq("user_id", userId);
  assertNoSupabaseError("sessions.select", sessionsResult);

  const sessionIds = (sessionsResult.data ?? []).map((row) => row.id).filter(Boolean);
  if (sessionIds.length > 0) {
    assertNoSupabaseError(
      "session_events.delete",
      await admin.from("session_events").delete().in("session_id", sessionIds),
    );
    assertNoSupabaseError(
      "conversation_history.delete",
      await admin.from("conversation_history").delete().in("session_id", sessionIds),
    );
    assertNoSupabaseError(
      "session_publish_history.delete",
      await admin.from("session_publish_history").delete().in("session_id", sessionIds),
    );
  }

  assertNoSupabaseError("sessions.delete", await admin.from("sessions").delete().eq("user_id", userId));
  return sessionIds.length;
}

async function deleteAccountData(userId: string) {
  const admin = createSupabaseAdminClient();

  const deletedSessions = await deleteSessionScopedRows(admin, userId);

  // Public games remain playable; account deletion only removes the profile link.
  assertNoSupabaseError(
    "games_metadata.update",
    await admin.from("games_metadata").update({ created_by: null } as never).eq("created_by", userId),
  );

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    throw authDeleteError;
  }

  assertNoSupabaseError("profiles.delete", await admin.from("profiles").delete().eq("id", userId));

  return {
    deletedSessions,
    detachedGames: true,
  };
}

export async function DELETE(request: Request) {
  const originValidation = validateTrustedWriteOrigin(request);
  if (!originValidation.ok) {
    return jsonError({
      status: 403,
      error: "Forbidden origin",
      code: originValidation.code,
    });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" });
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;

    if (role === "master_admin") {
      return jsonError({
        status: 403,
        error: "Master admin accounts cannot be deleted from self-service flow.",
        code: "master_admin_delete_forbidden",
      });
    }

    const data = await deleteAccountData(user.id);
    return NextResponse.json({ ok: true, deleted: true, data });
  } catch (error) {
    return jsonError({
      status: 500,
      error: "Account deletion failed",
      detail: errorMessage(error),
      code: "account_delete_failed",
    });
  }
}
