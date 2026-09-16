import type { Title } from "./catalog";

export type JourneyEvent = {
  id: string;
  kind: "watch" | "favorite" | "note" | "library" | "party";
  label: string;
  xp: number;
  createdAt: number;
};

export type JourneyState = {
  xp: number;
  streak: number;
  lastActiveDay: string;
  completedIds: string[];
  events: JourneyEvent[];
};

export const DEFAULT_JOURNEY: JourneyState = {
  xp: 0,
  streak: 0,
  lastActiveDay: "",
  completedIds: [],
  events: [],
};

export const BADGES = [
  { id: "first-scene", label: "First scene", detail: "Complete your first title", icon: "01" },
  { id: "double-feature", label: "Double feature", detail: "Complete two titles", icon: "02" },
  { id: "curator", label: "Curator", detail: "Save five titles to My List", icon: "05" },
  { id: "streak-3", label: "In the rhythm", detail: "Keep a 3-day viewing streak", icon: "03" },
  { id: "host", label: "Good company", detail: "Start a watch party", icon: "P" },
] as const;

export function levelForXp(xp: number) {
  return Math.max(1, Math.floor(Math.max(0, xp) / 100) + 1);
}

export function xpIntoLevel(xp: number) {
  return Math.max(0, xp) % 100;
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function awardJourney(state: JourneyState, kind: JourneyEvent["kind"], label: string, xp: number, key: string) {
  if (state.events.some((event) => event.id === key)) return state;
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const streak = state.lastActiveDay === yesterday || state.lastActiveDay === today ? Math.max(state.streak, 1) + (state.lastActiveDay === today ? -1 : 0) : 1;
  return {
    ...state,
    xp: state.xp + xp,
    streak,
    lastActiveDay: today,
    events: [{ id: key, kind, label, xp, createdAt: Date.now() }, ...state.events].slice(0, 12),
  };
}

export function completedTitleCount(progress: Record<string, number>) {
  return Object.values(progress).filter((value) => value >= 100).length;
}

export function unlockedBadges(state: JourneyState, progress: Record<string, number>, favorites: string[], party: boolean) {
  const completed = completedTitleCount(progress);
  return BADGES.map((badge) => ({
    ...badge,
    unlocked:
      badge.id === "first-scene" ? completed >= 1 :
      badge.id === "double-feature" ? completed >= 2 :
      badge.id === "curator" ? favorites.length >= 5 :
      badge.id === "streak-3" ? state.streak >= 3 : party,
  }));
}

export function titleLabel(title: Title | undefined) {
  return title?.title ?? "A new scene";
}
