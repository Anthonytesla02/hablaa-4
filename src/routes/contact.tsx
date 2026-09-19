import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, LifeBuoy, ShieldCheck } from "lucide-react";
import { MarketingPage } from "@/components/Marketing";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Support — Habla" },
      {
        name: "description",
        content: "Get help with your Habla account, report a problem with a lesson, or ask a privacy question.",
      },
      { property: "og:title", content: "Contact & Support — Habla" },
      { property: "og:description", content: "Reach the Habla team for help with your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

const ROWS = [
  {
    icon: LifeBuoy,
    title: "Help with the app",
    body: "Lesson not unlocking, audio not playing, microphone trouble — tell us what you were doing and which lesson.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy and data",
    body: "Data export, deletion or any question about how your practice is processed.",
  },
  {
    icon: Mail,
    title: "Everything else",
    body: "Partnerships, feedback, or a language you want us to add next.",
  },
];

function ContactPage() {
  return (
    <MarketingPage>
      <h1 className="text-2xl font-extrabold">Contact & support</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We read everything. Write to the address below and include the email you signed up with.
      </p>

      <a
        href="mailto:hola@habla.app"
        className="btn-3d mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground"
      >
        <Mail className="h-4 w-4" /> hola@habla.app
      </a>

      <div className="mt-6 space-y-3">
        {ROWS.map((r) => {
          const Icon = r.icon;
          return (
            <section key={r.title} className="paper-card flex gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/20 text-secondary">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-extrabold">{r.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{r.body}</span>
              </span>
            </section>
          );
        })}
      </div>

      <Link
        to="/auth"
        className="mt-6 block rounded-2xl border-2 border-border bg-card py-3 text-center text-sm font-extrabold"
      >
        Back to the app
      </Link>
    </MarketingPage>
  );
}
