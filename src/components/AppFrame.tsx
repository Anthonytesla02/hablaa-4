import { Link, useRouterState } from "@tanstack/react-router";
import { useHydrated } from "@tanstack/react-router";
import { Flame, Map, MessageCircle, Dumbbell, Trophy, ShoppingBag, User, Coins, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { HandlerAvatar } from "@/components/Handler";
import { useApp, useLevel } from "@/lib/store";

const TABS = [
  { to: "/dashboard", label: "Learn", icon: Map, tour: "tab-learn" },
  { to: "/simulate", label: "Talk", icon: MessageCircle, tour: "tab-talk" },
  { to: "/vault", label: "Practice", icon: Dumbbell, tour: "tab-practice" },
  { to: "/league", label: "League", icon: Trophy, tour: "tab-league" },
  { to: "/shop", label: "Shop", icon: ShoppingBag, tour: "tab-shop" },
  { to: "/profile", label: "Profile", icon: User, tour: "tab-profile" },
] as const;

export function HudBar() {
  const xp = useApp((s) => s.xp);
  const credits = useApp((s) => s.credits);
  const streak = useApp((s) => s.streak);
  const clearance = useLevel();

  return (
    <header className="sticky top-0 z-20 border-b-2 border-border/70 bg-background/90 backdrop-blur-md">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-muted-foreground">
            {clearance.current.codename} · Level {clearance.current.ilr_equivalent}
          </p>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-secondary transition-all duration-500"
              style={{ width: `${Math.max(4, Math.round(clearance.progress * 100))}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[12px] font-extrabold">
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
            <Flame className="h-3.5 w-3.5" />
            {streak}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-amber/20 px-2 py-1 text-foreground">
            <Zap className="h-3.5 w-3.5" />
            {xp} XP
          </span>
          <span className="flex items-center gap-1 rounded-full bg-secondary/20 px-2 py-1 text-foreground">
            <Coins className="h-3.5 w-3.5" />
            {credits}
          </span>
        </div>
      </div>
    </header>
  );
}

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-20 border-t-2 border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="grid grid-cols-6 px-1 py-1">
        {TABS.map((t) => {
          const active = pathname === t.to;
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                data-tour={t.tour}
                className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 transition-colors ${
                  active ? "bg-primary/12 text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "scale-110 transition-transform" : ""}`}
                  strokeWidth={active ? 2.6 : 2}
                />
                <span className="text-[9px] font-extrabold">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppFrame({ children, tabs = true }: { children: ReactNode; tabs?: boolean }) {
  return (
    <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
      {tabs && <HudBar />}
      <main className="flex-1 px-4 pb-6 pt-4">{children}</main>
      {tabs && <TabBar />}
      <HandlerAvatar offset={tabs} />
    </div>
  );
}

/** Gate client-persisted state so SSR and first paint agree. */
export function Hydrated({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated)
    return (
      <div className="topo flex min-h-[100dvh] items-center justify-center">
        <p className="bounce-soft text-sm font-extrabold text-muted-foreground">Warming up your session…</p>
      </div>
    );
  return <>{children}</>;
}
