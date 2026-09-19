import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import llamaAvatar from "@/assets/habla-llama.png";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/sfx";

export const Route = createFileRoute("/introduction")({
  head: () => ({
    meta: [
      { title: "Meet Habla — Your Language Guide" },
      {
        name: "description",
        content: "Meet Habla, your friendly guide, before setting up your first speaking lesson.",
      },
      { property: "og:title", content: "Meet Habla — Your Language Guide" },
      {
        property: "og:description",
        content: "Meet your guide and get ready for your first Habla speaking lesson.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntroductionPage,
});

const INTRO_MESSAGES = [
  {
    text: "Hi there! I’m Habla!",
    alt: "Habla the llama waving hello",
  },
  {
    text: "Just a few quick questions before we start your first lesson!",
    alt: "Habla the llama ready to help",
  },
] as const;

function IntroductionPage() {
  const navigate = useNavigate({ from: "/introduction" });
  const [step, setStep] = useState(0);
  const message = INTRO_MESSAGES[step];

  function goBack() {
    sfx("tap");
    if (step > 0) {
      setStep(step - 1);
      return;
    }
    void navigate({ to: "/auth" });
  }

  function continueFlow() {
    sfx("click");
    if (step < INTRO_MESSAGES.length - 1) {
      setStep(step + 1);
      return;
    }
    void navigate({ to: "/auth", search: { view: "signup" } });
  }

  if (!message) return null;

  return (
    <main className="flex min-h-[100dvh] justify-center overflow-hidden bg-background text-foreground">
      <div className="flex w-full max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={step === 0 ? "Back to account options" : "Previous introduction"}
          onClick={goBack}
          className="rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-7 w-7" />
        </Button>

        <section
          key={step}
          className="step-in flex min-h-0 flex-1 flex-col items-center justify-center pb-10 text-center"
          aria-live="polite"
        >
          <div className="relative w-full max-w-sm rounded-[2rem] border-[3px] border-border bg-card px-6 py-5 shadow-sm">
            <p className="text-balance text-[1.35rem] font-bold leading-relaxed text-foreground">
              {message.text}
            </p>
            <span
              aria-hidden="true"
              className="absolute -bottom-[0.8rem] left-1/2 h-6 w-6 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-border bg-card"
            />
          </div>

          <div className="relative mt-8 grid h-48 w-48 place-items-center">
            <span
              aria-hidden="true"
              className="absolute bottom-3 h-14 w-36 rounded-[50%] bg-muted"
            />
            <img
              src={llamaAvatar}
              alt={message.alt}
              width={768}
              height={768}
              className="handler-idle relative z-10 h-44 w-44 object-contain"
            />
          </div>
        </section>

        <Button
          type="button"
          onClick={continueFlow}
          className="btn-3d h-14 w-full rounded-2xl text-sm font-black uppercase"
        >
          Continue
        </Button>
      </div>
    </main>
  );
}