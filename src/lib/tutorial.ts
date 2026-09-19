/** Interactive first-run walkthrough: tab tour → first lesson → first recording. */

export type TourStep = {
  id: string;
  /** CSS selector of the element to spotlight. Omit for a centred card. */
  target?: string;
  title: string;
  text: string;
  /** Where this step is shown. The overlay hides itself elsewhere. */
  page: "dashboard" | "session";
  /** "button" = tap Next to continue, "action" = the user must do the thing. */
  advance: "button" | "action";
  /** Label of the continue button. */
  cta?: string;
};

export const TOUR: TourStep[] = [
  {
    id: "welcome",
    page: "dashboard",
    advance: "button",
    title: "Welcome to Habla!",
    text: "I'll show you around in a few seconds, then we'll do your very first word together. Ready?",
    cta: "Show me around",
  },
  {
    id: "tab-learn",
    page: "dashboard",
    target: '[data-tour="tab-learn"]',
    advance: "button",
    title: "Learn",
    text: "This is your map. Your lesson for today always lives here, right at the top.",
  },
  {
    id: "tab-talk",
    page: "dashboard",
    target: '[data-tour="tab-talk"]',
    advance: "button",
    title: "Talk",
    text: "Real conversations. Pick a place, like a cafe or a pharmacy, and chat out loud with your tutor.",
  },
  {
    id: "tab-practice",
    page: "dashboard",
    target: '[data-tour="tab-practice"]',
    advance: "button",
    title: "Practice",
    text: "Everything you learn comes back here, one card at a time, right before you would forget it.",
  },
  {
    id: "tab-league",
    page: "dashboard",
    target: '[data-tour="tab-league"]',
    advance: "button",
    title: "League",
    text: "Your points put you on a leaderboard each week. A little friendly pressure never hurts.",
  },
  {
    id: "tab-shop",
    page: "dashboard",
    target: '[data-tour="tab-shop"]',
    advance: "button",
    title: "Shop",
    text: "Spend the coins you earn on streak savers and other helpful extras.",
  },
  {
    id: "tab-profile",
    page: "dashboard",
    target: '[data-tour="tab-profile"]',
    advance: "button",
    title: "Profile",
    text: "Your tutor, your settings, your badges and your backups all live in here.",
  },
  {
    id: "start-lesson",
    page: "dashboard",
    target: '[data-tour="start-lesson"]',
    advance: "action",
    title: "Let's begin",
    text: "That's the tour. Now tap Start today's lesson and we'll learn your first word.",
  },
  {
    id: "first-word",
    page: "session",
    target: '[data-tour="vocab-word"]',
    advance: "button",
    title: "Listen first",
    text: "Here is your first word. Listen carefully to how I say it. Tap hear again if you need it once more.",
    cta: "I heard it",
  },
  {
    id: "first-mic",
    page: "session",
    target: '[data-tour="vocab-mic"]',
    advance: "action",
    title: "Now your turn",
    text: "Tap the microphone, say the word out loud, then tap again to send it. I'll tell you how close you were.",
  },
  {
    id: "done",
    page: "session",
    advance: "button",
    title: "That's it!",
    text: "You just spoke your first word. Keep repeating each word five times and I'll guide you the whole way. You've got this!",
    cta: "Let's keep going",
  },
];

export const TOUR_STEP = Object.fromEntries(TOUR.map((s, i) => [s.id, i])) as Record<string, number>;
