"use client";

import { LogOut } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
    <Button type="button" variant="outline" onClick={handleClick} disabled={loading}>
      <LogOut className="size-4" />
      {loading ? "로그아웃 중..." : "로그아웃"}
    </Button>
  );
}
