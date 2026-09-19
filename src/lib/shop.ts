import freezeImg from "@/assets/shop-freeze.png";
import refillImg from "@/assets/shop-refill.png";
import leagueImg from "@/assets/shop-league.png";
import skipImg from "@/assets/shop-skip.png";
import voiceImg from "@/assets/shop-voice.png";
import skinImg from "@/assets/shop-skin.png";
import boostImg from "@/assets/shop-boost.png";

export type ShopItem = {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  image: string;
  /** Grouping shown as a section header. */
  section: "power-ups" | "boosts" | "cosmetics";
  /** One-time unlocks can only be bought once. */
  oneTime?: boolean;
  /** Accent used for the card glow. */
  accent: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "cover_extension",
    name: "Streak Freeze",
    blurb: "Miss a day without losing your streak. Used automatically.",
    cost: 200,
    image: freezeImg,
    section: "power-ups",
    accent: "var(--signal)",
  },
  {
    id: "cover_integrity_refill",
    name: "Heart Refill",
    blurb: "Top your hearts back up so a tough lesson can't end your run.",
    cost: 150,
    image: refillImg,
    section: "power-ups",
    accent: "var(--destructive)",
  },
  {
    id: "handler_skip_token",
    name: "Skip Token",
    blurb: "Skip one brutal item in a lesson and keep your accuracy.",
    cost: 100,
    image: skipImg,
    section: "power-ups",
    accent: "var(--primary)",
  },
  {
    id: "xp_boost",
    name: "Double XP Boost",
    blurb: "Earn twice the XP on your next lesson. Stack them for league week.",
    cost: 180,
    image: boostImg,
    section: "boosts",
    accent: "var(--amber)",
  },
  {
    id: "league_repair",
    name: "League Repair",
    blurb: "Undo one demotion and stay in your current league.",
    cost: 300,
    image: leagueImg,
    section: "boosts",
    accent: "var(--secondary)",
  },
  {
    id: "voice_pack",
    name: "Native Voice Pack",
    blurb: "Unlock alternate native accents for every spoken line.",
    cost: 400,
    image: voiceImg,
    section: "cosmetics",
    oneTime: true,
    accent: "var(--secondary)",
  },
  {
    id: "echo_cosmetic_skin",
    name: "Tutor Style Pack",
    blurb: "Fresh outfits and looks for your language partner.",
    cost: 250,
    image: skinImg,
    section: "cosmetics",
    oneTime: true,
    accent: "var(--primary)",
  },
];

export const SHOP_SECTIONS: { id: ShopItem["section"]; label: string; note: string }[] = [
  { id: "power-ups", label: "Power-ups", note: "Keep your run alive" },
  { id: "boosts", label: "Boosts", note: "Climb faster" },
  { id: "cosmetics", label: "Unlocks", note: "Make it yours" },
];
