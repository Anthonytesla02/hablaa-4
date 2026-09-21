import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Keyboard, Check, X, Volume2, Loader2, Lightbulb } from "lucide-react";
import { PlayButton, useSpeaker } from "@/components/Audio";
import { Redaction } from "@/components/Redaction";
import { Glossed } from "@/components/Glossed";
import {
  ChoiceStep,
  DialogueStep,
  ExitStep,
  MatchStep,
  OrderStep,
  RoleplayStep,
  TeachStep,
  UtterStep,
  WriteStep,
} from "@/components/course-steps";

import { evaluateResponse, normalize } from "@/lib/speech";
import { TalkButton, VoiceResult } from "@/components/voice/VoiceAnswer";
import { useVoiceAnswer, voiceXp } from "@/lib/voice/use-voice-answer";
import { handlerReact } from "@/lib/handler-bus";
import type { Step } from "@/lib/session";
import type { Dictation, Mcq, PatternDrill, Shadow, Sts } from "@/lib/content";
import type { SrsCard } from "@/lib/srs";
import { useApp } from "@/lib/store";

export type StepResult = {
  correct: boolean;
  xp: number;
  countsForAccuracy: boolean;
  newContent: boolean;
  /** Learner revealed the hint before answering — retains the current review interval. */
  hinted?: boolean;
};

type Props = { locale: string; onDone: (r: StepResult) => void };

const btn =
  "hud w-full rounded-sm bg-primary py-3.5 text-xs text-primary-foreground disabled:opacity-40";
const ghost =
  "hud w-full rounded-sm border border-border py-3 text-[10px] text-muted-foreground";

