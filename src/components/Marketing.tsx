import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades + lifts its children into view the first time they are scrolled to. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setShown(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight text-primary">
          Habla
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-full px-3 py-1.5 text-xs font-extrabold text-muted-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="btn-3d rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mt-16 border-t-2 border-border/60 bg-card/60">
      <div className="mx-auto max-w-md px-5 py-8">
        <p className="text-lg font-extrabold text-primary">Habla</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Speak a new language from day one, with a tutor who has a real personality.
        </p>
        <nav className="mt-5 grid grid-cols-2 gap-2 text-xs font-bold">
          <Link to="/auth" className="text-muted-foreground">
            Create account
          </Link>
          <Link to="/auth" className="text-muted-foreground">
            Sign in
          </Link>
          <Link to="/terms" className="text-muted-foreground">
            Terms of Service
          </Link>
          <Link to="/privacy" className="text-muted-foreground">
            Privacy Policy
          </Link>
          <Link to="/cookies" className="text-muted-foreground">
            Cookie Policy
          </Link>
          <Link to="/contact" className="text-muted-foreground">
            Contact
          </Link>
        </nav>
        <p className="mt-6 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Habla. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/** Shared shell for the marketing + legal pages. */
export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <div className="topo min-h-[100dvh]">
      <MarketingHeader />
      <main className="mx-auto max-w-md px-5 pb-4 pt-6">{children}</main>
      <MarketingFooter />
    </div>
  );
}

/** Simple legal-document body: heading + sections. */
export function LegalBody({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; p: string[] }[];
}) {
  return (
    <>
      <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
      <p className="mt-1 text-[11px] font-bold text-muted-foreground">Last updated {updated}</p>
      <p className="mt-4 text-sm leading-relaxed">{intro}</p>
      <div className="mt-6 space-y-5">
        {sections.map((s) => (
          <section key={s.h} className="paper-card p-4">
            <h2 className="text-sm font-extrabold">{s.h}</h2>
            {s.p.map((para) => (
              <p key={para} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
