import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import llamaAvatar from "@/assets/habla-llama.png";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    view: z.enum(["signup", "signin"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Create Your Habla Account" },
      {
        name: "description",
        content: "Create a Habla account or sign in to start speaking Spanish and sync your progress.",
      },
      { property: "og:title", content: "Create Your Habla Account" },
      {
        property: "og:description",
        content: "Start speaking Spanish with an AI tutor and keep your learning progress in sync.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type AuthView = "welcome" | "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [view, setView] = useState<AuthView>(search.view ?? "welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) void navigate({ to: "/start" });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) void navigate({ to: "/start" });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  function openForm(nextView: Exclude<AuthView, "welcome">) {
    setMessage(null);
    setView(nextView);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (view === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage({ kind: "success", text: "Check your email to confirm your account." });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "We couldn't complete that request.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setMessage(null);
    setGoogleLoading(true);

    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) void navigate({ to: "/start" });
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Google sign-in failed.",
      });
      setGoogleLoading(false);
    }
  }

  if (view === "welcome") {
    return (
      <main className="auth-welcome flex min-h-[100dvh] justify-center overflow-hidden bg-background text-foreground">
        <div className="flex w-full max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
          <Link
            to="/"
            aria-label="Back to Habla home"
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-border bg-card text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <section className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <img
              src={llamaAvatar}
              alt="Habla llama guide wearing a turquoise scarf and backpack"
              width={768}
              height={768}
              className="auth-mascot h-auto w-[min(66vw,17rem)] object-contain"
            />
            <h1 className="mt-1 text-4xl font-black text-primary">habla</h1>
            <p className="mt-2 text-base font-bold text-muted-foreground">
              Your world is ready to talk.
            </p>
          </section>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={() => void navigate({ to: "/introduction" })}
              className="btn-3d h-14 w-full rounded-2xl text-sm font-black uppercase"
            >
              Get started
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openForm("signin")}
              className="h-14 w-full rounded-2xl border-2 border-border bg-card text-sm font-black uppercase text-primary hover:bg-accent hover:text-primary"
            >
              I already have an account
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const isSignup = view === "signup";

  return (
    <main className="topo flex min-h-[100dvh] justify-center">
      <div className="flex w-full max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Back to account options"
          onClick={() => {
            setView("welcome");
            setMessage(null);
          }}
          className="rounded-full"
        >
          <ArrowLeft />
        </Button>

        <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-6">
          <img
            src={llamaAvatar}
            alt=""
            aria-hidden="true"
            className="mx-auto h-24 w-24 object-contain"
          />
          <div className="mt-2 text-center">
            <p className="text-sm font-black text-primary">Habla</p>
            <h1 className="mt-1 text-2xl font-black text-foreground">
              {isSignup ? "Start speaking today" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSignup
                ? "Create your account and meet your first tutor."
                : "Sign in to continue your language journey."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="mt-7 h-13 w-full rounded-2xl border-2 bg-card font-extrabold"
          >
            {googleLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06a6.43 6.43 0 0 1-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.62 10.62 0 0 0 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84A6.43 6.43 0 0 1 12 5.38Z" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-extrabold uppercase text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="sr-only">Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="h-13 w-full rounded-2xl border-2 border-input bg-card px-4 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="sr-only">Password</span>
              <input
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="h-13 w-full rounded-2xl border-2 border-input bg-card px-4 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            {message && (
              <p
                role="status"
                className={`rounded-xl px-3 py-2 text-xs font-bold ${
                  message.kind === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-secondary/15 text-foreground"
                }`}
              >
                {message.text}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-3d h-14 w-full rounded-2xl font-black"
            >
              {loading ? <Loader2 className="animate-spin" /> : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            onClick={() => openForm(isSignup ? "signin" : "signup")}
            className="mt-3 w-full text-xs font-extrabold text-muted-foreground"
          >
            {isSignup ? "Already have an account? Sign in" : "New here? Create an account"}
          </Button>
        </section>
      </div>
    </main>
  );
}