/* ── Mode A — Tactical Pattern Drill (TTS multiple choice) ───────────── */
export function McqStep({ data, locale, onDone }: Props & { data: Mcq }) {
  const [picked, setPicked] = useState<string | null>(null);
  const say = useSpeaker(locale);
  const correct = picked === data.correct_option_id;
  const addXp = useApp((s) => s.addXp);

  const correctOption = data.options.find((o) => o.id === data.correct_option_id);

  const voice = useVoiceAnswer({
    expected: correctOption?.target ?? "",
    locale,
    onResult: (score) => {
      const xp = voiceXp(score.verdict);
      if (xp) addXp(xp);
    },
  });


  return (
    <div className="space-y-4">
      <PlayButton text={data.audio_prompt_target} locale={locale} autoPlay />
      <div className="space-y-2">
        {data.options.map((o) => {
          const isPicked = picked === o.id;
          const isAnswer = o.id === data.correct_option_id;
          const state =
            picked === null
              ? "border-border bg-card"
              : isAnswer
                ? "border-primary bg-primary/15"
                : isPicked
                  ? "border-destructive bg-destructive/15"
                  : "border-border bg-card opacity-50";
          return (
            <div key={o.id} className={`rounded-sm border ${state}`}>
              {picked === null ? (
                <button
                  type="button"
                  onClick={() => {
                    setPicked(o.id);
                    handlerReact(o.id === data.correct_option_id ? "correct" : "wrong",
                      o.id === data.correct_option_id ? "hype" : "tough");
                    void say(o.target);
                  }}
                  className="block w-full px-3 pt-3 text-left text-base"
                >
                  {o.target}
                </button>
              ) : (
                <div className="block w-full px-3 pt-3 text-left text-base">
                  <Glossed text={o.target} locale={locale} />
                </div>
              )}
              <div className="px-2 pb-2 pt-1">
                <Redaction text={o.translation} label="(i) DECLASSIFY" />
              </div>
              {/* Mic button beside correct answer after correct pick */}
              {picked !== null && isAnswer && correct && (
                <div className="space-y-2 border-t border-primary/30 px-3 py-3">
                  <TalkButton voice={voice} label="REPEAT THE PHRASE" compact />
                  <VoiceResult
                    voice={voice}
                    expected={correctOption?.target ?? ""}
                    locale={locale}
                  />
                </div>

              )}
            </div>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <p className={`hud text-center text-[11px] ${correct ? "text-primary" : "text-destructive"}`}>
            {correct ? "¡CORRECTO!" : "INCORRECTO"}
          </p>
          <button
            className={btn}
            onClick={() =>
              onDone({ correct, xp: correct ? 10 : 0, countsForAccuracy: true, newContent: true })
            }
          >
            CONTINUE
          </button>
        </>
      )}
    </div>
  );
}

/* ── Mode E — Rapid Start Recall (pattern substitution) ─────────── */
export function PatternStep({
  data,
  sub,
  locale,
  onDone,
}: Props & { data: PatternDrill; sub: { target: string; translation: string } }) {
  const [phase, setPhase] = useState<"cue" | "answer">("cue");
  const say = useSpeaker(locale);
  const answer = data.structure.replace("___", sub.target);

  return (
    <div className="space-y-4">
      <div className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">PATTERN</p>
        <p className="mt-1 text-lg">
          <Glossed text={data.structure} locale={locale} />
        </p>
        <div className="mt-2">
          <Redaction text={data.structure_translation} />
        </div>
        <p className="hud mt-4 text-[10px] text-destructive">SUBSTITUTION</p>
        <p className="mt-1 text-lg">
          <Glossed text={sub.target} locale={locale} />
        </p>
      </div>

      {phase === "cue" ? (
        <>
          <p className="text-center text-xs text-muted-foreground">
            Say the full line aloud before revealing the confirmation.
          </p>
          <button className={btn} onClick={() => { setPhase("answer"); void say(answer); }}>
            REVEAL CONFIRMATION
          </button>
        </>
      ) : (
        <>
          <div className="rounded-sm border border-primary/50 bg-primary/10 p-4 text-center">
            <p className="text-lg">
              <Glossed text={answer} locale={locale} />
            </p>
          </div>
          <PlayButton text={answer} locale={locale} label="REPLAY" />
          <div className="grid grid-cols-2 gap-2">
            <button
              className="hud rounded-sm border border-destructive/60 py-3 text-[10px] text-destructive"
              onClick={() => onDone({ correct: false, xp: 0, countsForAccuracy: true, newContent: true })}
            >
              MISSED IT
            </button>
            <button
              className={btn}
              onClick={() => onDone({ correct: true, xp: 10, countsForAccuracy: true, newContent: true })}
            >
              NAILED IT
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Practice Deck review (SM-2) ─────────────────────────────────────── */
export function ReviewStep({ data, locale, onDone }: Props & { data: SrsCard }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="space-y-4">
      <PlayButton text={data.target} locale={locale} autoPlay label="PLAY CUE" />
      {!revealed ? (
        <>
          <p className="text-center text-xs text-muted-foreground">
            Recall the item from memory, then check yourself.
          </p>
          <button className={btn} onClick={() => setRevealed(true)}>
            CHECK
          </button>
        </>
      ) : (
        <>
          <div className="paper-card p-4 text-center">
            <p className="text-lg">
              <Glossed text={data.target} locale={locale} />
            </p>
            <div className="mt-2">
              <Redaction text={data.translation} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="hud rounded-sm border border-destructive/60 py-3 text-[10px] text-destructive"
              onClick={() => onDone({ correct: false, xp: 0, countsForAccuracy: true, newContent: false })}
            >
              MISSED
            </button>
            <button
              className={btn}
              onClick={() => onDone({ correct: true, xp: 5, countsForAccuracy: true, newContent: false })}
            >
              RECALLED
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Mode B — Echo Protocol (shadowing) ──────────────────────────────── */
export function ShadowStep({ data, locale, onDone }: Props & { data: Shadow }) {
  const [rep, setRep] = useState(0);
  const [speed, setSpeed] = useState(1);
  const bumpShadow = useApp((s) => s.bumpShadow);
  const blind = rep >= Math.ceil(data.recommended_reps / 2);

  function doRep() {
    bumpShadow();
    const nextRep = rep + 1;
    if (nextRep >= data.recommended_reps) {
      onDone({
        correct: true,
        xp: 8 * data.recommended_reps,
        countsForAccuracy: false,
        newContent: false,
      });
    } else {
      setRep(nextRep);
    }
  }

  return (
    <div className="space-y-4">
      <div className="paper-card min-h-24 p-4 text-center">
        {blind ? (
          <p className="hud py-3 text-[10px] opacity-60">BLIND STAGE — AUDIO ONLY</p>
        ) : (
          <p className="text-lg">
            <Glossed text={data.target_text} locale={locale} />
          </p>
        )}
        <div className="mt-2">
          <Redaction text={data.translation} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {data.playback_speeds.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`hud rounded-sm border py-2 text-[10px] ${
              speed === s ? "border-secondary text-secondary" : "border-border text-muted-foreground"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
      <PlayButton text={data.target_text} locale={locale} rate={speed} label="SHADOW ALONG" />
      <p className="hud text-center text-[10px] text-muted-foreground">
        REP {rep + 1} / {data.recommended_reps}
      </p>
      <button className={btn} onClick={doRep}>
        REP COMPLETE
      </button>
    </div>
  );
}

/* ── Response Aid — scaffolding so a beginner can actually reply ─────── */
function ResponseAid({
  data,
  locale,
  onWord,
  onClear,
}: {
  data: Sts;
  locale: string;
  onWord: (w: string) => void;
  onClear: () => void;
}) {
  const [showModel, setShowModel] = useState(false);
  const say = useSpeaker(locale);
  const model = data.expected_answers[0];
  const bank = useMemo(() => {
    const words = (model?.target ?? "")
      .replace(/\[.*?\]/g, "")
      .split(/\s+/)
      .map((w) => w.replace(/[.,!?¿¡]/g, ""))
      .filter(Boolean);
    return [...new Set(words)].sort(() => Math.random() - 0.5);
  }, [model?.target]);

  if (!model) return null;

  return (
    <div className="rounded-sm border border-secondary/40 bg-secondary/5 p-3">
      <p className="hud flex items-center gap-1.5 text-[10px] text-secondary">
        <Lightbulb className="h-3.5 w-3.5" /> RESPONSE AID
      </p>

      {data.hint_target && (
        <p className="mt-2 text-xs">
          Frame your answer like this: <span className="text-secondary">{data.hint_target}</span>
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Aim for: <span className="italic">“{model.translation}”</span>
      </p>

      <p className="hud mt-3 text-[9px] text-muted-foreground">WORD BANK — TAP TO BUILD A REPLY</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {bank.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => {
              onWord(w);
              void say(w);
            }}
            className="rounded-sm border border-secondary/50 bg-card px-2 py-1 text-sm"
          >
            {w}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="hud rounded-sm px-2 py-1 text-[9px] text-muted-foreground"
        >
          CLEAR
        </button>
      </div>

      {!showModel ? (
        <button
          type="button"
          onClick={() => setShowModel(true)}
          className="hud mt-3 text-[10px] text-primary"
        >
          SHOW A MODEL ANSWER →
        </button>
      ) : (
        <div className="mt-3 border-t border-secondary/30 pt-2">
          <p className="text-base">
            <Glossed text={model.target} locale={locale} />
          </p>
          <p className="mt-1 text-xs italic opacity-70">{model.translation}</p>
          <button
            type="button"
            onClick={() => void say(model.target, 0.85)}
            className="hud mt-2 flex items-center gap-1 text-[10px] text-secondary"
          >
            <Volume2 className="h-3 w-3" /> HEAR IT SLOWLY
          </button>
          {data.expected_answers.length > 1 && (
            <ul className="mt-2 space-y-1">
              {data.expected_answers.slice(1, 3).map((a) => (
                <li key={a.target} className="text-xs text-muted-foreground">
                  or “{a.target}”
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Mode C — Field Interrogation (speech to speech) ─────────────────── */
export function StsStep({ data, locale, onDone }: Props & { data: Sts }) {
  const [state, setState] = useState<"idle" | "listening" | "processing" | "success" | "struggle">("idle");
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const bumpSts = useApp((s) => s.bumpSts);
  const say = useSpeaker(locale);
  const judgeRef = useRef<(text: string) => void>(() => {});

  const voice = useVoiceAnswer({
    expected: data.expected_answers[0]?.target ?? "",
    locale,
    onTranscript: (text) => judgeRef.current(text),
  });
  const useText = typing || !voice.supported;

  useEffect(() => {
    void say(data.ai_prompt_target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  function judge(text: string) {
    setTranscript(text);
    setState("processing");
    setTimeout(() => {
      const res = evaluateResponse(
        text,
        data.expected_answers.map((e) => e.target),
        data.evaluation_rubric.core_pattern_hit,
      );
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (res.pass) {
        bumpSts(true);
        setState("success");
        void say(data.on_success_ai_response_target);
      } else if (nextAttempts >= 2) {
        bumpSts(false);
        setState("success");
        void say(data.on_success_ai_response_target);
      } else {
        bumpSts(false);
        setState("struggle");
        if (data.on_struggle_ai_response_target) void say(data.on_struggle_ai_response_target);
      }
    }, 700);
  }

  judgeRef.current = judge;

  const passedFirstTry = attempts <= 1;

  return (
    <div className="space-y-4">
      <div className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">{data.ai_character.toUpperCase()}</p>
        <p className="mt-1 text-xs italic opacity-70">{data.scenario_context}</p>
        <p className="mt-3 text-lg">
          <Glossed text={data.ai_prompt_target} locale={locale} />
        </p>
        <div className="mt-2">
          <Redaction text={data.ai_prompt_translation} />
        </div>
      </div>

      <PlayButton text={data.ai_prompt_target} locale={locale} label="REPLAY PROMPT" />

      {state !== "success" && (
        <ResponseAid
          data={data}
          locale={locale}
          onWord={(w) => {
            setTyping(true);
            setTyped((t) => (t ? `${t} ${w}` : w));
          }}
          onClear={() => setTyped("")}
        />
      )}

      {state === "struggle" && (
        <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm">{data.on_struggle_ai_response_target}</p>
          {data.hint_target && (
            <p className="hud mt-2 text-[10px] text-primary">HINT: {data.hint_target}</p>
          )}
        </div>
      )}

      {(state === "success") && (
        <div className="rounded-sm border border-primary/50 bg-primary/10 p-3">
          <p className="text-sm">{data.on_success_ai_response_target}</p>
          <div className="mt-2">
            <Redaction text={data.on_success_ai_response_translation} />
          </div>
        </div>
      )}

      {transcript && state !== "listening" && (
        <p className="hud text-[10px] text-muted-foreground">YOU SAID: {transcript}</p>
      )}

      {state === "success" ? (
        <button
          className={btn}
          onClick={() =>
            onDone({
              correct: true,
              xp: passedFirstTry ? 20 : 10,
              countsForAccuracy: true,
              newContent: true,
            })
          }
        >
          CONTINUE
        </button>
      ) : useText ? (
        <div className="space-y-2">
          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            rows={2}
            placeholder="Type your reply in the target language"
            className="w-full rounded-sm border border-input bg-card px-3 py-2 text-base outline-none focus:border-secondary"
          />
          <button className={btn} disabled={!typed.trim()} onClick={() => judge(typed)}>
            TRANSMIT REPLY
          </button>
          {sttSupported() && (
            <button className={ghost} onClick={() => setUseText(false)}>
              <Mic className="mr-1 inline h-3 w-3" /> USE MICROPHONE
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={record}
            disabled={state === "listening" || state === "processing"}
            className={`flex w-full flex-col items-center gap-2 rounded-sm border py-6 ${
              state === "listening"
                ? "mic-live border-secondary bg-secondary/10 text-secondary"
                : "border-border bg-card text-foreground"
            }`}
          >
            <Mic className="h-7 w-7" />
            <span className="hud text-[10px]">
              {state === "listening"
                ? "LISTENING…"
                : state === "processing"
                  ? "TRANSMITTING…"
                  : "HOLD THE LINE — SPEAK"}
            </span>
          </button>
          <button className={ghost} onClick={() => setUseText(true)}>
            <Keyboard className="mr-1 inline h-3 w-3" /> TYPE INSTEAD
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Mode D — Blackout Dictation ─────────────────────────────────────── */
export function DictationStep({ data, locale, onDone }: Props & { data: Dictation }) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<null | "exact" | "close" | "miss">(null);
  const say = useSpeaker(locale);

  useEffect(() => {
    void (async () => {
      await say(data.audio_target);
      await say(data.audio_target, 0.7);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  const variants = useMemo(
    () => [data.correct_transcription, ...data.acceptable_variants].map(normalize),
    [data],
  );

  function check() {
    const said = normalize(value);
    if (variants.includes(said)) return setChecked("exact");
    const target = variants[0]!.split(" ");
    const hits = target.filter((w) => said.includes(w)).length / target.length;
    setChecked(hits >= 0.7 ? "close" : "miss");
  }

  return (
    <div className="space-y-4">
      <PlayButton text={data.audio_target} locale={locale} label="REPLAY (NATURAL)" />
      <PlayButton text={data.audio_target} locale={locale} rate={0.7} label="REPLAY (SLOW)" />
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        disabled={checked !== null}
        placeholder="Type exactly what you heard"
        className="w-full rounded-sm border border-input bg-card px-3 py-2 text-base outline-none focus:border-secondary"
      />
      {checked === null ? (
        <button className={btn} disabled={!value.trim()} onClick={check}>
          SUBMIT TRANSCRIPT
        </button>
      ) : (
        <>
          <div
            className={`rounded-sm border p-3 ${
              checked === "miss"
                ? "border-destructive/60 bg-destructive/10"
                : "border-primary/60 bg-primary/10"
            }`}
          >
            <p className="hud text-[10px]">
              {checked === "exact" ? (
                <span className="text-primary">
                  <Check className="mr-1 inline h-3 w-3" />
                  EXACT MATCH
                </span>
              ) : checked === "close" ? (
                <span className="text-primary">CLOSE MATCH</span>
              ) : (
                <span className="text-destructive">
                  <X className="mr-1 inline h-3 w-3" />
                  MISS
                </span>
              )}
            </p>
            <p className="mt-2 text-base">
              <Glossed text={data.correct_transcription} locale={locale} />
            </p>
            <div className="mt-2">
              <Redaction text={data.translation} />
            </div>
          </div>
          <button
            className={btn}
            onClick={() =>
              onDone({
                correct: checked !== "miss",
                xp: checked === "exact" ? 15 : checked === "close" ? 8 : 0,
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

export function StepRenderer({ step, locale, onDone }: Props & { step: Step }) {
  switch (step.kind) {
    case "mcq":
      return <McqStep data={step.data} locale={locale} onDone={onDone} />;
    case "pattern":
      return <PatternStep data={step.data} sub={step.sub} locale={locale} onDone={onDone} />;
    case "review":
      return <ReviewStep data={step.data} locale={locale} onDone={onDone} />;
    case "shadow":
      return <ShadowStep data={step.data} locale={locale} onDone={onDone} />;
    case "sts":
      return <StsStep data={step.data} locale={locale} onDone={onDone} />;
    case "dictation":
      return <DictationStep data={step.data} locale={locale} onDone={onDone} />;
    case "teach":
      return <TeachStep lesson={step.lesson} locale={locale} onDone={onDone} />;
    case "choice":
      return <ChoiceStep act={step.act} locale={locale} onDone={onDone} />;
    case "write":
      return <WriteStep act={step.act} locale={locale} onDone={onDone} />;
    case "order":
      return <OrderStep act={step.act} locale={locale} onDone={onDone} />;
    case "match":
      return <MatchStep act={step.act} locale={locale} onDone={onDone} />;
    case "utter":
      return <UtterStep act={step.act} locale={locale} onDone={onDone} />;
    case "roleplay":
      return <RoleplayStep act={step.act} lesson={step.lesson} locale={locale} onDone={onDone} />;
    case "dialogue":
      return <DialogueStep lesson={step.lesson} locale={locale} onDone={onDone} />;
    case "exit":
      return <ExitStep lesson={step.lesson} locale={locale} onDone={onDone} />;
  }
}

