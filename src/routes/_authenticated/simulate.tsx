import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Coffee,
  UtensilsCrossed,
  PartyPopper,
  TrainFront,
  Plane,
  ShoppingBasket,
  Car,
  BedDouble,
  Pill,
  GraduationCap,
  CalendarCheck,
  AlertTriangle,
  Mic,
  Square,
  Keyboard,
  Loader2,
  Volume2,
  VolumeX,
  Send,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { Completion } from "@/components/Completion";
import { Glossed } from "@/components/Glossed";
import { Redaction } from "@/components/Redaction";
import { PlayButton } from "@/components/Audio";
import { AMBIENCE_LABELS, Ambience, type AmbienceId } from "@/lib/ambience";
import { simulateTurn, type SimReply } from "@/lib/simulate.functions";
import { checkUtterance, type CoachVerdict } from "@/lib/coach.functions";
import { ShareCard, type BattleStats } from "@/components/ShareCard";
import {
  ReactionGate,
  SEVERITY_LABEL,
  characterMoment,
  runningJoke,
  type Severity,
} from "@/lib/severity";
import { scoreSpeech } from "@/lib/voice/score";
import { useVoiceAnswer } from "@/lib/voice/use-voice-answer";
import { TalkButton } from "@/components/voice/VoiceAnswer";
import { translateUtterance } from "@/lib/translate.functions";
import { bcp47, langById } from "@/lib/content";
import { courseWeeks, lessonById } from "@/lib/course";
import { handlerReact, handlerSay } from "@/lib/handler-bus";
import { sfx } from "@/lib/sfx";
import { speak, stopSpeaking } from "@/lib/speech";
import { useApp } from "@/lib/store";
import { useCompanion } from "@/lib/use-companion";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/simulate")({
  validateSearch: (s: Record<string, unknown>): { daily?: string; weekly?: number } => {
    const daily = s['daily'] ? String(s['daily']) : undefined;
    const weekRaw = s['weekly'] ? Number(s['weekly']) : NaN;
    const out: { daily?: string; weekly?: number } = {};
    if (daily) out.daily = daily;
    if (Number.isFinite(weekRaw)) out.weekly = weekRaw;
    return out;
  },

  head: () => ({
    meta: [
      { title: "Conversation Practice — Habla" },
      {
        name: "description",
        content:
          "Live role-play simulations with ambient soundscapes: cafés, stations, airports and parties. Speak, listen and hold a real conversation in your target language.",
      },
      { property: "og:title", content: "Conversation Practice — Habla" },
      {
        property: "og:description",
        content: "Immersive AI role-play with matching background noise for each setting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Hydrated>
      <SimulatePage />
    </Hydrated>
  ),
});

type Scene = {
  id: AmbienceId;
  label: string;
  character: string;
  setting: string;
  goals: string[];
  minExchanges: number;
  icon: typeof Coffee;
  special?: boolean;
  daily?: boolean;
  weeklyWeek?: number;
};


const SCENES: Scene[] = [
  {
    id: "cafe",
    label: "Café",
    character: "barista behind the counter",
    setting: "a busy neighbourhood café at mid-morning; the learner is ordering",
    goals: [
      "greeting and how the learner's day is going",
      "asking what the learner wants, size and milk",
      "recommending the pastry of the day and taking that order",
      "a small complication: the card machine is slow or a drink has run out",
      "name for the cup, paying, and a warm goodbye",
    ],
    minExchanges: 10,
    icon: Coffee,
  },
  {
    id: "restaurant",
    label: "Restaurant",
    character: "waiter taking an order",
    setting: "a small family restaurant at dinner service; the learner is being seated and ordering",
    goals: [
      "greeting, how many people, choosing a table",
      "drinks and today's specials",
      "starters and mains, with a recommendation",
      "an allergy or substitution question",
      "dessert or coffee, then the bill and goodbye",
    ],
    minExchanges: 12,
    icon: UtensilsCrossed,
  },
  {
    id: "party",
    label: "Party",
    character: "friendly stranger at a house party",
    setting: "a crowded house party with music; small talk and introductions",
    goals: [
      "introductions and how each of you knows the host",
      "where you're both from and what you do",
      "hobbies, music and the weekend",
      "an invitation or plan for later",
      "swapping contacts and a goodbye",
    ],
    minExchanges: 12,
    icon: PartyPopper,
  },
  {
    id: "station",
    label: "Train station",
    character: "ticket office clerk",
    setting: "a main railway station; the learner needs a ticket and platform information",
    goals: [
      "greeting and destination",
      "date, time and one-way or return",
      "class, seat and price",
      "a complication: that train is full or delayed, so pick another",
      "platform, transfers and goodbye",
    ],
    minExchanges: 10,
    icon: TrainFront,
  },
  {
    id: "airport",
    label: "Airport",
    character: "check-in and border agent",
    setting: "an international airport terminal; check-in, baggage and arrival questions",
    goals: [
      "greeting, destination and documents",
      "baggage: how many bags, weight, carry-on",
      "seat preference and boarding details",
      "border questions: purpose of trip, length of stay, where you're staying",
      "final instructions and goodbye",
    ],
    minExchanges: 12,
    icon: Plane,
  },
  {
    id: "market",
    label: "Market",
    character: "market stall vendor",
    setting: "an open-air food market; buying produce, asking prices and quantities",
    goals: [
      "greeting and what's fresh today",
      "prices and quantities",
      "asking what to cook with it",
      "haggling or asking for a little extra",
      "paying, change and goodbye",
    ],
    minExchanges: 10,
    icon: ShoppingBasket,
  },
  {
    id: "taxi",
    label: "Taxi",
    character: "taxi driver",
    setting: "the back seat of a taxi in traffic; giving a destination and chatting",
    goals: [
      "destination and rough fare",
      "route choice and traffic",
      "small talk: where you're from, how long you're staying",
      "the driver's tips about the city",
      "arriving, paying and goodbye",
    ],
    minExchanges: 10,
    icon: Car,
  },
  {
    id: "hotel",
    label: "Hotel",
    character: "hotel receptionist",
    setting: "a quiet hotel lobby; checking in, asking about the room and the area",
    goals: [
      "greeting, name and reservation",
      "documents, nights and room type",
      "breakfast times, wifi and facilities",
      "a small problem with the room or a request",
      "directions in the neighbourhood, then goodbye",
    ],
    minExchanges: 12,
    icon: BedDouble,
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    character: "customer coming in with a health problem",
    setting:
      "a neighbourhood pharmacy counter; the LEARNER is the pharmacist on duty and must serve the customer, who explains symptoms, asks about medicine, dosage and price",
    goals: [
      "greeting the customer and asking how you can help",
      "listening to the symptoms and asking clarifying questions (how long, allergies, other medication)",
      "recommending a medicine and explaining what it is for",
      "explaining dosage, frequency and warnings",
      "a complication: the item is out of stock, needs a prescription, or the customer asks for a cheaper option",
      "taking payment, giving advice and a warm goodbye",
    ],
    minExchanges: 12,
    icon: Pill,
    special: true,
  },
];


/** Turns the lesson the learner just cleared into a bespoke practice scene. */
function dailyScene(lessonId: string): Scene | null {
  const l = lessonById(lessonId);
  if (!l) return null;
  const words = l.vocabulary.slice(0, 8).map((v) => v.es).join(", ");
  return {
    id: "cafe",
    label: `Field practice — ${l.title}`,
    character: "friendly local you have just met in the street",
    setting: `an everyday street-corner conversation used to practise today's lesson "${l.title}" (${l.focus}). Goal: ${l.mission}`,
    goals: [
      ...l.objectives.slice(0, 3),
      `keep steering the conversation so the learner reuses today's vocabulary: ${words}`,
      "wrap up warmly once they have used today's patterns confidently",
    ],
    minExchanges: 6,
    icon: GraduationCap,
    special: true,
    daily: true,
  };
}

/** Builds a recall simulation covering everything taught in a given week. */
function weeklyScene(week: number): Scene | null {
  const w = courseWeeks.find((x) => x.week === week);
  if (!w) return null;
  const words = w.lessons
    .flatMap((l) => l.vocabulary.slice(0, 5).map((v) => v.es))
    .slice(0, 24)
    .join(", ");
  const patterns = w.lessons.map((l) => l.focus).join("; ");
  return {
    id: "cafe",
    label: `Weekly recall — Week ${w.week}`,
    character: "old friend catching up with you over coffee",
    setting: `a relaxed catch-up conversation designed to recall everything from week ${w.week}: "${w.title}". Rotate through the week's topics rather than staying on one.`,
    goals: [
      `warm greeting and small talk reusing week ${w.week} patterns`,
      `work through these focuses one by one: ${patterns}`,
      `pull the learner into reusing this vocabulary: ${words}`,
      "throw in one unexpected twist that forces them to combine two of the week's patterns",
      "close with a recap of what they handled well",
    ],
    minExchanges: 12,
    icon: CalendarCheck,
    special: true,
    weeklyWeek: w.week,
  };
}



type Msg = {
  role: "user" | "character";
  text: string;
  translation?: string;
  feedback?: SimReply["feedback"];
};

function SimulatePage() {
  const { daily, weekly } = Route.useSearch();
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const addXp = useApp((s) => s.addXp);
  const completeWeeklyRecall = useApp((s) => s.completeWeeklyRecall);
  const noteMistake = useApp((s) => s.noteMistake);
  const mistakeMemory = useApp((s) => s.mistakeMemory);
  const {
    brief,
    character,
    personality,
    policy,
    coachLocale,
    interjectOnly,
    ready: hasCompanion,
  } = useCompanion();
  const [scene, setScene] = useState<Scene | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [stage, setStage] = useState("");
  const [objective, setObjective] = useState("");
  const [suggestions, setSuggestions] = useState<{ target: string; translation: string }[]>([]);
  const [thinking, setThinking] = useState(false);
  const onSpokenRef = useRef<(text: string) => void>(() => {});
  const onRetrySpokenRef = useRef<(text: string) => void>(() => {});
  const [heard, setHeard] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<{ text: string; translation: string } | null>(null);
  const [typed, setTyped] = useState("");
  const [useText, setUseText] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [turns, setTurns] = useState(0);
  const [correction, setCorrection] = useState<
    (CoachVerdict & { pending: string; history: Msg[]; roasted: boolean; moment: string }) | null
  >(null);
  /** Retry loop inside the correction: they must say it back before we continue. */
  const [retryText, setRetryText] = useState("");
  const [retryState, setRetryState] = useState<"idle" | "listening" | "ok" | "again">("idle");
  const [checking, setChecking] = useState(false);
  const [reward, setReward] = useState(0);
  const [crimes, setCrimes] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startedAt, setStartedAt] = useState(0);

  const ambienceRef = useRef<Ambience | null>(null);
  const stopListenRef = useRef<() => void>(() => {});
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const gateRef = useRef(new ReactionGate(policy));
  const cleanStreak = useRef(0);
  const struggling = useRef(false);

  const locale = bcp47(profile?.langId ?? "spanish");
  const language = langById(profile?.langId ?? "spanish")?.label ?? "Spanish";

  const voice = useVoiceAnswer({
    expected: "",
    locale,
    onTranscript: (text) => onSpokenRef.current(text),
  });
  const retryVoice = useVoiceAnswer({
    expected: "",
    locale,
    onTranscript: (text) => onRetrySpokenRef.current(text),
  });
  const listening = voice.phase === "listening";

  useEffect(() => {
    if (!voice.supported) setUseText(true);
    return () => {
      ambienceRef.current?.stop();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, thinking]);

  // Arriving straight from a cleared lesson: drop them into today's practice scene.
  useEffect(() => {
    if (scene) return;
    if (daily) {
      const s = dailyScene(daily);
      if (s) void begin(s);
      else void navigate({ to: "/dashboard" });
      return;
    }
    if (weekly !== undefined) {
      const s = weeklyScene(weekly);
      if (s) void begin(s);
      else void navigate({ to: "/dashboard" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily, weekly]);



  

  /** The scene role, played by the learner's chosen native character. */
  function inCharacter(role: string) {
    return character ? `${character.name} (${character.age}, ${character.region}) playing the ${role}` : role;
  }

  async function speakCharacter(text: string) {
    if (muted) return;
    ambienceRef.current?.duck(true);
    await speak(text, locale, personality.rate, character?.voiceGender);
    ambienceRef.current?.duck(false);
  }

  async function advance(userText: string, currentHistory: Msg[]) {
    if (!scene) return;
    setThinking(true);
    setSuggestions([]);
    try {
      const exchanges = currentHistory.filter((m) => m.role === "user").length + 1;
      const reply = await simulateTurn({
        data: {
          language,
          setting: scene.setting,
          character: inCharacter(scene.character),
          companion: brief,
          goals: scene.goals,
          minExchanges: scene.minExchanges,
          exchanges,
          level: "beginner",
          history: currentHistory.map((m) => ({ role: m.role, text: m.text })),
          userText,
        },
      });
      setStage(reply.stage_direction);
      setObjective(reply.objective);
      setSuggestions(reply.suggestions);
      setMsgs((m) => {
        const next = [...m];
        if (reply.feedback && next.length > 0) {
          const lastIdx = next.length - 1;
          next[lastIdx] = { ...next[lastIdx]!, feedback: reply.feedback };
        }
        next.push({
          role: "character",
          text: reply.reply,
          translation: reply.reply_translation,
        });
        return next;
      });
      setTurns((t) => t + 1);
      if (reply.handler_note) {
        handlerSay(
          reply.handler_note,
          reply.feedback?.verdict === "good"
            ? "proud"
            : reply.feedback?.verdict === "unclear"
              ? "tough"
              : "nudge",
        );
      } else if (reply.feedback?.verdict === "good") {
        handlerReact("simGood", "proud");
      }
      if (reply.ended) {
        setEnded(true);
        handlerReact("simEnd", "hype");
      }
      void speakCharacter(reply.reply);
    } finally {
      setThinking(false);
    }
  }

  async function begin(s: Scene) {
    setScene(s);
    setMsgs([]);
    setEnded(false);
    setTurns(0);
    setStage("");
    setObjective("");
    setCrimes(0);
    setAttempts(0);
    setStartedAt(Date.now());
    gateRef.current = new ReactionGate(policy);
    cleanStreak.current = 0;
    struggling.current = false;
    const amb = new Ambience();
    ambienceRef.current = amb;
    if (!muted) await amb.start(s.id);
    setThinking(true);
    handlerReact("simStart", "nudge");
    try {
      const reply = await simulateTurn({
        data: {
          language,
          setting: s.setting,
          character: inCharacter(s.character),
          companion: brief,
          goals: s.goals,
          minExchanges: s.minExchanges,
          exchanges: 0,
          level: "beginner",
          history: [],
          userText: "",
        },
      });
      setStage(reply.stage_direction);
      setObjective(reply.objective);
      setSuggestions(reply.suggestions);
      setMsgs([{ role: "character", text: reply.reply, translation: reply.reply_translation }]);
      void speakCharacter(reply.reply);
    } finally {
      setThinking(false);
    }
  }


  /** The tutor's own voice: their accent for coaching, target voice for the phrase. */
  function coachVoice(text: string) {
    if (!text) return;
    void speak(text, coachLocale ?? locale, personality.rate, character?.voiceGender);
  }

  async function sendText(text: string) {
    const clean = text.trim();
    if (!clean || thinking || checking) return;
    const history = msgs;
    setMsgs([...history, { role: "user", text: clean }]);
    setTyped("");
    setChecking(true);
    setAttempts((n) => n + 1);
    try {
      const worst = Object.values(mistakeMemory).sort((a, b) => b.count - a.count)[0];
      const joke = worst ? runningJoke(worst.tag, worst.count) : null;
      const verdict = await checkUtterance({
        data: {
          language,
          setting: scene?.setting ?? "",
          characterLine: [...history].reverse().find((m) => m.role === "character")?.text ?? "",
          userText: clean,
          options: suggestions.map((s) => s.target),
          companion: brief,
          allowRoast: gateRef.current.allowsRoast((verdictSeverityGuess(clean) ?? 2) as Severity),
          runningJoke: joke ?? "",
        },
      });

      const severity = verdict.severity as Severity;
      const repeat = verdict.tag ? (mistakeMemory[verdict.tag.toLowerCase().slice(0, 40)]?.count ?? 0) + 1 : 0;

      // Level 0-1: never interrupt. Remember it and keep the scene flowing.
      if (!gateRef.current.interrupts(severity)) {
        cleanStreak.current = severity === 0 ? cleanStreak.current + 1 : 0;
        const moment = characterMoment({
          severity,
          streakClean: cleanStreak.current,
          brokeStruggle: severity === 0 && struggling.current,
          repeatCount: 0,
        });
        if (severity === 0) struggling.current = false;
        if (severity === 1 && verdict.tag) noteMistake(verdict.tag, verdict.why || verdict.fix);
        if (moment) {
          handlerSay(moment, severity === 0 ? "proud" : "nudge");
          coachVoice(moment);
        }
        gateRef.current.record(false);
      } else {
        // Level 2+: stop the scene, react, correct, make them say it back.
        cleanStreak.current = 0;
        struggling.current = true;
        setCrimes((n) => n + 1);
        if (verdict.tag) noteMistake(verdict.tag, verdict.why || verdict.fix);
        const roasted = Boolean(verdict.reaction) && gateRef.current.allowsRoast(severity);
        gateRef.current.record(roasted);
        const moment =
          characterMoment({
            severity,
            streakClean: 0,
            brokeStruggle: false,
            repeatCount: repeat,
            ...(verdict.tag ? { repeatTag: verdict.tag } : {}),
          }) ?? "";
        setSuggestions([]);
        setRetryText("");
        setRetryState("idle");
        setCorrection({ ...verdict, pending: clean, history, roasted, moment });
        handlerReact("wrong", severity >= 3 ? "tough" : "nudge");
        coachVoice(
          [moment, verdict.reaction, verdict.why, verdict.fix].filter(Boolean).join(" "),
        );
        return;
      }
    } catch {
      /* fall through — never block the scene on the checker */
    } finally {
      setChecking(false);
    }
    void advance(clean, history);
  }

  /** Bragging-rights summary of the run. */
  function battleStats(xp: number): BattleStats {
    return {
      title: scene?.label ?? "Conversation",
      flag: character?.flag ?? "🇪🇸",
      seconds: startedAt ? (Date.now() - startedAt) / 1000 : 0,
      accuracy: attempts ? Math.max(0, (attempts - crimes) / attempts) : 1,
      crimes,
      xp,
      tutor: character?.name ?? "the tutor",
    };
  }

  /** Rough pre-guess so roast pacing can be decided before the model answers. */
  function verdictSeverityGuess(text: string) {
    return text.split(/\s+/).length <= 2 ? 2 : 3;
  }

  /** They repeated the corrected line — check it, then resume the scene. */
  function submitRetry(said: string) {
    const c = correction;
    if (!c) return;
    const target = c.retry || c.better;
    const { overlap } = compareTranscript(said, target);
    if (overlap >= 0.6) {
      sfx("correct");
      setRetryState("ok");
      const praise = gateRef.current.encourages ? "There it is. Say less." : "";
      if (praise) {
        handlerSay(praise, "proud");
        coachVoice(praise);
      }
      setTimeout(() => closeCorrection(), 900);
    } else {
      sfx("wrong");
      setRetryState("again");
      coachVoice("Nah, one more time. Say it back.");
    }
  }

  function retryByVoice() {
    if (retryState === "listening") {
      stopListenRef.current();
      setRetryState("idle");
      return;
    }
    setRetryState("listening");
    sfx("record");
    stopListenRef.current = listenContinuous(locale, {
      onFinal: (t) => {
        setRetryText(t.trim());
        setRetryState("idle");
        if (t.trim()) submitRetry(t.trim());
      },
      onError: () => setRetryState("idle"),
    });
  }

  function closeCorrection() {
    const c = correction;
    setCorrection(null);
    setRetryState("idle");
    setRetryText("");
    stopSpeaking();
    // The scene continues from the CORRECT line, so the learner hears it land.
    if (c) void advance(c.retry || c.better || c.pending, c.history);
  }

  function record() {
    if (listening) {
      stopListenRef.current();
      return;
    }
    setHeard("");
    setDraft(null);
    setListening(true);
    sfx("record");
    stopListenRef.current = listenContinuous(locale, {
      onFinal: (text) => {
        setListening(false);
        sfx("stop");
        const clean = text.trim();
        if (!clean) return;
        setDrafting(true);
        void translateUtterance({ data: { text: clean, language } })
          .then((t) => setDraft({ text: t.text || clean, translation: t.translation }))
          .catch(() => setDraft({ text: clean, translation: "" }))
          .finally(() => setDrafting(false));
      },

      onError: () => {
        setListening(false);
        setUseText(true);
      },
    });
  }

  function sendDraft() {
    const d = draft;
    if (!d?.text.trim()) return;
    setDraft(null);
    setHeard("");
    void sendText(d.text);
  }


  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (next) {
      ambienceRef.current?.stop();
      stopSpeaking();
    } else if (scene) {
      const amb = new Ambience();
      ambienceRef.current = amb;
      void amb.start(scene.id);
    }
  }

  function leave(award: boolean) {
    ambienceRef.current?.stop();
    stopListenRef.current();
    stopSpeaking();
    const userTurns = msgs.filter((m) => m.role === "user").length;
    const weeklyBonus = scene?.weeklyWeek && award ? 120 : 0;
    const gained = award
      ? Math.min(120, userTurns * 12) + (scene?.daily ? 40 : 0) + weeklyBonus
      : 0;
    if (gained > 0 && !scene?.weeklyWeek) addXp(gained);
    if (scene?.weeklyWeek && award) completeWeeklyRecall(scene.weeklyWeek, gained);

    // Guided run (daily practice or weekly recall): celebrate, then back to the map.
    if ((scene?.daily || scene?.weeklyWeek) && award) {
      setReward(gained);
      setListening(false);
      setDraft(null);
      setTimeout(() => void navigate({ to: "/dashboard" }), 2400);
      return;
    }
    setScene(null);
    setMsgs([]);
    setSuggestions([]);
    setEnded(false);
    setDraft(null);
    if (daily || weekly !== undefined) void navigate({ to: "/dashboard" });
  }


  /* ── Scene picker ───────────────────────────────────────────────────── */
  if (!scene) {
    return (
      <AppFrame>
        <h1 className="hud text-xl">CONVERSATION PRACTICE</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a location. Ambient sound comes up, a local starts talking, and you hold the
          conversation — speak or type, and ask your own questions too.
        </p>

        <Link
          to="/companion"
          className={`mt-4 block rounded-sm border px-3 py-3 ${
            hasCompanion ? "border-border bg-card" : "border-primary bg-primary/10"
          }`}
        >
          {hasCompanion && character ? (
            <>
              <p className="hud text-[10px] text-muted-foreground">YOUR PARTNER</p>
              <p className="hud mt-1 text-[11px]">
                {character.flag} {character.name.toUpperCase()} · {personality.label.toUpperCase()}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {personality.label} — tap to change
              </p>
            </>
          ) : (
            <>
              <p className="hud text-[10px] text-primary">CHOOSE YOUR LANGUAGE PARTNER</p>
              <p className="mt-1 text-[11px]">
                Sofía from Guadalajara? A drill sergeant? Pick who talks to you — it changes how
                you're taught, not just the voice.
              </p>
            </>
          )}
        </Link>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {SCENES.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => void begin(s)}
                className={`rounded-sm border bg-card p-3 text-left transition-colors hover:border-primary ${
                  s.special ? "border-secondary/60" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <Icon className="h-5 w-5 text-primary" />
                  {s.special && (
                    <span className="hud rounded-sm border border-secondary/60 bg-secondary/15 px-1 py-0.5 text-[7px] text-secondary">
                      SPECIAL OP
                    </span>
                  )}
                </div>
                <p className="hud mt-2 text-[11px]">{s.label}</p>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  {AMBIENCE_LABELS[s.id]}
                </p>
              </button>
            );
          })}
        </div>
        <p className="hud mt-5 text-[9px] text-muted-foreground">
          HEADPHONES RECOMMENDED · TARGET LANGUAGE: {language.toUpperCase()}
        </p>
      </AppFrame>
    );
  }

  /* ── Live simulation ────────────────────────────────────────────────── */
  return (
    <AppFrame tabs={false}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="hud truncate text-[11px] text-secondary">
            LIVE · {scene.label.toUpperCase()}
            {scene.special ? " · SPECIAL OP" : ""}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {character ? `${character.flag} ${character.name} — ${scene.character}` : scene.character}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute ambience" : "Mute ambience"}
            className="rounded-sm border border-border p-2 text-muted-foreground"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => leave(true)}
            aria-label="Leave simulation"
            className="rounded-sm border border-border p-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {scene.weeklyWeek && (
        <div className="mt-3 rounded-sm border border-secondary/50 bg-secondary/10 px-2.5 py-2">
          <p className="hud text-[9px] text-secondary">WEEKLY RECALL OPERATION · WEEK {scene.weeklyWeek}</p>
          <p className="mt-0.5 text-[11px]">
            Everything from this week, live and unscripted. Clear the scene to bank the recall bonus.
          </p>
        </div>
      )}

      {scene.daily && (
        <div className="mt-3 rounded-sm border border-secondary/50 bg-secondary/10 px-2.5 py-2">
          <p className="hud text-[9px] text-secondary">DAILY FIELD PRACTICE</p>
          <p className="mt-0.5 text-[11px]">
            Use what you just learned in a live conversation. Finish the scene to collect your reward.
          </p>
        </div>
      )}



      {stage && <p className="mt-3 text-[11px] italic text-muted-foreground">{stage}</p>}

      {objective && !ended && (
        <div className="mt-2 rounded-sm border border-primary/40 bg-primary/5 px-2.5 py-2">
          <p className="hud text-[9px] text-primary">YOUR OBJECTIVE</p>
          <p className="mt-0.5 text-[11px]">{objective}</p>
          <p className="hud mt-1 text-[8px] text-muted-foreground">
            EXCHANGE {turns} / {scene.minExchanges} MINIMUM
          </p>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {msgs.map((m, i) =>
          m.role === "character" ? (
            <div key={i} className="paper-card p-3">
              <p className="hud text-[9px] text-destructive">{scene.label.toUpperCase()}</p>
              <p className="mt-1 text-base">
                <Glossed text={m.text} locale={locale} />
              </p>
              {m.translation && (
                <div className="mt-2">
                  <Redaction text={m.translation} />
                </div>
              )}
              <div className="mt-2">
                <PlayButton text={m.text} locale={locale} label="REPLAY" />
              </div>
            </div>
          ) : (
            <div key={i} className="ml-6 rounded-sm border border-secondary/50 bg-secondary/10 p-3">
              <p className="hud text-[9px] text-secondary">YOU</p>
              <p className="mt-1 text-base">{m.text}</p>
              {m.feedback && (
                <p
                  className={`mt-2 text-[11px] ${
                    m.feedback.verdict === "good"
                      ? "text-primary"
                      : m.feedback.verdict === "understandable"
                        ? "text-foreground"
                        : "text-destructive"
                  }`}
                >
                  {m.feedback.note}
                </p>
              )}
            </div>
          ),
        )}
        {(thinking || checking) && (
          <p className="hud flex items-center gap-2 text-[10px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
            {checking ? "CHECKING YOUR SPANISH…" : "THEY’RE RESPONDING…"}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {ended ? (
        <div className="mt-5 space-y-3">
          <p className="hud text-center text-[11px] text-primary">SCENE CLOSED · {turns} EXCHANGES</p>
          <ShareCard stats={battleStats(Math.min(120, turns * 12))} />
          <button
            onClick={() => leave(true)}
            className="hud w-full rounded-sm bg-primary py-3.5 text-xs text-primary-foreground"
          >
            {scene.daily || scene.weeklyWeek ? "COLLECT REWARD · RETURN TO MAP" : "BANK THE XP"}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {suggestions.length > 0 && (
            <div className="rounded-sm border border-secondary/40 bg-secondary/5 p-2.5">
              <p className="hud text-[9px] text-secondary">YOU COULD SAY</p>
              <div className="mt-1.5 space-y-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.target}
                    onClick={() => void sendText(s.target)}
                    disabled={thinking}
                    className="block w-full rounded-sm border border-border bg-card px-2.5 py-2 text-left disabled:opacity-50"
                  >
                    <span className="text-sm">{s.target}</span>
                    <span className="block text-[10px] text-muted-foreground">{s.translation}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {useText ? (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <textarea
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  rows={2}
                  placeholder={`Reply in ${language}`}
                  className="w-full rounded-sm border border-input bg-card px-3 py-2 text-base outline-none focus:border-secondary"
                />
                <button
                  onClick={() => void sendText(typed)}
                  disabled={!typed.trim() || thinking}
                  aria-label="Send reply"
                  className="rounded-sm bg-primary p-3 text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {sttSupported() && (
                <button
                  onClick={() => setUseText(false)}
                  className="hud w-full rounded-sm border border-border py-2.5 text-[10px] text-muted-foreground"
                >
                  <Mic className="mr-1 inline h-3 w-3" /> USE MICROPHONE
                </button>
              )}
            </div>
          ) : draft ? (
            <div className="space-y-2 rounded-sm border border-secondary/50 bg-secondary/5 p-3">
              <p className="hud text-[9px] text-secondary">CHECK YOUR TRANSLESSON</p>
              <textarea
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                rows={2}
                className="w-full rounded-sm border border-input bg-card px-3 py-2 text-base outline-none focus:border-secondary"
              />
              <p className="text-[11px] text-muted-foreground">
                {drafting ? "Translating…" : draft.translation || "—"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={record}
                  className="hud flex-1 rounded-sm border border-border py-2.5 text-[10px] text-muted-foreground"
                >
                  <RotateCcw className="mr-1 inline h-3 w-3" /> RE-RECORD
                </button>
                <button
                  onClick={sendDraft}
                  disabled={!draft.text.trim() || thinking || checking}
                  className="hud flex-1 rounded-sm bg-primary py-2.5 text-[10px] text-primary-foreground disabled:opacity-40"
                >
                  <Send className="mr-1 inline h-3 w-3" /> SEND
                </button>
              </div>
            </div>
          ) : drafting ? (
            <div className="space-y-2 rounded-sm border border-secondary/50 bg-secondary/5 p-6 text-center">
              <p className="hud text-[10px] text-secondary">DECODING TRANSLESSON…</p>
              <p className="text-[11px] text-muted-foreground">Translating what you said.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={record}
                disabled={thinking || checking}
                className={`flex w-full flex-col items-center gap-2 rounded-sm border py-6 disabled:opacity-50 ${
                  listening
                    ? "mic-live border-secondary bg-secondary/10 text-secondary"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {listening ? <Square className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                <span className="hud text-[10px]">
                  {listening ? "RECORDING… TAP TO STOP" : "TAP AND SPEAK"}
                </span>
              </button>

              <button
                onClick={() => setUseText(true)}
                className="hud w-full rounded-sm border border-border py-2.5 text-[10px] text-muted-foreground"
              >
                <Keyboard className="mr-1 inline h-3 w-3" /> TYPE INSTEAD
              </button>
            </div>
          )}

        </div>
      )}
      {correction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-sm border border-destructive/60 bg-card p-4 shadow-lg">
            <p className="hud flex items-center gap-1.5 text-[10px] text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />{" "}
              {SEVERITY_LABEL[correction.severity as Severity]}
            </p>

            {(correction.moment || correction.reaction) && (
              <div className="mt-2 flex items-start gap-2 rounded-sm border border-border bg-muted/40 p-2.5">
                {character && (
                  <img
                    src={character.avatar}
                    alt={character.name}
                    width={512}
                    height={512}
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                )}
                <p className="text-[13px] leading-snug">
                  {[correction.moment, correction.reaction].filter(Boolean).join(" ")}
                </p>
              </div>
            )}

            <p className="mt-3 text-[11px] text-muted-foreground">You said</p>
            <p className="text-sm">{correction.pending}</p>


            {correction.why && (
              <>
                <p className="hud mt-3 text-[9px] text-destructive">WHAT WENT WRONG</p>
                <p className="mt-0.5 text-[12px]">{correction.why}</p>
              </>
            )}
            {correction.fix && (
              <>
                <p className="hud mt-3 text-[9px] text-secondary">HOW TO FIX IT</p>
                <p className="mt-0.5 text-[12px]">{correction.fix}</p>
              </>
            )}
            {correction.better && (
              <div className="mt-3 rounded-sm border border-primary/40 bg-primary/5 p-2.5">
                <p className="hud text-[9px] text-primary">SAY THIS NEXT TIME</p>
                <p className="mt-0.5 text-sm">{correction.better}</p>
                {correction.better_translation && (
                  <p className="text-[10px] text-muted-foreground">
                    {correction.better_translation}
                  </p>
                )}
                <div className="mt-1.5">
                  <PlayButton text={correction.better} locale={locale} label="HEAR IT" />
                </div>
              </div>
            )}

            {(correction.retry || correction.better) && (
              <div className="mt-3 rounded-sm border border-secondary/50 bg-secondary/5 p-2.5">
                <p className="hud text-[9px] text-secondary">YOUR TURN · SAY IT BACK</p>
                {retryState === "again" && (
                  <p className="mt-1 text-[11px] text-destructive">Not quite — one more time.</p>
                )}
                {retryState === "ok" && (
                  <p className="mt-1 text-[11px] text-primary">That's it. Back to the scene…</p>
                )}
                <div className="mt-2 flex gap-2">
                  {sttSupported() && (
                    <button
                      onClick={retryByVoice}
                      className={`hud flex-1 rounded-sm border py-2.5 text-[10px] ${
                        retryState === "listening"
                          ? "mic-live border-secondary text-secondary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {retryState === "listening" ? (
                        <>
                          <Square className="mr-1 inline h-3 w-3" /> STOP
                        </>
                      ) : (
                        <>
                          <Mic className="mr-1 inline h-3 w-3" /> REPEAT IT
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => submitRetry(retryText)}
                    disabled={!retryText.trim()}
                    className="hud flex-1 rounded-sm bg-primary py-2.5 text-[10px] text-primary-foreground disabled:opacity-40"
                  >
                    <Send className="mr-1 inline h-3 w-3" /> CHECK
                  </button>
                </div>
                <input
                  value={retryText}
                  onChange={(e) => setRetryText(e.target.value)}
                  placeholder="…or type it back"
                  className="mt-2 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm outline-none focus:border-secondary"
                />
              </div>
            )}

            <button
              onClick={closeCorrection}
              className="hud mt-4 w-full rounded-sm border border-border py-3 text-[11px] text-muted-foreground"
            >
              {correction.retry || correction.better ? "SKIP · CONTINUE" : "GOT IT · CONTINUE"}
            </button>
          </div>
        </div>
      )}
      {reward > 0 && (
        <Completion
          title="PRACTICE COMPLETE"
          subtitle={`+${reward} XP`}
          tone="levelup"
          duration={2200}
        />
      )}
    </AppFrame>

  );
}
