import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, LayoutDashboard, Users, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">Sakhi</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          <Link
            to="/dashboard"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
            activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-3 text-xs text-primary font-medium" }}
          >
            <LayoutDashboard className="h-5 w-5" /> Safety
          </Link>
          <Link
            to="/contacts"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
            activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-3 text-xs text-primary font-medium" }}
          >
            <Users className="h-5 w-5" /> Contacts
          </Link>
        </div>
      </nav>
    </div>
  );
}
