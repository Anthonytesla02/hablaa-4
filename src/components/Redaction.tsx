import { useState } from "react";

/**
 * Signature interaction — the Redaction Wipe. A black bar slides away to
 * declassify the English translation. Translation is never printed by default.
 */
export function Redaction({
  text,
  className = "",
  label = "TAP TO DECLASSIFY",
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((r) => !r);
      }}
      aria-label={revealed ? "Hide translation" : "Reveal translation"}
      className={`relative block w-full overflow-hidden rounded-sm text-left ${className}`}
    >
      <span className="block px-2 py-1 font-sans text-sm">{text}</span>
      {!revealed && (
        <span className="absolute inset-0 flex items-center justify-center bg-redact">
          <span className="hud text-[9px] text-muted-foreground">{label}</span>
        </span>
      )}
      {revealed && (
        <>
          <span className="redaction-bar absolute inset-0 bg-redact" aria-hidden />
          <span className="stamp-in absolute right-1 top-0 hud text-[8px] text-destructive/70">
            DELOCKED
          </span>
        </>
      )}
    </button>
  );
}
