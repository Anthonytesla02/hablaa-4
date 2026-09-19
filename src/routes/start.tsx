import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import llamaAvatar from "@/assets/habla-llama.png";
import { Button } from "@/components/ui/button";
import { charactersFor } from "@/lib/companions";
import {
  authoredLanguages,
  languages,
  onboarding,
  projectedLevel,
} from "@/lib/content";
import { syncToCloud } from "@/lib/cloud-sync";
import { sfx } from "@/lib/sfx";
import { useApp } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Personalize Your Spanish Course — Habla" },
      {
        name: "description",
        content: "Answer a few quick questions and get a speaking plan built around your goals.",
      },
      { property: "og:title", content: "Personalize Your Spanish Course — Habla" },
      {
        property: "og:description",
        content: "Choose your language, tutor, goal and daily pace before your first Habla lesson.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = [
  "Your name",
  "Discovery",
  "Language",
  "Starting point",
  "Your tutor",
  "Your goal",
  "Your timeline",
  "Daily practice",
  "Your plan",
] as const;

const DISCOVERY_OPTIONS = [
  { id: "google", label: "Google Search", icon: "🔎" },
  { id: "friends", label: "Friends or family", icon: "👥" },
  { id: "social", label: "Instagram or TikTok", icon: "📱" },
  { id: "youtube", label: "YouTube", icon: "▶️" },
  { id: "article", label: "News, article or blog", icon: "📰" },
  { id: "other", label: "Something else", icon: "✨" },
] as const;

