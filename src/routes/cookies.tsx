import { createFileRoute } from "@tanstack/react-router";
import { LegalBody, MarketingPage } from "@/components/Marketing";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Habla" },
      {
        name: "description",
        content: "The small number of cookies and local storage keys Habla uses to keep you signed in and remember settings.",
      },
      { property: "og:title", content: "Cookie Policy — Habla" },
      { property: "og:description", content: "How Habla uses cookies and local storage." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <MarketingPage>
      <LegalBody
        title="Cookie Policy"
        updated="9 September 2026"
        intro="Habla uses a deliberately small set of cookies and browser storage. There is no advertising tracking."
        sections={[
          {
            h: "Essential",
            p: [
              "A session cookie keeps you signed in between visits. Without it you would have to sign in on every page.",
            ],
          },
          {
            h: "Preferences",
            p: [
              "Your device stores your learning progress, tutor choice, sound and caption settings so the app works instantly and offline-friendly.",
            ],
          },
          {
            h: "Analytics",
            p: [
              "We use aggregate, non-identifying usage counts to see which lessons people finish. No profiles are built and nothing is shared with advertisers.",
            ],
          },
          {
            h: "Managing cookies",
            p: [
              "You can clear cookies and site data in your browser settings at any time. Clearing them signs you out; your synced progress returns when you sign back in.",
            ],
          },
        ]}
      />
    </MarketingPage>
  );
}
