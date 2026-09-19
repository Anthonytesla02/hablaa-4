import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import avatarLoadingVideo from "@/assets/habla-avatar-loading.mp4.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { syncFromCloud, scheduleCloudSave, flushCloudSave } from "@/lib/cloud-sync";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init(session: { user: { id: string } } | null) {
      if (!session) {
        void navigate({ to: "/auth" });
        return;
      }
      // Load state from cloud
      await syncFromCloud(session.user.id);
      if (cancelled) return;
      setReady(true);

      // Subscribe to store changes → debounced cloud save
      const userId = session.user.id;
      const unsub = useApp.subscribe(() => scheduleCloudSave(userId));

      // Make sure nothing is lost on reload / tab switch
      const onHide = () => flushCloudSave();
      window.addEventListener("pagehide", onHide);
      document.addEventListener("visibilitychange", onHide);

      // Listen for sign-out
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          unsub();
          void navigate({ to: "/auth" });
        }
      });

      return () => {
        unsub();
        window.removeEventListener("pagehide", onHide);
        document.removeEventListener("visibilitychange", onHide);
        authListener.subscription.unsubscribe();
      };
    }

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const cleanup = await init(data.session as any);
      if (cancelled) {
        cleanup?.();
      }
      return cleanup;
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background">
        <video
          src={avatarLoadingVideo.url}
          aria-label="Habla avatar loading"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="max-h-[80dvh] w-[min(88vw,24rem)] object-contain"
        />
      </div>
    );
  }

  return <Outlet />;
}
