import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { SHOP_ITEMS, SHOP_SECTIONS, type ShopItem } from "@/lib/shop";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/sfx";
import coinsImg from "@/assets/shop-coins.png";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({
    meta: [
      { title: "Shop — Habla" },
      {
        name: "description",
        content: "Spend credits on streak freezes, heart refills, XP boosts and tutor unlocks.",
      },
      { property: "og:title", content: "Shop — Habla" },
      { property: "og:description", content: "Trade credits for power-ups that keep your streak alive." },
    ],
  }),
  component: () => (
    <Hydrated>
      <ShopPage />
    </Hydrated>
  ),
});

const BURST = Array.from({ length: 14 }, (_, i) => i);

function CoinBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      {BURST.map((i) => {
        const angle = (i / BURST.length) * Math.PI * 2;
        const dist = 90 + (i % 3) * 26;
        return (
          <span
            key={i}
            className="absolute h-3 w-3 rounded-full"
            style={{
              background: i % 2 ? "var(--amber)" : "var(--secondary)",
              animation: `shop-burst 780ms cubic-bezier(.16,.9,.3,1) ${i * 12}ms forwards`,
              // @ts-expect-error custom props
              "--bx": `${Math.cos(angle) * dist}px`,
              "--by": `${Math.sin(angle) * dist}px`,
            }}
          />
        );
      })}
    </div>
  );
}

function ItemCard({ item, owned, onPick }: { item: ShopItem; owned: number; onPick: () => void }) {
  const credits = useApp((s) => s.credits);
  const soldOut = !!item.oneTime && owned > 0;
  const affordable = credits >= item.cost;

  return (
    <button
      onClick={onPick}
      disabled={soldOut}
      className="group relative flex w-full flex-col items-center gap-2 overflow-hidden rounded-3xl border-2 border-border bg-card p-3 text-center shadow-[0_4px_0_0_var(--border)] transition-transform active:translate-y-0.5 active:shadow-none disabled:opacity-60"
    >
      <span
        className="absolute -top-10 h-24 w-24 rounded-full blur-2xl opacity-40"
        style={{ background: item.accent }}
      />
      {owned > 0 && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-extrabold text-secondary-foreground">
          {item.oneTime ? "OWNED" : `x${owned}`}
        </span>
      )}
      <img
        src={item.image}
        alt={item.name}
        loading="lazy"
        width={816}
        height={816}
        className="relative h-20 w-20 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-110"
      />
      <span className="relative text-[13px] font-extrabold leading-tight">{item.name}</span>
      <span className="relative line-clamp-2 text-[10px] leading-snug text-muted-foreground">
        {item.blurb}
      </span>
      <span
        className={`relative mt-1 flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold ${
          soldOut
            ? "bg-muted text-muted-foreground"
            : affordable
              ? "bg-primary/12 text-primary"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {soldOut ? (
          <>
            <Check className="h-3.5 w-3.5" /> Unlocked
          </>
        ) : (
          <>
            <img src={coinsImg} alt="" width={816} height={816} className="h-3.5 w-3.5 object-contain" />
            {item.cost}
          </>
        )}
      </span>
    </button>
  );
}

function ShopPage() {
  const credits = useApp((s) => s.credits);
  const inventory = useApp((s) => s.inventory);
  const purchase = useApp((s) => s.purchase);

  const [picked, setPicked] = useState<ShopItem | null>(null);
  const [bought, setBought] = useState<ShopItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bought) return;
    const t = setTimeout(() => setBought(null), 1800);
    return () => clearTimeout(t);
  }, [bought]);

  function confirm(item: ShopItem) {
    if (!purchase(item.id, item.cost)) {
      setError("Not enough credits — finish a lesson to earn more.");
      sfx("wrong");
      return;
    }
    sfx("levelup");
    setPicked(null);
    setBought(item);
  }

  return (
    <AppFrame>
      <style>{`
        @keyframes shop-burst { 0%{transform:translate(0,0) scale(.4);opacity:1}
          100%{transform:translate(var(--bx),var(--by)) scale(1);opacity:0} }
        @keyframes shop-pop { 0%{transform:scale(.3) rotate(-14deg);opacity:0}
          55%{transform:scale(1.18) rotate(6deg);opacity:1}
          100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes shop-rise { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Shop</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Earn 1 credit per 20 XP, plus daily check-ins.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border-2 border-border bg-card px-3 py-1.5 text-sm font-extrabold">
          <img src={coinsImg} alt="Credits" width={816} height={816} className="h-5 w-5 object-contain" />
          {credits}
        </span>
      </div>

      {SHOP_SECTIONS.map((sec) => {
        const items = SHOP_ITEMS.filter((i) => i.section === sec.id);
        if (!items.length) return null;
        return (
          <section key={sec.id} className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-extrabold">{sec.label}</h2>
              <span className="text-[10px] font-bold text-muted-foreground">{sec.note}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  owned={inventory[item.id] ?? 0}
                  onPick={() => {
                    sfx("tap");
                    setError(null);
                    setPicked(item);
                  }}
                />
              ))}
            </div>
          </section>
        );
      })}

      {picked && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/40 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-t-3xl border-t-2 border-border bg-card p-5 pb-8"
            style={{ animation: "shop-rise 260ms ease-out" }}
          >
            <button
              onClick={() => setPicked(null)}
              aria-label="Close"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={picked.image}
              alt={picked.name}
              width={816}
              height={816}
              className="mx-auto h-32 w-32 object-contain drop-shadow-lg"
              style={{ animation: "shop-pop 420ms ease-out" }}
            />
            <h3 className="mt-3 text-center text-lg font-extrabold">{picked.name}</h3>
            <p className="mt-1 text-center text-xs text-muted-foreground">{picked.blurb}</p>
            {error && <p className="mt-3 text-center text-xs font-bold text-destructive">{error}</p>}
            <button
              onClick={() => confirm(picked)}
              disabled={credits < picked.cost}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-[0_4px_0_0_color-mix(in_oklab,var(--primary),black_22%)] transition-transform active:translate-y-1 active:shadow-none disabled:opacity-50"
            >
              <img src={coinsImg} alt="" width={816} height={816} className="h-5 w-5 object-contain" />
              Buy for {picked.cost}
            </button>
            <p className="mt-2 text-center text-[10px] font-bold text-muted-foreground">
              Balance after: {Math.max(0, credits - picked.cost)} credits
            </p>
          </div>
        </div>
      )}

      {bought && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 backdrop-blur-sm">
          <div className="relative grid place-items-center">
            <CoinBurst />
            <img
              src={bought.image}
              alt={bought.name}
              width={816}
              height={816}
              className="h-36 w-36 object-contain drop-shadow-2xl"
              style={{ animation: "shop-pop 520ms cubic-bezier(.2,1.4,.4,1)" }}
            />
            <p
              className="mt-4 flex items-center gap-1.5 text-base font-extrabold text-background"
              style={{ animation: "shop-rise 400ms 160ms both" }}
            >
              <Sparkles className="h-4 w-4" />
              {bought.name} acquired!
            </p>
          </div>
        </div>
      )}
    </AppFrame>
  );
}
