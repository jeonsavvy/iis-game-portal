"use client";

import { LogOut } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  redirectTo?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
};

export function SignOutButton({ className, redirectTo = "/login", size = "default", variant = "outline" }: SignOutButtonProps = {}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.assign(redirectTo);
  };

  return (
    <Button type="button" variant={variant} size={size} onClick={handleClick} disabled={loading} className={cn(className)}>
      <LogOut className="size-4" />
      {loading ? "로그아웃 중..." : "로그아웃"}
    </Button>
  );
}
