import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Mic,
  MessageCircle,
  BrainCircuit,
  Flame,
  Sparkles,
  Check,
  ChevronRight,
} from "lucide-react";
import { MarketingFooter, MarketingHeader, Reveal } from "@/components/Marketing";
import { supabase } from "@/integrations/supabase/client";
import shotMap from "@/assets/shot-map.jpg";
import shotSpeak from "@/assets/shot-speak.jpg";
import shotTalk from "@/assets/shot-talk.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Habla — Learn a Language by Actually Talking" },
      {
        name: "description",
        content:
          "Speak Spanish from day one. Habla gives you a tutor with a real personality, live roleplay in cafés and pharmacies, and instant pronunciation feedback.",
      },
      { property: "og:title", content: "Habla — Learn a Language by Actually Talking" },
      {
        property: "og:description",
        content:
          "A speech-first language app: daily lessons, real-life roleplay and instant pronunciation feedback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Mic,
    title: "You speak in the first minute",
    body: "Every new word is said out loud, then you repeat it. Your pronunciation is graded instantly and you keep going until it sticks.",
  },
  {
    icon: MessageCircle,
    title: "Real places, real conversations",
    body: "Order in a café, work a pharmacy counter, catch a train. Background sound and a native speaker who answers whatever you say.",
  },
  {
    icon: BrainCircuit,
    title: "It remembers your mistakes",
    body: "Anything you fumble comes back tomorrow, then in two days, then a week — until you own it.",
  },
  {
    icon: Flame,
    title: "Built to keep you coming back",
    body: "Streaks, daily check-ins, XP, leagues and a tutor who reacts to every win. Finish one thing and the next is already waiting.",
  },
];

const STEPS = [
  { n: "1", t: "Pick your tutor", d: "Sofía, Lucía, Valentina or Camila — each teaches in their own accent and style." },
  { n: "2", t: "Say your first word", d: "A guided walkthrough takes you through your very first recording." },
  { n: "3", t: "Use it the same day", d: "Every lesson ends in a live roleplay where you apply exactly what you just learned." },
];

const FAQ = [
  {
    q: "Do I need to know any Spanish?",
    a: "No. Day one starts at hello, with the audio, translation and grammar note one tap away on every word.",
  },
  {
    q: "What if I'm shy about speaking?",
    a: "You practise alone with your tutor. You can also type instead of speaking, and edit what was heard before sending it.",
  },
  {
    q: "How long does a day take?",
    a: "You choose: from a quick 10 minutes to a full 30-minute session, and you can change it any time.",
  },
  {
    q: "Does my progress follow me?",
    a: "Yes. Your account syncs across devices, and you can export a full backup of everything whenever you want.",
  },
];

const SHOTS = [
  { src: shotMap, alt: "Habla lesson path with checkpoints, streak and XP" },
  { src: shotSpeak, alt: "Speaking practice screen with microphone and pronunciation score" },
  { src: shotTalk, alt: "Café roleplay conversation with a native tutor" },
];

