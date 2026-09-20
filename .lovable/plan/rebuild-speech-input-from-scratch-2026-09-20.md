# Rebuild speech input from scratch

Today the app listens to the learner in two completely different ways, and both are wired in by hand in several places:

- Lessons record a clip, send it away to be written down, and compare words.
- Roleplay uses the browser's own built-in listening, which simply doesn't exist on many phones (that's why it silently falls back to typing).

Result: inconsistent behaviour, repeated code in three files, and scoring that only counts whole words so "cómo estás" vs "como esta" can be judged wrongly.

## Step 1 — Remove the old speech code

Delete entirely:

- the clip-recording helper
- the transcription request and its word-comparison helper
- the browser listening helpers (single-shot and continuous)

Strip every call site: the pronunciation check in the lesson steps, the speaking step, the roleplay speaking and retry flows. Nothing of the old path stays behind.

## Step 2 — One new speech engine

A single way to listen, used everywhere:

- **Hold-to-talk recorder** with live loudness so the learner can see they're being heard, automatic stop after silence, and a hard 15-second cap.
- **One listening request** that returns what was said plus the language it heard, with clear errors (no mic permission, nothing said, too quiet, offline).
- **Smarter scoring**: compares sound-alike spelling (accents, silent h, b/v, ll/y, s/z/c) and allows small slips per word instead of demanding whole-word matches. Returns a 0–100 score, a verdict (great / close / try again), and a word-by-word breakdown.

## Step 3 — One speech component

A shared talk button + result panel used by lessons, the speaking step, and roleplay:

- big mic button with pulsing loudness ring
- states: tap to speak → listening → checking → result
- result shows the target sentence with each word marked correct, off, or missed, plus the score
- "hear it again" and "type instead" always available
- friendly retry on failure; never a dead end

Bonus XP rules stay as they are (great = 5, close = 2).

## Technical notes

- New: `src/lib/voice/recorder.ts` (MediaRecorder + analyser loudness + silence auto-stop), `src/lib/voice/transcribe.functions.ts` (server fn, non-streaming JSON, `gpt-4o-transcribe`, language hint), `src/lib/voice/score.ts` (phonetic folding + per-word Levenshtein alignment), `src/lib/voice/use-voice-answer.ts` (state machine hook), `src/components/voice/VoiceAnswer.tsx` (shared UI).
- Removed: `src/lib/audio-recorder.ts`, `src/lib/pronunciation.functions.ts`, `src/lib/text-compare.ts`, and `listenOnce` / `listenContinuous` / `sttSupported` from `src/lib/speech.ts`. Text-to-speech in `speech.ts` is untouched.
- `steps.tsx` (`McqStep`, `StsStep`), `course-steps.tsx` (`UtterStep`, `RoleplayStep`), and `simulate.tsx` (main record + retry-by-voice) all switch to `VoiceAnswer` / `useVoiceAnswer`; the typed fallback stays.
- `normalize` / `evaluateResponse` stay in `speech.ts` for the non-voice grading paths.