const LEVEL_OPTIONS = [
  { id: "new", label: "I’m brand new", note: "Start with the essentials", icon: "🌱" },
  { id: "some", label: "I know a few words", note: "Build simple sentences", icon: "💬" },
  { id: "basic", label: "I can have basic chats", note: "Strengthen everyday speaking", icon: "🗣️" },
  { id: "confident", label: "I’m already conversational", note: "Practice speed and nuance", icon: "🚀" },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const profile = useApp((state) => state.profile);
  const setProfile = useApp((state) => state.setProfile);
  const setCompanion = useApp((state) => state.setCompanion);
  const [authChecked, setAuthChecked] = useState(false);
  const [step, setStep] = useState(0);
  const [callsign, setCallsign] = useState("");
  const [discoverySource, setDiscoverySource] = useState("");
  const [langId, setLangId] = useState("spanish");
  const [startingLevel, setStartingLevel] = useState("");
  const [tutorId, setTutorId] = useState("sofia");
  const [personaId, setPersonaId] = useState("undercover_traveler");
  const [timelineId, setTimelineId] = useState("standard_90");
  const [tierId, setTierId] = useState("field_op_30");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setAuthChecked(true);
      if (!data.session) {
        void navigate({ to: "/auth" });
        return;
      }
      if (profile) void navigate({ to: "/dashboard" });
    })();
  }, [navigate, profile]);

  const roster = charactersFor(langId);
  const tutor = roster.find((character) => character.id === tutorId) ?? roster[0];
  const projection = projectedLevel(langId, timelineId, tierId);
  const progress = ((step + 1) / STEPS.length) * 100;

  useEffect(() => {
    if (tutor && !roster.some((character) => character.id === tutorId)) {
      setTutorId(tutor.id);
    }
  }, [roster, tutor, tutorId]);

  const canAdvance =
    (step !== 0 || callsign.trim().length > 0) &&
    (step !== 1 || discoverySource.length > 0) &&
    (step !== 3 || startingLevel.length > 0) &&
    (step !== 4 || Boolean(tutor));

  function select(setter: (value: string) => void, value: string) {
    sfx("tap");
    setter(value);
  }

  function back() {
    sfx("tap");
    if (step > 0) setStep((current) => current - 1);
    else void navigate({ to: "/auth", search: { view: "signup" } });
  }

  async function next() {
    if (!canAdvance) return;
    sfx("click");
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    if (!tutor) return;

    setProfile({
      callsign: callsign.trim(),
      langId,
      timelineId,
      tierId,
      personaId,
      discoverySource,
      startingLevel,
      startedAt: Date.now(),
    });
    setCompanion({
      characterId: tutor.id,
      personalityId: tutor.personalityId,
      slang: 1,
      roast: 1,
      localMode: true,
      noTranslate: false,
    });
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id) void syncToCloud(data.session.user.id);
    void navigate({ to: "/dashboard" });
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background">
        <img src={llamaAvatar} alt="Habla is getting ready" className="handler-idle h-24 w-24 object-contain" />
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] justify-center bg-background text-foreground">
      <div className="flex h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex shrink-0 items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={back} aria-label="Go back" className="shrink-0 rounded-full text-muted-foreground">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            <div className="h-full rounded-full bg-secondary transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-8 text-right text-xs font-black text-muted-foreground">{step + 1}/{STEPS.length}</span>
        </header>

        <section key={step} className="step-in flex min-h-0 flex-1 flex-col pt-5">
          <div className="flex shrink-0 items-center gap-3">
            <img src={llamaAvatar} alt="Habla" className="h-16 w-16 shrink-0 object-contain" />
            <div className="relative rounded-2xl border-2 border-border bg-card px-4 py-3">
              <span aria-hidden="true" className="absolute -left-2 top-6 h-4 w-4 rotate-45 border-b-2 border-l-2 border-border bg-card" />
              <p className="text-sm font-extrabold leading-snug">{promptForStep(step, callsign)}</p>
            </div>
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-4">
            {step === 0 && (
              <label className="block pt-6">
                <span className="sr-only">Your name</span>
                <input autoFocus value={callsign} onChange={(event) => setCallsign(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && callsign.trim()) void next(); }} placeholder="Your name" maxLength={24} className="h-16 w-full rounded-2xl border-2 border-input bg-card px-5 text-lg font-extrabold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <p className="mt-3 text-center text-xs font-bold text-muted-foreground">This is how your tutor will greet you.</p>
              </label>
            )}

            {step === 1 && <OptionList options={DISCOVERY_OPTIONS} value={discoverySource} onSelect={(value) => select(setDiscoverySource, value)} />}

            {step === 2 && (
              <div className="space-y-3">
                {languages.map((language) => {
                  const available = authoredLanguages.includes(language.id);
                  return <ChoiceButton key={language.id} value={language.id} selected={langId === language.id} disabled={!available} onSelect={(value) => select(setLangId, value)} icon={language.flag_emoji} label={language.label} note={available ? "Ready to learn" : "Coming soon"} />;
                })}
              </div>
            )}

            {step === 3 && <OptionList options={LEVEL_OPTIONS} value={startingLevel} onSelect={(value) => select(setStartingLevel, value)} />}

            {step === 4 && (
              <div className="space-y-3">
                {roster.map((character) => (
                  <Button key={character.id} type="button" variant="outline" onClick={() => select(setTutorId, character.id)} className={`h-auto w-full justify-start whitespace-normal rounded-2xl border-2 p-3 text-left ${tutorId === character.id ? "border-primary bg-primary/10" : "bg-card"}`}>
                    <img src={character.avatar} alt="" className="h-16 w-16 shrink-0 rounded-full border-2 border-border bg-muted object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center text-sm font-black">{character.name} · {character.age}{tutorId === character.id && <Check className="ml-auto h-5 w-5 text-primary" />}</span>
                      <span className="mt-0.5 block text-xs font-bold text-secondary">{character.region}</span>
                      <span className="mt-1 block text-xs leading-snug text-muted-foreground">{character.teaches}</span>
                    </span>
                  </Button>
                ))}
              </div>
            )}

            {step === 5 && <OptionList options={onboarding.operational_personas.map((item) => ({ id: item.id, label: item.label, note: item.description, icon: goalIcon(item.id) }))} value={personaId} onSelect={(value) => select(setPersonaId, value)} />}
            {step === 6 && <OptionList options={onboarding.goal_timelines.map((item) => ({ id: item.id, label: item.label, note: `${item.days} days to build a lasting speaking habit`, icon: item.days <= 60 ? "⚡" : "🎯" }))} value={timelineId} onSelect={(value) => select(setTimelineId, value)} />}
            {step === 7 && <OptionList options={onboarding.daily_commitment_tiers.map((item) => ({ id: item.id, label: `${item.label} · ${item.minutes} min`, note: `About ${item.approx_new_items_per_session} new phrases each session`, icon: item.minutes <= 10 ? "☕" : item.minutes <= 30 ? "🌤️" : "🔥" }))} value={tierId} onSelect={(value) => select(setTierId, value)} />}

            {step === 8 && tutor && (
              <div className="rounded-2xl border-2 border-border bg-card p-5 text-center shadow-sm">
                <img src={tutor.avatar} alt={tutor.name} className="mx-auto h-24 w-24 rounded-full border-2 border-primary object-cover" />
                <h1 className="mt-3 text-xl font-black">Your plan is ready, {callsign.trim()}!</h1>
                <p className="mt-2 text-sm text-muted-foreground"><strong className="text-foreground">{tutor.name}</strong> will help you reach <strong className="text-foreground">{projection.codename}</strong> with daily speaking practice.</p>
                <dl className="mt-5 divide-y divide-border rounded-xl bg-muted/60 px-4 text-left text-sm">
                  <SummaryRow label="Language" value={languages.find((language) => language.id === langId)?.label ?? langId} />
                  <SummaryRow label="Starting point" value={LEVEL_OPTIONS.find((level) => level.id === startingLevel)?.label ?? "New learner"} />
                  <SummaryRow label="Goal" value={onboarding.operational_personas.find((goal) => goal.id === personaId)?.label ?? "Everyday speaking"} />
                  <SummaryRow label="Daily practice" value={onboarding.daily_commitment_tiers.find((tier) => tier.id === tierId)?.label ?? "Steady"} />
                </dl>
              </div>
            )}
          </div>
        </section>

        <div className="shrink-0 border-t border-border bg-background pt-4">
          <Button type="button" onClick={() => void next()} disabled={!canAdvance} className="btn-3d h-14 w-full rounded-2xl text-sm font-black uppercase">
            {step === STEPS.length - 1 ? "Start my first lesson" : "Continue"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function promptForStep(step: number, name: string) {
  return [
    "First, what should I call you?",
    `Nice to meet you${name.trim() ? `, ${name.trim()}` : ""}! How did you hear about Habla?`,
    "What language do you want to speak?",
    "How much do you already know?",
    "Who would you like to learn with?",
    "What do you most want to use the language for?",
    "How quickly do you want to get there?",
    "How much can you practice each day?",
    "Okay! Here’s the speaking plan I made for you.",
  ][step] ?? "Let’s set up your course.";
}

function goalIcon(id: string) {
  if (id.includes("traveler")) return "✈️";
  if (id.includes("corporate")) return "💼";
  if (id.includes("resident")) return "🏡";
  if (id.includes("academic")) return "🎓";
  if (id.includes("humanitarian")) return "🤝";
  return "🌍";
}

type Option = { id: string; label: string; note?: string; icon?: ReactNode };

function OptionList({ options, value, onSelect }: { options: readonly Option[]; value: string; onSelect: (value: string) => void }) {
  return <div className="space-y-3">{options.map((option) => <ChoiceButton key={option.id} {...option} value={option.id} selected={value === option.id} onSelect={onSelect} />)}</div>;
}

function ChoiceButton({ value, label, note, icon, selected, disabled = false, onSelect }: Omit<Option, "id"> & { value: string; selected: boolean; disabled?: boolean; onSelect: (value: string) => void }) {
  return (
    <Button type="button" variant="outline" disabled={disabled} aria-pressed={selected} onClick={() => onSelect(value)} className={`h-auto min-h-16 w-full justify-start whitespace-normal rounded-2xl border-2 px-4 py-3 text-left ${selected ? "border-primary bg-primary/10" : "bg-card"}`}>
      {icon && <span className="w-8 shrink-0 text-center text-xl" aria-hidden="true">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{label}</span>
        {note && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{note}</span>}
      </span>
      {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
    </Button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-extrabold">{value}</dd></div>;
}