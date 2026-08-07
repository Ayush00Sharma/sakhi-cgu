import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, MapPin, Radio } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { osmEmbedUrl } from "@/lib/geo";

export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { title: "Live Location — Sakhi" },
      { name: "description", content: "Follow a Sakhi user's live location on a map while they travel." },
      { property: "og:title", content: "Live Location — Sakhi" },
      { property: "og:description", content: "A Sakhi user is sharing their live location with you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { token } = Route.useParams();

  const share = useQuery({
    queryKey: ["public-share", token],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_shares")
        .select("latitude, longitude, accuracy, last_ping_at, reason, is_active, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const data = share.data;
  const hasPoint = data?.latitude != null && data?.longitude != null;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-2xl items-center gap-2 px-5 py-5">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <span className="font-semibold tracking-tight">Sakhi</span>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16">
        <h1 className="text-2xl font-semibold tracking-tight">Live location</h1>
        {share.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : !data ? (
          <p className="mt-2 text-sm text-muted-foreground">
            This sharing link has ended or is no longer valid.
          </p>
        ) : (
          <>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Radio className="h-4 w-4 animate-pulse text-destructive" />
              {data.reason === "sos"
                ? "Shared automatically after an SOS alert."
                : data.reason === "checkin"
                  ? "Shared while a safe-arrival timer is running."
                  : "Shared manually."}
            </div>
            {hasPoint ? (
              <>
                <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                  <iframe
                    title="Live location map"
                    src={osmEmbedUrl(data.latitude as number, data.longitude as number)}
                    className="h-96 w-full"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {(data.latitude as number).toFixed(5)}, {(data.longitude as number).toFixed(5)}
                  </span>
                  {data.last_ping_at && <span>· updated {new Date(data.last_ping_at).toLocaleTimeString()}</span>}
                  <a
                    className="text-primary underline"
                    href={`https://www.openstreetmap.org/directions?to=${data.latitude}%2C${data.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Directions
                  </a>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Waiting for the first location update…</p>
            )}
            <p className="mt-6 text-xs text-muted-foreground">
              This page refreshes every 5 seconds. It stops working when sharing ends.
            </p>
          </>
        )}
      </main>
    </div>
  );
}