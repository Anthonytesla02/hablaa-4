import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { PERSONALITIES, ROAST_LEVELS, charactersFor } from "@/lib/companions";
import { useCompanion } from "@/lib/use-companion";
import { sfx } from "@/lib/sfx";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/companion")({
  head: () => ({
    meta: [
      { title: "Choose Your Language Partner — Habla" },
      {
        name: "description",
        content:
          "Pick who teaches you: a patient tutor, a Gen Z classmate, a drill sergeant or a native from Mexico, Spain, Colombia or Argentina. Their personality changes how you're taught.",
      },
      { property: "og:title", content: "Choose Your Language Partner" },
      {
        property: "og:description",
        content: "Personality, dialect, slang and roast level — your partner, your rules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Hydrated>
      <CompanionPage />
    </Hydrated>
  ),
});

function CompanionPage() {
  const navigate = useNavigate();
  const setCompanion = useApp((s) => s.setCompanion);
  const langId = useApp((s) => s.profile?.langId ?? "spanish");
  const { config, character, personality } = useCompanion();

  const roster = charactersFor(langId);
  const [charId, setCharId] = useState(config?.characterId ?? character?.id ?? roster[0]!.id);
  const [persId, setPersId] = useState(config?.personalityId ?? personality.id);
  const [slang, setSlang] = useState(config?.slang ?? 1);
  const [roast, setRoast] = useState(config?.roast ?? 1);
  const [localMode, setLocalMode] = useState(config?.localMode ?? true);
  const [noTranslate, setNoTranslate] = useState(config?.noTranslate ?? false);

  const chosen = roster.find((c) => c.id === charId) ?? roster[0]!;

  function confirm() {
    sfx("levelup");
    setCompanion({
      characterId: charId,
      personalityId: persId,
      slang,
      roast,
      localMode,
      noTranslate,
    });
    void navigate({ to: "/simulate" });
  }

  return (
    <AppFrame>
      <p className="hud text-[10px] text-destructive">FIELD CONTACT</p>
      <h1 className="hud mt-1 text-lg">MEET A NATIVE</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        You're not picking a voice. You're picking who you talk to every day.
      </p>

      <section className="mt-5">
        <p className="hud text-[10px] text-muted-foreground">WHO YOU'LL TALK TO</p>
        <ul className="mt-2 space-y-2">
          {roster.map((c) => {
            const active = c.id === charId;
            return (
              <li key={c.id}>
                <button
                  onClick={() => {
                    sfx("tap");
                    setCharId(c.id);
                  }}
                  className={`w-full rounded-sm border px-3 py-3 text-left ${
                    active ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  <span className="hud flex items-center gap-2 text-[11px]">
                    <span className="text-base">{c.flag}</span>
                    {c.name.toUpperCase()} · {c.age}
                    {active && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">{c.region}</span>
                  <span className="mt-1 block text-[11px]">{c.bio}</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">{c.teaches}</span>
                  {c.interjectOnly && (
                    <span className="hud mt-1.5 inline-block rounded-sm border border-secondary/60 bg-secondary/15 px-1.5 py-0.5 text-[8px] text-secondary">
                      ONLY SPEAKS UP WHEN YOU SLIP
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <p className="hud text-[10px] text-muted-foreground">HOW THEY TEACH</p>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {PERSONALITIES.map((p) => {
            const active = p.id === persId;
            return (
              <li key={p.id}>
                <button
                  onClick={() => {
                    sfx("tap");
                    setPersId(p.id);
                    setSlang(p.slang);
                  }}
                  className={`h-full w-full rounded-sm border px-2.5 py-2.5 text-left ${
                    active ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  <span className="block text-base leading-none">{p.emoji}</span>
                  <span className="hud mt-1 block text-[10px]">{p.label.toUpperCase()}</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">{p.tagline}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 space-y-4 rounded-sm border border-border bg-card p-3">
        <Dial label="SLANG LEVEL" value={slang} onChange={setSlang} names={["Textbook", "Light", "Real", "Street"]} />
        <Dial
          label="ROAST MY SPANISH"
          value={roast}
          onChange={setRoast}
          names={ROAST_LEVELS.map((r) => r.label)}
        />
        <Toggle
          label="TALK LIKE A LOCAL"
          note="Teaches ¿qué tal? over ¿cómo está usted? and tells you why."
          on={localMode}
          set={setLocalMode}
        />
        <Toggle
          label="DON'T TRANSLATE"
          note="No English unless you ask. They rephrase in simpler target language instead."
          on={noTranslate}
          set={setNoTranslate}
        />
      </section>

      <button
        onClick={confirm}
        className="hud mt-6 w-full rounded-sm bg-primary px-4 py-3 text-[11px] text-primary-foreground"
      >
        START TALKING TO {chosen.name.toUpperCase()}
      </button>
    </AppFrame>
  );
}

function Dial({
  label,
  value,
  onChange,
  names,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  names: string[];
}) {
  return (
    <div>
      <p className="hud text-[10px] text-muted-foreground">{label}</p>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {names.map((n, i) => (
          <button
            key={n}
            onClick={() => {
              sfx("tap");
              onChange(i);
            }}
            className={`hud rounded-sm border px-1 py-2 text-[9px] ${
              value === i ? "border-primary bg-primary/15 text-primary" : "border-border"
            }`}
          >
            {n.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  note,
  on,
  set,
}: {
  label: string;
  note: string;
  on: boolean;
  set: (b: boolean) => void;
}) {
  return (
    <button
      onClick={() => {
        sfx("tap");
        set(!on);
      }}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left"
    >
      <span className="min-w-0">
        <span className="hud block text-[10px]">{label}</span>
        <span className="mt-0.5 block text-[10px] text-muted-foreground">{note}</span>
      </span>
      <span
        className={`h-5 w-9 shrink-0 rounded-full border transition-colors ${
          on ? "border-primary bg-primary/30" : "border-border bg-muted"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full transition-transform ${
            on ? "translate-x-4 bg-primary" : "translate-x-0.5 bg-muted-foreground"
          } mt-[1px]`}
        />
      </span>
    </button>
  );
}
