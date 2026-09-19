import { useEffect, useState } from "react";
import { Loader2, Volume2, X } from "lucide-react";
import { useSpeaker } from "@/components/Audio";
import { explainWord, type WordGloss } from "@/lib/gloss.functions";
import { langById } from "@/lib/content";
import { useApp } from "@/lib/store";

const cache = new Map<string, WordGloss>();

/**
 * Renders target-language text where every word carries a dotted underline.
 * Tapping a word opens a profile sheet with its translation + grammar note.
 */
export function Glossed({
  text,
  locale,
  className = "",
}: {
  text: string;
  locale: string;
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const tokens = text.split(/([\p{L}\p{M}'’-]+)/u);

  return (
    <>
      <span className={className}>
        {tokens.map((t, i) =>
          /[\p{L}]/u.test(t) ? (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(t);
              }}
              className="border-b border-dotted border-current/60 leading-snug hover:text-secondary"
            >
              {t}
            </button>
          ) : (
            <span key={i}>{t}</span>
          ),
        )}
      </span>
      {open && (
        <WordSheet word={open} phrase={text} locale={locale} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function WordSheet({
  word,
  phrase,
  locale,
  onClose,
}: {
  word: string;
  phrase: string;
  locale: string;
  onClose: () => void;
}) {
  const langId = useApp((s) => s.profile?.langId) ?? "spanish";
  const language = langById(langId)?.label ?? "Spanish";
  const key = `${language}|${word.toLowerCase()}|${phrase}`;
  const [gloss, setGloss] = useState<WordGloss | null>(cache.get(key) ?? null);
  const say = useSpeaker(locale);

  useEffect(() => {
    if (gloss) return;
    let alive = true;
    void (async () => {
      const g = await explainWord({ data: { word, phrase, language } });
      if (!alive) return;
      cache.set(key, g);
      setGloss(g);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="paper-card mx-auto w-full max-w-md p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Word note: ${word}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="hud text-[10px] text-destructive">WORD NOTE</p>
            <p className="mt-1 text-2xl">{word}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void say(word)}
              aria-label="Hear word"
              className="rounded-sm border border-paper-foreground/30 p-2"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="p-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!gloss ? (
          <p className="hud mt-4 flex items-center gap-2 text-[10px] opacity-70">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> DECRYPTING…
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-lg font-medium">{gloss.translation}</p>
            {(gloss.part_of_speech || gloss.lemma) && (
              <p className="hud text-[10px] opacity-70">
                {[gloss.part_of_speech, gloss.lemma !== word ? `from “${gloss.lemma}”` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div className="border-t border-paper-foreground/20 pt-3">
              <p className="hud text-[10px] text-destructive">GRAMMAR</p>
              <p className="mt-1 text-sm">{gloss.grammar}</p>
            </div>
            {gloss.example_target && (
              <div className="border-t border-paper-foreground/20 pt-3">
                <p className="hud text-[10px] text-destructive">IN THE FIELD</p>
                <button
                  type="button"
                  onClick={() => void say(gloss.example_target)}
                  className="mt-1 text-left text-sm underline decoration-dotted"
                >
                  {gloss.example_target}
                </button>
                <p className="mt-1 text-xs italic opacity-70">{gloss.example_translation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
