"use client";

import { useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  return (
    <button className="button" type="button" onClick={handleClick} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
