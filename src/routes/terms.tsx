import { createFileRoute } from "@tanstack/react-router";
import { LegalBody, MarketingPage } from "@/components/Marketing";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Habla" },
      {
        name: "description",
        content: "The rules for using Habla: your account, acceptable use, subscriptions and liability.",
      },
      { property: "og:title", content: "Terms of Service — Habla" },
      { property: "og:description", content: "The agreement between you and Habla." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <MarketingPage>
      <LegalBody
        title="Terms of Service"
        updated="9 September 2026"
        intro="By creating an account or using Habla you agree to these terms. Please read them; they explain what you can expect from us and what we expect from you."
        sections={[
          {
            h: "1. Your account",
            p: [
              "You need an account to use the learning features. Keep your sign-in details private — you are responsible for activity that happens under your account.",
              "You must be at least 13 years old, or the minimum age required in your country, to create an account.",
            ],
          },
          {
            h: "2. Using Habla",
            p: [
              "Habla is for personal language learning. Don't misuse the service: no scraping, reverse engineering, reselling access, abusive content, or attempts to disrupt other learners.",
              "Speaking practice and feedback are generated automatically. They are a learning aid, not certified language assessment or professional advice.",
            ],
          },
          {
            h: "3. Your content",
            p: [
              "You keep ownership of the recordings and text you submit. You grant us permission to process them so we can transcribe, grade and respond to your practice.",
            ],
          },
          {
            h: "4. Availability and changes",
            p: [
              "We improve the app continuously, so features may change, move or be removed. We may suspend accounts that breach these terms.",
            ],
          },
          {
            h: "5. Liability",
            p: [
              "Habla is provided as is. To the extent permitted by law we are not liable for indirect or consequential loss arising from use of the service.",
            ],
          },
          {
            h: "6. Contact",
            p: ["Questions about these terms can be sent through the contact page."],
          },
        ]}
      />
    </MarketingPage>
  );
}
