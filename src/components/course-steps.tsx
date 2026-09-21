import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  X,
  Mic,
  Loader2,
  Lightbulb,
  Volume2,
  BookOpen,
  Radio,
  Undo2,
  Sparkles,
} from "lucide-react";
import { PlayButton, useSpeaker } from "@/components/Audio";
import { Glossed } from "@/components/Glossed";
import { Redaction } from "@/components/Redaction";
import { TalkButton, VoiceAnswer, VoiceResult } from "@/components/voice/VoiceAnswer";
import {
  acceptedAnswers,
  activityAudio,
  activityIsListening,
  isBehavioural,
  isTemplate,
  matchPairs,
  orderTokens,
  type CourseActivity,
  type CourseLesson,
} from "@/lib/course";
import { handlerReact, handlerSay } from "@/lib/handler-bus";
import { plain as normalize } from "@/lib/voice/score";
import { useVoiceAnswer, voiceXp } from "@/lib/voice/use-voice-answer";
import { useApp } from "@/lib/store";
import { TOUR_STEP } from "@/lib/tutorial";
import type { StepResult } from "@/components/steps";

type Props = { locale: string; onDone: (r: StepResult) => void };

const btn =
  "hud w-full rounded-sm bg-primary py-3.5 text-xs text-primary-foreground disabled:opacity-40";
const ghost = "hud w-full rounded-sm border border-border py-3 text-[10px] text-muted-foreground";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/* ── Shared: say-it-back pronunciation grading ────────────────────────── */
export function SpeakBack({
  expected,
  locale,
  label = "TAP TO SPEAK",
}: {
  expected: string;
  locale: string;
  label?: string;
}) {
  const addXp = useApp((s) => s.addXp);
  const voice = useVoiceAnswer({
    expected,
    locale,
    onResult: (score) => {
      const xp = voiceXp(score.verdict);
      if (xp) addXp(xp);
      handlerReact(score.verdict === "retry" ? "wrong" : "correct",
        score.verdict === "retry" ? "tough" : "hype");
    },
  });

  return <VoiceAnswer voice={voice} expected={expected} locale={locale} label={label} />;
}

function Feedback({ act, ok }: { act: CourseActivity; ok: boolean }) {
  if (!act.feedback && !act.rationale) return null;
  return (
    <div
      className={`rounded-sm border p-3 text-xs ${
        ok ? "border-primary/50 bg-primary/10" : "border-destructive/50 bg-destructive/10"
      }`}
    >
      {act.feedback && <p>{act.feedback}</p>}
      {act.rationale && <p className="mt-1 opacity-70">{act.rationale}</p>}
    </div>
  );
}

function Hint({ act, shown, onShow }: { act: CourseActivity; shown: boolean; onShow: () => void }) {
  if (!act.hint) return null;
  return shown ? (
    <p className="hud flex items-start gap-2 text-[10px] text-secondary">
      <Lightbulb className="mt-px h-3 w-3 shrink-0" /> {act.hint}
    </p>
  ) : (
    <button type="button" onClick={onShow} className={ghost}>
      <Lightbulb className="mr-1 inline h-3 w-3" /> REQUEST HINT
    </button>
  );
}

/* ── Vocal calibration portal — auto-play + repeat drill ──────────────── */
const REPS_PER_WORD = 5;

const PRAISE = [
  "Good job. Now repeat again.",
  "Solid. One more time.",
  "Copy that. Again.",
  "Clean signal. Repeat.",
  "Locked in. Last one.",
];

