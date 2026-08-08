import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

/**
 * Client-side gate. The first render is identical on the server and on the
 * client (a neutral placeholder), so hydration never mismatches; the session
 * check and any redirect happen only after mount.
 */
function AuthGate() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "authed">("checking");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        void navigate({ to: "/auth", replace: true });
        return;
      }
      setStatus("authed");
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (status !== "authed") {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  return <Outlet />;
}
