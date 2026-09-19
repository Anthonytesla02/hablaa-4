import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Archive,
  ChevronRight,

  Dumbbell,
  LogOut,
  Music,
  ShoppingBag,
  Trophy,
  Users,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { createPost } from "@/lib/feed";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { gamification, langById, onboarding } from "@/lib/content";
import { useApp, useLevel } from "@/lib/store";
import { useCompanion } from "@/lib/use-companion";
import { setSfxMuted, sfxMuted, sfx } from "@/lib/sfx";
import { useHandler } from "@/lib/handler-bus";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Habla" },
      {
        name: "description",
        content:
          "Your level, badges, streak history and every setting for the app — tutor, voice speed, captions and sounds.",
      },
      { property: "og:title", content: "Your Profile — Habla" },
      { property: "og:description", content: "Level, badges, settings and session history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Hydrated>
      <ProfilePage />
    </Hydrated>
  ),
});

function ProfilePage() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const badges = useApp((s) => s.badges);
  const history = useApp((s) => s.history);
  const streak = useApp((s) => s.streak);
  const longest = useApp((s) => s.longestStreak);
  const xp = useApp((s) => s.xp);
  const credits = useApp((s) => s.credits);
  const settings = useApp((s) => s.settings);
  const setSetting = useApp((s) => s.setSetting);
  const resetAll = useApp((s) => s.resetAll);
  const level = useLevel();
  const { character, personality, memory } = useCompanion();
  const tutorMuted = useHandler((s) => s.muted);
  const toggleTutorMute = useHandler((s) => s.toggleMute);
  const [soundOff, setSoundOff] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => setSoundOff(sfxMuted()), []);
  useEffect(() => {
    if (!profile) void navigate({ to: "/start" });
  }, [profile, navigate]);
  if (!profile) return null;

  const lang = langById(profile.langId);
  const focus = onboarding.operational_personas.find((p) => p.id === profile.personaId);
  const allBadges = gamification.badges as { id: string; label: string; unlock_condition: string }[];

  async function postStreak() {
    sfx("tap");
    setPosting(true);
    try {
      await createPost({
        kind: "streak",
        callsign: profile?.callsign ?? "Learner",
        body: `${streak} days in a row with ${character?.name ?? "my tutor"}.`,
        stats: {
          flag: lang?.flag_emoji ?? "🇪🇸",
          title: `${lang?.label ?? "Spanish"} streak`,
          streak,
          longest,
          xp,
          level: level.current.codename,
        },
      });
      sfx("complete");
      toast.success("Posted to the community feed");
      void navigate({ to: "/feed" });
    } catch {
      toast.error("Could not post right now");
    } finally {
      setPosting(false);
    }
  }


  return (
    <AppFrame>
      <section className="paper-card p-4">
        <div className="flex items-center gap-3">
          {character && (
            <img
              src={character.avatar}
              alt={character.name}
              width={512}
              height={512}
              className="h-16 w-16 rounded-full border-2 border-primary object-cover"
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold">{profile.callsign}</h1>
            <p className="text-[12px] font-bold text-secondary">
              {lang?.flag_emoji} {lang?.label} · {level.current.codename}
            </p>
            <p className="text-[11px] text-muted-foreground">Learning for: {focus?.label}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="XP" value={String(xp)} />
          <Stat label="Streak" value={`${streak}d`} sub={`best ${longest}`} />
          <Stat label="Coins" value={String(credits)} />
        </div>
        <p className="mt-3 text-xs">{level.current.can_do_summary}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void postStreak()}
            disabled={posting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary py-2.5 text-[11px] font-extrabold text-primary-foreground disabled:opacity-60"
          >
            <Users className="h-3.5 w-3.5" /> {posting ? "Posting…" : "Post my streak"}
          </button>
          <Link
            to="/feed"
            onClick={() => sfx("tap")}
            className="flex items-center justify-center rounded-2xl border-2 border-border px-3 text-[11px] font-extrabold text-muted-foreground"
          >
            See feed
          </Link>
        </div>
      </section>

      <Link
        to="/companion"
        onClick={() => sfx("tap")}
        className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3"
      >
        {character && (
          <img
            src={character.avatar}
            alt={character.name}
            width={512}
            height={512}
            loading="lazy"
            className="h-12 w-12 rounded-full border-2 border-border object-cover"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold text-muted-foreground">Your tutor</span>
          <span className="block text-sm font-extrabold">
            {character ? `${character.flag} ${character.name}` : "Pick a tutor"} · {personality.emoji}{" "}
            {personality.label}
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {character?.teaches ?? "Choose who teaches you and how."}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>

      {memory.length > 0 && (
        <section className="mt-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-3">
          <p className="text-[11px] font-extrabold text-primary">
            What {character ? character.name : "your tutor"} remembers
          </p>
          <ul className="mt-2 space-y-1.5">
            {memory.map((m) => (
              <li key={m} className="text-[11px] text-muted-foreground">
                • {m}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">
            These keep coming back in your practice until they stick.
          </p>
        </section>
      )}

      <section className="mt-6">
        <p className="text-[11px] font-extrabold text-muted-foreground">Shortcuts</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Shortcut to="/vault" icon={Dumbbell} label="Practice" />
          <Shortcut to="/feed" icon={Users} label="Feed" />
          <Shortcut to="/league" icon={Trophy} label="League" />
          <Shortcut to="/shop" icon={ShoppingBag} label="Shop" />
        </div>
        <Link
          to="/backup"
          onClick={() => sfx("tap")}
          className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-3 py-3"
        >
          <Archive className="h-5 w-5 text-secondary" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-extrabold">Backup &amp; restore</span>
            <span className="block text-[10px] text-muted-foreground">
              Save your progress to a file or bring one in.
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>


      <section className="mt-6">
        <p className="text-[11px] font-extrabold text-muted-foreground">Settings</p>
        <div className="mt-2 space-y-4 rounded-2xl border-2 border-border bg-card p-3">
          <label className="block">
            <span className="text-[12px] font-extrabold">
              Voice speed · {settings.rate.toFixed(2)}×
            </span>
            <input
              type="range"
              min={0.6}
              max={1.3}
              step={0.05}
              value={settings.rate}
              onChange={(e) => setSetting("rate", Number(e.target.value))}
              className="mt-2 w-full accent-[oklch(0.72_0.17_35)]"
            />
          </label>
          <Row
            label="Show captions"
            note="See what's being said in the language you're learning."
            on={settings.captions}
            set={(v) => setSetting("captions", v)}
          />
          <Row
            label="Interface sounds"
            icon={Music}
            note="Clicks, pops and celebration sounds."
            on={!soundOff}
            set={(v) => {
              setSfxMuted(!v);
              setSoundOff(!v);
              if (v) sfx("tap");
            }}
          />
          <Row
            label="Tutor voice"
            icon={Volume2}
            note="Let your tutor read things out loud."
            on={!tutorMuted}
            set={() => toggleTutorMute()}
          />
        </div>
      </section>

      <section className="mt-6">
        <p className="text-[11px] font-extrabold text-muted-foreground">
          Badges · {badges.length}/{allBadges.length}
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {allBadges.map((b) => {
            const earned = badges.includes(b.id);
            return (
              <li
                key={b.id}
                className={`rounded-2xl border-2 px-3 py-2.5 ${
                  earned ? "border-primary/60 bg-primary/10" : "border-border bg-card opacity-50"
                }`}
              >
                <span className="block text-[12px] font-extrabold">{b.label}</span>
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {b.unlock_condition}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <p className="text-[11px] font-extrabold text-muted-foreground">Recent sessions</p>
        <ul className="mt-2 space-y-1.5">
          {history.map((h, i) => (
            <li
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border-2 border-border bg-card px-3 py-2"
            >
              <span className="truncate text-[11px] font-bold">
                {new Date(h.date).toLocaleDateString()} · {Math.round(h.accuracy * 100)}% ·{" "}
                {h.items} items
              </span>
              <span className="shrink-0 text-[11px] font-extrabold text-primary">+{h.xp} XP</span>
            </li>
          ))}
          {history.length === 0 && (
            <li className="text-xs text-muted-foreground">No sessions yet — go say hello!</li>
          )}
        </ul>
      </section>

      <button
        onClick={async () => {
          sfx("tap");
          await supabase.auth.signOut();
          void navigate({ to: "/auth" });
        }}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border py-3 text-[12px] font-extrabold text-muted-foreground"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>

      <button
        onClick={() => {
          if (confirm("Start over? All progress on this device is erased.")) {
            resetAll();
            void navigate({ to: "/start" });
          }
        }}
        className="mt-3 w-full rounded-2xl border-2 border-destructive/50 py-3 text-[12px] font-extrabold text-destructive"
      >
        Reset my progress
      </button>
    </AppFrame>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-background/60 py-2">
      <p className="text-base font-extrabold">{value}</p>
      <p className="text-[10px] font-bold text-muted-foreground">{sub ? `${label} · ${sub}` : label}</p>
    </div>
  );
}

function Shortcut({
  to,
  icon: Icon,
  label,
}: {
  to: "/vault" | "/league" | "/shop" | "/feed";
  icon: typeof Dumbbell;
  label: string;
}) {
  return (
    <Link
      to={to}
      onClick={() => sfx("tap")}
      className="flex flex-col items-center gap-1 rounded-2xl border-2 border-border bg-card py-3 text-[11px] font-extrabold"
    >
      <Icon className="h-5 w-5 text-secondary" />
      {label}
    </Link>
  );
}

function Row({
  label,
  note,
  on,
  set,
  icon: Icon,
}: {
  label: string;
  note: string;
  on: boolean;
  set: (v: boolean) => void;
  icon?: typeof Music;
}) {
  return (
    <button
      onClick={() => set(!on)}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[12px] font-extrabold">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{note}</span>
      </span>
      <span
        className={`h-6 w-11 shrink-0 rounded-full border-2 transition-colors ${
          on ? "border-primary bg-primary/30" : "border-border bg-muted"
        }`}
      >
        <span
          className={`mt-[2px] block h-4 w-4 rounded-full transition-transform ${
            on ? "translate-x-5 bg-primary" : "translate-x-1 bg-muted-foreground"
          }`}
        />
      </span>
    </button>
  );
}