function VocabDrill({
  lesson,
  locale,
  onComplete,
}: {
  lesson: CourseLesson;
  locale: string;
  onComplete: () => void;
}) {
  const say = useSpeaker(locale);
  const addXp = useApp((s) => s.addXp);

  const words = lesson.vocabulary;
  const [wi, setWi] = useState(0);
  const [rep, setRep] = useState(0);
  const [intro, setIntro] = useState(true);

  const word = words[wi];
  const advanceRef = useRef(() => {});

  const voice = useVoiceAnswer({
    expected: word?.es ?? "",
    locale,
    onResult: (score) => {
      const tStep = useApp.getState().tutorialStep;
      if (tStep === TOUR_STEP['first-mic']) useApp.getState().setTutorialStep(TOUR_STEP['done']!);
      if (score.verdict === "great") addXp(3);
      else if (score.verdict === "close") addXp(1);
      if (score.verdict !== "retry") {
        handlerReact("correct", "hype");
        setTimeout(() => advanceRef.current(), 1500);
      } else {
        handlerReact("wrong", "tough");
      }
    },
  });

  // Speak the current word at the start of every rep, then hand over to the mic.
  useEffect(() => {
    if (!word) return;
    let alive = true;
    voice.reset();
    setIntro(true);
    void (async () => {
      await say(word.es);
      if (alive) setIntro(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wi, rep, word?.id]);

  function advance() {
    if (rep + 1 < REPS_PER_WORD) {
      setRep(rep + 1);
    } else if (wi + 1 < words.length) {
      setRep(0);
      setWi(wi + 1);
    } else {
      onComplete();
    }
  }
  advanceRef.current = advance;

  if (!word) return null;

  const repDots = Array.from({ length: REPS_PER_WORD }, (_, i) => i);

  return (
    <div className="rounded-sm border border-secondary/40 bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <p className="hud text-[10px] text-secondary">
          <Radio className="mr-1 inline h-3 w-3" /> VOCAL CALIBRATION
        </p>
        <p className="hud text-[10px] text-muted-foreground">
          {wi + 1}/{words.length}
        </p>
      </div>

      <div className="mt-4 text-center" data-tour="vocab-word">
        <p className="text-3xl leading-tight">{word.es}</p>
        <p className="hud mt-1 text-[10px] text-muted-foreground">{word.en.toUpperCase()}</p>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {repDots.map((i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full ${
              i < rep ? "bg-primary" : i === rep ? "bg-secondary" : "bg-border"
            }`}
          />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {intro ? (
          <p className="hud animate-pulse text-center text-[11px] text-secondary">
            <Volume2 className="mr-1 inline h-3.5 w-3.5" /> TRANSMITTING…
          </p>
        ) : (
          <TalkButton
            voice={voice}
            tour="vocab-mic"
            label={`REPEAT IT (${rep + 1}/${REPS_PER_WORD})`}
          />
        )}

        <VoiceResult voice={voice} expected={word.es} locale={locale} />

        {voice.result && voice.result.verdict !== "retry" && (
          <p className="text-center text-[11px] text-muted-foreground">
            {PRAISE[rep] ?? "Good job. Now repeat again."}
          </p>
        )}


        <div className="flex gap-2">
          <button type="button" onClick={() => void say(word.es)} className={ghost}>
            <Volume2 className="mr-1 inline h-3 w-3" /> HEAR AGAIN
          </button>
          <button type="button" onClick={advance} className={ghost}>
            SKIP
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Field Briefing ───────────────────────────────────────────────────── */
export function TeachStep({ lesson, locale, onDone }: Props & { lesson: CourseLesson }) {
  const [drillDone, setDrillDone] = useState(false);
  const say = useSpeaker(locale);

  useEffect(() => {
    handlerSay(`Day ${lesson.day} — ${lesson.focus}. Read it once, then we drill.`, "nudge");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  return (
    <div className="space-y-4">
      <div className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">
          WEEK {lesson.week} · DAY {lesson.day}
        </p>
        <h2 className="hud mt-1 text-lg leading-tight">{lesson.title}</h2>
        <p className="mt-1 text-xs opacity-70">{lesson.focus}</p>
        <p className="mt-3 text-sm">{lesson.teaching.explanation}</p>
        {lesson.teaching.pattern && (
          <p className="mt-3 rounded-sm border border-secondary/40 bg-secondary/10 p-2 text-sm">
            <span className="hud mr-1 text-[10px] text-secondary">PATTERN</span>
            {lesson.teaching.pattern}
          </p>
        )}
        {lesson.teaching.culture_note && (
          <p className="mt-2 text-xs italic opacity-70">{lesson.teaching.culture_note}</p>
        )}
      </div>

      <div>
        <p className="hud text-[10px] text-muted-foreground">LESSON OBJECTIVES</p>
        <ul className="mt-2 space-y-1 text-xs">
          {lesson.objectives.map((o) => (
            <li key={o} className="flex gap-2">
              <span className="text-primary">›</span>
              {o}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="hud text-[10px] text-muted-foreground">
          <BookOpen className="mr-1 inline h-3 w-3" /> VOCABULARY — LISTEN & REPEAT
        </p>
        <div className="mt-2">
          {drillDone ? (
            <ul className="grid grid-cols-1 gap-2">
              {lesson.vocabulary.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => void say(v.es)}
                    className="flex w-full items-center justify-between rounded-sm border border-border bg-card px-3 py-2 text-left"
                  >
                    <span className="text-base">{v.es}</span>
                    <span className="hud flex items-center gap-2 text-[10px] text-muted-foreground">
                      {v.en}
                      <Volume2 className="h-3.5 w-3.5 text-secondary" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <VocabDrill lesson={lesson} locale={locale} onComplete={() => setDrillDone(true)} />
          )}
        </div>
      </div>


      <div>
        <p className="hud text-[10px] text-muted-foreground">WORKED EXAMPLES</p>
        <ul className="mt-2 space-y-2">
          {lesson.examples.map((ex) => (
            <li key={ex.es} className="rounded-sm border border-border bg-card p-3">
              <p className="text-base">
                <Glossed text={ex.es} locale={locale} />
              </p>
              <div className="mt-1">
                <Redaction text={ex.en} />
              </div>
              {ex.analysis && <p className="mt-2 text-[11px] opacity-60">{ex.analysis}</p>}
              <div className="mt-2">
                <PlayButton text={ex.es} locale={locale} label="HEAR IT" />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button
        className={btn}
        disabled={!drillDone}
        onClick={() => onDone({ correct: true, xp: 5, countsForAccuracy: false, newContent: false })}
      >
        {drillDone ? "BEGIN DRILLS" : "COMPLETE VOCAL CALIBRATION FIRST"}

      </button>
    </div>
  );
}

/* ── Signal Identification (options) ─────────────────────────────────── */
export function ChoiceStep({ act, locale, onDone }: Props & { act: CourseActivity }) {
  const options = useMemo(() => shuffle(act.options ?? []), [act.id]);
  const [picked, setPicked] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const say = useSpeaker(locale);
  const listening = activityIsListening(act);
  const ok = picked !== null && normalize(picked) === normalize(act.answer);

  useEffect(() => {
    if (listening) void say(act.answer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act.id]);

  return (
    <div className="space-y-4">
      <p className="text-base">{act.prompt}</p>
      {listening && <PlayButton text={act.answer} locale={locale} label="REPLAY SIGNAL" />}

      <div className="space-y-2">
        {options.map((o) => {
          const isAnswer = normalize(o) === normalize(act.answer);
          const isPicked = picked === o;
          const state =
            picked === null
              ? "border-border bg-card"
              : isAnswer
                ? "border-primary bg-primary/15"
                : isPicked
                  ? "border-destructive bg-destructive/15"
                  : "border-border bg-card opacity-50";
          return (
            <button
              key={o}
              type="button"
              disabled={picked !== null}
              onClick={() => {
                setPicked(o);
                handlerReact(isAnswer ? "correct" : "wrong", isAnswer ? "hype" : "tough");
                void say(o);
              }}
              className={`block w-full rounded-sm border px-3 py-3 text-left text-base ${state}`}
            >
              {picked === null ? o : <Glossed text={o} locale={locale} />}
            </button>
          );
        })}
      </div>

      {picked === null && <Hint act={act} shown={hint} onShow={() => setHint(true)} />}

      {picked !== null && (
        <>
          <Feedback act={act} ok={ok} />
          {ok && <SpeakBack expected={act.answer} locale={locale} label="REPEAT THE PHRASE" />}
          <button
            className={btn}
            onClick={() =>
              onDone({
                correct: ok,
                xp: ok ? (hint ? 6 : 12) : 0,
                hinted: hint,
                countsForAccuracy: true,
                newContent: true,
              })
            }
          >
            CONTINUE
          </button>
        </>
      )}
    </div>
  );
}

/* ── Written Transmission (typed answers) ────────────────────────────── */
export function WriteStep({ act, locale, onDone }: Props & { act: CourseActivity }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<null | "ok" | "close" | "miss">(null);
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState(false);
  const template = isTemplate(act) || isBehavioural(act);

  const variants = useMemo(() => acceptedAnswers(act).map(normalize), [act.id]);

  function check() {
    const said = normalize(value);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (template) {
      // Open-ended: require the fixed scaffolding words to be present.
      const anchors = normalize(act.answer.replace(/_+/g, " "))
        .split(" ")
        .filter((w) => w.length > 1);
      const hits = anchors.filter((w) => said.includes(w)).length;
      const ratio = anchors.length === 0 ? 1 : hits / anchors.length;
      const verdict = ratio >= 0.6 ? "ok" : ratio >= 0.35 ? "close" : "miss";
      setState(verdict);
      handlerReact(verdict === "miss" ? "wrong" : "correct", verdict === "miss" ? "tough" : "hype");
      return;
    }

    if (variants.includes(said)) {
      setState("ok");
      handlerReact("correct", "hype");
      return;
    }
    const target = variants[0]!.split(" ").filter(Boolean);
    const overlap = target.filter((w) => said.includes(w)).length / Math.max(1, target.length);
    if (overlap >= 0.7 && nextAttempts >= 2) {
      setState("close");
      handlerReact("wrong", "nudge");
    } else if (nextAttempts >= 2) {
      setState("miss");
      handlerReact("wrong", "tough");
    } else {
      setState("miss");
      setHint(true);
      handlerReact("wrong", "nudge");
    }
  }

  const settled = state !== null && (state === "ok" || attempts >= 2 || template);

  return (
    <div className="space-y-4">
      <p className="text-base">{act.prompt}</p>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        disabled={settled}
        placeholder={template ? "Write your own version" : "Type your answer in Spanish"}
        className="w-full rounded-sm border border-input bg-card px-3 py-2 text-base outline-none focus:border-secondary"
      />

      <Hint act={act} shown={hint} onShow={() => setHint(true)} />

      {!settled ? (
        <button className={btn} disabled={!value.trim()} onClick={check}>
          {state === "miss" && attempts === 1 ? "TRY AGAIN" : "SUBMIT"}
        </button>
      ) : (
        <>
          <div
            className={`rounded-sm border p-3 ${
              state === "miss"
                ? "border-destructive/60 bg-destructive/10"
                : "border-primary/60 bg-primary/10"
            }`}
          >
            <p className="hud text-[10px]">
              {state === "ok" ? (
                <span className="text-primary">
                  <Check className="mr-1 inline h-3 w-3" />
                  {template ? "PATTERN USED" : "CORRECT"}
                </span>
              ) : state === "close" ? (
                <span className="text-secondary">ALMOST</span>
              ) : (
                <span className="text-destructive">
                  <X className="mr-1 inline h-3 w-3" /> MODEL ANSWER
                </span>
              )}
            </p>
            <p className="mt-2 text-base">
              <Glossed text={act.answer} locale={locale} />
            </p>
            <div className="mt-2">
              <PlayButton text={act.answer.replace(/_+/g, "…")} locale={locale} label="HEAR IT" />
            </div>
          </div>
          <Feedback act={act} ok={state !== "miss"} />
          <SpeakBack expected={value.trim() || act.answer} locale={locale} label="NOW SAY IT" />
          <button
            className={btn}
            onClick={() =>
              onDone({
                correct: state !== "miss",
                xp: state === "ok" ? (hint ? 8 : 14) : state === "close" ? 6 : 0,
                hinted: hint,
                countsForAccuracy: true,
                newContent: true,
              })
            }
          >
            CONTINUE
          </button>
        </>
      )}
    </div>
  );
}

/* ── Syntax Reassembly (ordering) ────────────────────────────────────── */
export function OrderStep({ act, locale, onDone }: Props & { act: CourseActivity }) {
  const tokens = useMemo(() => orderTokens(act), [act.id]);
  const pool = useMemo(() => shuffle(tokens.map((t, i) => ({ t, i }))), [act.id]);
  const [used, setUsed] = useState<number[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);

  const built = used.map((i) => tokens[i]!).join(" ");
  const ok = normalize(built) === normalize(act.answer);

  return (
    <div className="space-y-4">
      <p className="text-base">{act.prompt}</p>

      <div className="min-h-[3.5rem] rounded-sm border border-dashed border-border bg-card p-3 text-base">
        {built ? (
          checked !== null ? (
            <Glossed text={built} locale={locale} />
          ) : (
            built
          )
        ) : (
          <span className="hud text-[10px] text-muted-foreground">TAP THE WORDS IN ORDER</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {pool.map((p) => (
          <button
            key={`${p.t}-${p.i}`}
            type="button"
            disabled={used.includes(p.i) || checked !== null}
            onClick={() => setUsed((u) => [...u, p.i])}
            className={`rounded-sm border px-3 py-2 text-base ${
              used.includes(p.i)
                ? "border-border/40 bg-card/40 text-muted-foreground"
                : "border-border bg-card"
            }`}
          >
            {p.t}
          </button>
        ))}
      </div>

      {checked === null ? (
        <div className="space-y-2">
          <button className={btn} disabled={used.length !== tokens.length} onClick={() => {
            const pass = normalize(used.map((i) => tokens[i]!).join(" ")) === normalize(act.answer);
            setChecked(pass);
            handlerReact(pass ? "correct" : "wrong", pass ? "hype" : "tough");
          }}>
            CHECK ORDER
          </button>
          <button className={ghost} disabled={used.length === 0} onClick={() => setUsed((u) => u.slice(0, -1))}>
            <Undo2 className="mr-1 inline h-3 w-3" /> UNDO
          </button>
        </div>
      ) : (
        <>
          {!ok && (
            <div className="rounded-sm border border-destructive/60 bg-destructive/10 p-3">
              <p className="hud text-[10px] text-destructive">CORRECT ORDER</p>
              <p className="mt-1 text-base">
                <Glossed text={act.answer} locale={locale} />
              </p>
            </div>
          )}
          <Feedback act={act} ok={ok} />
          <SpeakBack expected={act.answer} locale={locale} label="SAY THE SENTENCE" />
          <button
            className={btn}
            onClick={() =>
              onDone({ correct: ok, xp: ok ? 12 : 0, countsForAccuracy: true, newContent: true })
            }
          >
            CONTINUE
          </button>
        </>
      )}
    </div>
  );
}

/* ── Cipher Match (matching) ─────────────────────────────────────────── */
export function MatchStep({ act, locale, onDone }: Props & { act: CourseActivity }) {
  const pairs = useMemo(() => matchPairs(act), [act.id]);
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right)), [act.id]);
  const [active, setActive] = useState<string | null>(null);
  const [solved, setSolved] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const say = useSpeaker(locale);

  const done = Object.keys(solved).length === pairs.length && pairs.length > 0;

  function pickRight(right: string) {
    if (!active) return;
    const pair = pairs.find((p) => p.left === active);
    if (pair && pair.right === right) {
      setSolved((s) => ({ ...s, [active]: right }));
      setActive(null);
      setWrong(null);
      void say(active);
    } else {
      setWrong(right);
      setMisses((m) => m + 1);
      setTimeout(() => setWrong(null), 600);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-base">{act.prompt}</p>

      <div className="grid grid-cols-2 gap-2">
        <ul className="space-y-2">
          {pairs.map((p) => {
            const isSolved = Boolean(solved[p.left]);
            return (
              <li key={p.left}>
                <button
                  type="button"
                  disabled={isSolved}
                  onClick={() => setActive(p.left)}
                  className={`w-full rounded-sm border px-2 py-3 text-left text-sm ${
                    isSolved
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : active === p.left
                        ? "border-secondary bg-secondary/15"
                        : "border-border bg-card"
                  }`}
                >
                  {p.left}
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="space-y-2">
          {rights.map((r) => {
            const isSolved = Object.values(solved).includes(r);
            return (
              <li key={r}>
                <button
                  type="button"
                  disabled={isSolved}
                  onClick={() => pickRight(r)}
                  className={`w-full rounded-sm border px-2 py-3 text-left text-sm ${
                    isSolved
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : wrong === r
                        ? "border-destructive bg-destructive/15"
                        : "border-border bg-card"
                  }`}
                >
                  {r}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {!done ? (
        <p className="hud text-[10px] text-muted-foreground">
          {active ? `PAIRING: ${active}` : "TAP A SPANISH PHRASE, THEN ITS MEANING"}
        </p>
      ) : (
        <>
          <Feedback act={act} ok={misses === 0} />
          <button
            className={btn}
            onClick={() =>
              onDone({
                correct: misses === 0,
                xp: misses === 0 ? 12 : 6,
                countsForAccuracy: true,
                newContent: true,
              })
            }
          >
            CONTINUE
          </button>
        </>
      )}
    </div>
  );
}

/* ── Voice Print Drill (speak / shadowing / translation chain) ───────── */
export function UtterStep({ act, locale, onDone }: Props & { act: CourseActivity }) {
  const [revealed, setRevealed] = useState(false);
  const audio = activityAudio(act);
  const gradeable = !isBehavioural(act) && !isTemplate(act);

  return (
    <div className="space-y-4">
      <div className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">SPEAK ALOUD</p>
        <p className="mt-2 text-base">{act.prompt}</p>
      </div>

      {revealed && audio && (
        <div className="rounded-sm border border-border bg-card p-3">
          <p className="text-base">
            <Glossed text={act.answer} locale={locale} />
          </p>
          <div className="mt-2">
            <PlayButton text={audio} locale={locale} label="HEAR THE MODEL" />
          </div>
        </div>
      )}
      {!revealed && audio && (
        <button className={ghost} onClick={() => setRevealed(true)}>
          <Lightbulb className="mr-1 inline h-3 w-3" /> REVEAL MODEL LINE
        </button>
      )}

      {gradeable ? (
        <SpeakBack expected={act.answer} locale={locale} label="RECORD YOUR ATTEMPT" />
      ) : (
        <p className="hud text-[10px] text-muted-foreground">
          <Mic className="mr-1 inline h-3 w-3" /> SPEAK IT OUT LOUD, THEN MARK IT DONE
        </p>
      )}

      <Feedback act={act} ok />

      <button
        className={btn}
        onClick={() =>
          onDone({ correct: true, xp: 12, countsForAccuracy: false, newContent: true })
        }
      >
        CONTINUE
      </button>
    </div>
  );
}

/* ── Intercepted Dialogue ────────────────────────────────────────────── */
export function DialogueStep({ lesson, locale, onDone }: Props & { lesson: CourseLesson }) {
  const say = useSpeaker(locale);
  const [playingAll, setPlayingAll] = useState(false);

  async function playAll() {
    setPlayingAll(true);
    for (const line of lesson.dialogue.lines) {
      await say(line.es);
    }
    setPlayingAll(false);
  }

  return (
    <div className="space-y-4">
      <div className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">INTERCEPT</p>
        <h3 className="hud mt-1 text-base">{lesson.dialogue.title}</h3>
      </div>

      <button className={ghost} disabled={playingAll} onClick={() => void playAll()}>
        <Volume2 className="mr-1 inline h-3 w-3" />
        {playingAll ? "PLAYING…" : "PLAY WHOLE EXCHANGE"}
      </button>

      <ul className="space-y-2">
        {lesson.dialogue.lines.map((l, i) => (
          <li
            key={`${l.speaker}-${i}`}
            className={`rounded-sm border p-3 ${
              l.speaker === "A" ? "border-border bg-card" : "border-secondary/40 bg-secondary/5"
            }`}
          >
            <p className="hud text-[10px] text-muted-foreground">SPEAKER {l.speaker}</p>
            <p className="mt-1 text-base">
              <Glossed text={l.es} locale={locale} />
            </p>
            <div className="mt-1">
              <Redaction text={l.en} />
            </div>
            <div className="mt-2 grid gap-2">
              <PlayButton text={l.es} locale={locale} label="HEAR LINE" />
              <SpeakBack expected={l.es} locale={locale} label="SHADOW THIS LINE" />
            </div>
          </li>
        ))}
      </ul>

      {lesson.dialogue.learner_turns && lesson.dialogue.learner_turns.length > 0 && (
        <div className="rounded-sm border border-border bg-card p-3">
          <p className="hud text-[10px] text-secondary">YOUR TURNS</p>
          <ul className="mt-2 space-y-1 text-xs">
            {lesson.dialogue.learner_turns.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-primary">›</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        className={btn}
        onClick={() => onDone({ correct: true, xp: 10, countsForAccuracy: false, newContent: true })}
      >
        CONTINUE
      </button>
    </div>
  );
}

/* ── Live Contact (roleplay → Conversation Practice) ───────────────────────── */
export function RoleplayStep({
  act,
  lesson,
  locale,
  onDone,
}: Props & { act: CourseActivity; lesson: CourseLesson }) {
  return (
    <div className="space-y-4">
      <div className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">LIVE CONTACT</p>
        <p className="mt-2 text-base">{act.prompt}</p>
        <p className="mt-2 text-xs opacity-70">{lesson.mission}</p>
      </div>

      {!isBehavioural(act) && (
        <div className="rounded-sm border border-secondary/40 bg-secondary/5 p-3">
          <p className="hud text-[10px] text-secondary">TARGET PATTERN</p>
          <p className="mt-1 text-base">
            <Glossed text={act.answer} locale={locale} />
          </p>
        </div>
      )}

      <Link
        to="/simulate"
        className="hud flex w-full items-center justify-center gap-2 rounded-sm border border-secondary/60 bg-secondary/10 py-3.5 text-[11px] text-secondary"
      >
        <Radio className="h-4 w-4" /> OPEN CONVERSATION PRACTICE
      </Link>

      <Feedback act={act} ok />

      <button
        className={btn}
        onClick={() => onDone({ correct: true, xp: 15, countsForAccuracy: false, newContent: true })}
      >
        MARK CONTACT COMPLETE
      </button>
    </div>
  );
}

/* ── Exit Check ──────────────────────────────────────────────────────── */
export function ExitStep({ lesson, onDone }: Props & { lesson: CourseLesson }) {
  const [ticked, setTicked] = useState<Record<number, boolean>>({});
  const count = Object.values(ticked).filter(Boolean).length;
  const all = count === lesson.exit_check.length;

  return (
    <div className="space-y-4">
      <div className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">EXIT CHECK</p>
        <p className="mt-2 text-sm">
          Do each of these from memory, out loud. Tick only what you actually managed.
        </p>
      </div>

      <ul className="space-y-2">
        {lesson.exit_check.map((c, i) => (
          <li key={c}>
            <button
              type="button"
              onClick={() => setTicked((t) => ({ ...t, [i]: !t[i] }))}
              className={`flex w-full items-center gap-3 rounded-sm border px-3 py-3 text-left text-sm ${
                ticked[i] ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-sm border ${
                  ticked[i] ? "border-primary bg-primary/20" : "border-border"
                }`}
              >
                {ticked[i] && <Check className="h-3.5 w-3.5" />}
              </span>
              {c}
            </button>
          </li>
        ))}
      </ul>

      <button
        className={btn}
        onClick={() =>
          onDone({
            correct: all,
            xp: all ? 20 : count * 4,
            countsForAccuracy: true,
            newContent: false,
          })
        }
      >
        <Sparkles className="mr-1 inline h-3.5 w-3.5" />
        {all ? "CLOSE THE FILE" : `FILE WITH ${count}/${lesson.exit_check.length}`}
      </button>
    </div>
  );
}