function LandingPage() {
  const navigate = useNavigate();
  // Signed-in visitors skip the pitch and go straight back into their course.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) void navigate({ to: "/start" });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="topo min-h-[100dvh]">
      <MarketingHeader />

      <main className="mx-auto max-w-md px-5">
        {/* Hero */}
        <section className="pb-2 pt-8 text-center">
          <p className="pop-in inline-flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1 text-[11px] font-extrabold text-secondary">
            <Sparkles className="h-3.5 w-3.5" /> Speech-first Spanish
          </p>
          <h1 className="mt-4 text-[2rem] font-extrabold leading-[1.1] text-foreground">
            Learn a language by <span className="text-primary">actually talking</span>.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Habla gives you a tutor with a real personality, daily lessons you finish in minutes,
            and live roleplay where you order the coffee yourself.
          </p>
          <div className="mt-6 space-y-2">
            <Link
              to="/auth"
              className="btn-3d block w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground"
            >
              Start free — speak today
            </Link>
            <Link
              to="/auth"
              className="block w-full rounded-2xl border-2 border-border bg-card py-3 text-sm font-extrabold"
            >
              I already have an account
            </Link>
          </div>
          <p className="mt-3 text-[11px] font-bold text-muted-foreground">
            No card needed · Works in your browser · Your progress syncs
          </p>

          <Reveal className="mt-8" delay={80}>
            <div className="relative mx-auto w-[76%]">
              <div className="absolute -inset-6 -z-10 rounded-full bg-primary/10 blur-2xl" />
              <img
                src={shotMap}
                alt="Habla lesson path with checkpoints, streak and XP"
                width={640}
                height={1280}
                className="w-full rounded-[2rem] border-4 border-border bg-card shadow-[0_18px_0_-6px_var(--border),0_40px_60px_-30px_rgba(0,0,0,.45)]"
              />
            </div>
          </Reveal>
        </section>

        {/* Proof strip */}
        <Reveal className="mt-10">
          <ul className="grid grid-cols-3 gap-2 text-center">
            {[
              { k: "4", v: "native tutors" },
              { k: "28", v: "guided days" },
              { k: "10 min", v: "a day is enough" },
            ].map((s) => (
              <li key={s.v} className="card-soft px-2 py-3">
                <p className="text-base font-extrabold text-primary">{s.k}</p>
                <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">{s.v}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Features */}
        <section className="mt-12">
          <Reveal>
            <h2 className="text-xl font-extrabold">Why it works</h2>
          </Reveal>
          <div className="mt-4 space-y-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 70}>
                  <article className="paper-card flex gap-3 p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <h3 className="text-sm font-extrabold">{f.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
                    </span>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* App shots */}
        <section className="mt-12">
          <Reveal>
            <h2 className="text-xl font-extrabold">Take a look inside</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Swipe through the lesson path, speaking drills and live roleplay.
            </p>
          </Reveal>
          <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3">
            {SHOTS.map((s, i) => (
              <Reveal key={s.alt} delay={i * 80} className="shrink-0 snap-center">
                <img
                  src={s.src}
                  alt={s.alt}
                  width={640}
                  height={1280}
                  loading="lazy"
                  className="h-[420px] w-auto rounded-[1.75rem] border-4 border-border bg-card shadow-[0_14px_0_-6px_var(--border)]"
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-12">
          <Reveal>
            <h2 className="text-xl font-extrabold">Your first day</h2>
          </Reveal>
          <ol className="mt-4 space-y-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 70}>
                <li className="flex gap-3 rounded-2xl border-2 border-border bg-card p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-extrabold text-secondary-foreground">
                    {s.n}
                  </span>
                  <span>
                    <p className="text-sm font-extrabold">{s.t}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.d}</p>
                  </span>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* What you get */}
        <Reveal className="mt-12">
          <section className="paper-card p-5">
            <h2 className="text-lg font-extrabold">Everything included</h2>
            <ul className="mt-3 space-y-2">
              {[
                "Guided daily lessons with mastery checkpoints",
                "Instant pronunciation grading on every phrase",
                "Café, party, station, airport and pharmacy roleplay",
                "Tap any word for translation, grammar and audio",
                "Spaced review that targets your own mistakes",
                "Streaks, check-ins, leagues and weekly recall",
                "Full data export and restore",
              ].map((l) => (
                <li key={l} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        {/* FAQ */}
        <section className="mt-12">
          <Reveal>
            <h2 className="text-xl font-extrabold">Questions</h2>
          </Reveal>
          <div className="mt-4 space-y-3">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <details className="card-soft group p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-extrabold">
                    {f.q}
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <Reveal className="mt-12">
          <section className="rounded-3xl border-2 border-primary/40 bg-primary/10 p-6 text-center">
            <h2 className="text-xl font-extrabold">Say your first Spanish sentence tonight</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Setup takes three minutes. Your tutor is waiting.
            </p>
            <Link
              to="/auth"
              className="btn-3d mt-5 block w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground"
            >
              Create my free account
            </Link>
          </section>
        </Reveal>
      </main>

      <MarketingFooter />
    </div>
  );
}
