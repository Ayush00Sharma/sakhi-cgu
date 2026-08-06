import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Siren, MapPin, Users, Timer, PhoneCall } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sakhi — Personal Safety Companion for Women" },
      {
        name: "description",
        content:
          "Sakhi is a women's safety app with a one-tap SOS alert, live location capture, trusted contacts and a safe-arrival check-in timer.",
      },
      { property: "og:title", content: "Sakhi — Personal Safety Companion for Women" },
      {
        property: "og:description",
        content:
          "One-tap SOS, trusted contacts, location capture and check-in timers. Help is always one tap away.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Siren, title: "One-tap SOS", body: "Trigger an emergency alert instantly, even with a shaking hand." },
  { icon: MapPin, title: "Location capture", body: "Your coordinates are attached to every alert you raise." },
  { icon: Users, title: "Trusted circle", body: "Keep the people who matter one tap away, ranked by priority." },
  { icon: Timer, title: "Safe-arrival timer", body: "Start a countdown. Miss it and an alert is logged automatically." },
  { icon: PhoneCall, title: "Quick dial", body: "Call police, women's helpline or your contacts from one screen." },
  { icon: ShieldCheck, title: "Private by design", body: "Only you can read your contacts, alerts and location history." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">Sakhi</span>
        </div>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="py-12 sm:py-20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Safety companion</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Help is always one tap away.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Sakhi turns your phone into a personal safety net — an instant SOS alert with your location,
            a trusted circle of contacts and a check-in timer that watches over your journey home.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-full bg-destructive px-7 py-3 text-base font-semibold text-destructive-foreground shadow-lg transition-transform hover:scale-[1.02]"
            >
              Get protected
            </Link>
            <a
              href="#features"
              className="rounded-full border border-border px-7 py-3 text-base font-medium transition-colors hover:bg-accent"
            >
              How it works
            </a>
          </div>
        </section>

        <section id="features" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          Sakhi supports you, but it is not a replacement for emergency services. In immediate danger, call your
          local emergency number.
        </p>
      </main>
    </div>
  );
}
