import { createFileRoute } from "@tanstack/react-router";
import { LegalBody, MarketingPage } from "@/components/Marketing";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Habla" },
      {
        name: "description",
        content: "What Habla collects, how your voice recordings and progress are used, and the choices you have.",
      },
      { property: "og:title", content: "Privacy Policy — Habla" },
      { property: "og:description", content: "How Habla handles your data and voice practice." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <MarketingPage>
      <LegalBody
        title="Privacy Policy"
        updated="9 September 2026"
        intro="This policy explains what information Habla collects, why we need it, and how you stay in control of it."
        sections={[
          {
            h: "What we collect",
            p: [
              "Account details: your email address and sign-in method.",
              "Learning data: your chosen language and tutor, lesson progress, practice cards, streaks, XP and session history.",
              "Speaking practice: the words you speak are turned into text on your device or by our speech service so they can be graded. We do not build a voice profile of you.",
            ],
          },
          {
            h: "Why we use it",
            p: [
              "To run your course, grade your pronunciation, adapt review timing to what you keep forgetting, and sync your progress across your devices.",
            ],
          },
          {
            h: "Who can see it",
            p: [
              "Your data is stored in our managed cloud backend and is accessible only to your signed-in account. Automated language feedback is produced by AI model providers that process the text of your practice; they do not use it to identify you.",
              "We never sell your data.",
            ],
          },
          {
            h: "Your choices",
            p: [
              "You can export a full copy of your data from Backup & Restore inside the app, reset your progress from your profile, or ask us to delete your account entirely.",
              "Microphone access is only used while you are actively recording a practice answer, and your browser asks for permission first.",
            ],
          },
          {
            h: "Retention",
            p: [
              "We keep your learning data for as long as your account exists. Deleting your account removes it.",
            ],
          },
          {
            h: "Contact",
            p: ["For any privacy request, reach us through the contact page."],
          },
        ]}
      />
    </MarketingPage>
  );
}
