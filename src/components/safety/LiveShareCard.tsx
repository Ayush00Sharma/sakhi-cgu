import { Copy, Radio, Share2, Square } from "lucide-react";
import { toast } from "sonner";

import { shareUrl, type LocationShare } from "@/hooks/useLiveShare";
import { osmEmbedUrl } from "@/lib/geo";
import { Button } from "@/components/ui/button";

type Props = {
  share: LocationShare | null;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function LiveShareCard({ share, busy, onStart, onStop }: Props) {
  const url = share ? shareUrl(share.token) : "";

  async function copyLink() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "My live location — Sakhi", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Live location link copied.");
    } catch {
      toast.error("Could not share the link — copy it manually.");
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Radio className={`h-5 w-5 ${share ? "animate-pulse text-destructive" : "text-primary"}`} />
        <h2 className="font-semibold">Live location sharing</h2>
        {share && (
          <span className="ml-auto rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            Live
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Share a link that shows your location on a map, refreshing every few seconds. Anyone with the link can open it —
        no app needed.
      </p>

      {share ? (
        <>
          {share.latitude !== null && share.longitude !== null && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <iframe
                title="Your live location"
                src={osmEmbedUrl(share.latitude, share.longitude)}
                className="h-48 w-full"
                loading="lazy"
              />
            </div>
          )}
          <p className="mt-3 break-all rounded-xl bg-accent/60 px-4 py-3 text-xs text-muted-foreground">{url}</p>
          <div className="mt-3 flex gap-2">
            <Button size="lg" className="flex-1" onClick={copyLink}>
              <Copy className="mr-1.5 h-4 w-4" /> Share link
            </Button>
            <Button size="lg" variant="outline" onClick={onStop} disabled={busy}>
              <Square className="mr-1.5 h-4 w-4" /> Stop
            </Button>
          </div>
        </>
      ) : (
        <Button size="lg" className="mt-4 h-12 w-full" onClick={onStart} disabled={busy}>
          <Share2 className="mr-1.5 h-4 w-4" /> Start live sharing
        </Button>
      )}
    </section>
  );
}