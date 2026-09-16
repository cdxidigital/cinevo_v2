import { create } from "zustand";
import { persist } from "zustand/middleware";
import { byMood, type Mood, type Title } from "./catalog";
import type { LibSource, LibraryTitle, ThemeId } from "./library";
import { THEMES, makePoster } from "./library";
import type { PlexServer } from "./plex";
import {
  DEFAULT_DASHBOARD_WIDGETS,
  sanitizeDashboardWidgets,
  type DashboardWidgetId,
} from "./dashboard";
import { awardJourney, DEFAULT_JOURNEY, type JourneyState } from "./journey";

export type Room = "stage" | "browse" | "movies" | "shows" | "sidebar";

export type Preferences = {
  nightMode: boolean;
  zenMode: boolean;
  focusMode: boolean;
  audioHints: boolean;
  theme: ThemeId;
  dashboardWidgets: DashboardWidgetId[];
};

export type SourceFilter = "all" | "folder" | "plex" | "jellyfin";

export type Invite = {
  id: string;
  token: string;
  name: string;
  days: number;
  status: "active" | "paused" | "revoked";
  createdAt: number;
  expiresAt: number;
  libraries: string[];
};

export type NoticeCategory = "library" | "sharing" | "privacy" | "account";

export type Notice = {
  id: string;
  category: NoticeCategory;
  title: string;
  message: string;
  createdAt: number;
  readAt: number | null;
  href?: string;
};

export type Note = {
  id: string;
  titleId: string;
  body: string;
  createdAt: number;
};

export type Party = { titleId: string; with: string } | null;

type Library = { id: string; name: string; kind: string; selected: boolean };

export type CoreTab = "libraries" | "sharing" | "stewardship" | "ai" | "operations";

type CinevoState = {
  room: Room;
  selectedId: string | null;
  playingId: string | null;
  playing: boolean;
  progress: Record<string, number>;
  favorites: string[];
  tonight: string[];
  notes: Note[];
  party: Party;
  mood: Mood;
  searchOpen: boolean;
  settingsOpen: boolean;
  coreOpen: boolean;
  coreTab: CoreTab;
  noticesOpen: boolean;
  toast: string;
  prefs: Preferences;
  libraries: Library[];
  invites: Invite[];
  notices: Notice[];
  aiConsent: boolean;
  nodeUrl: string;
  nodeToken: string;
  nodeDevice: string;
  plexClientId: string;
  plexToken: string;
  plexUser: string;
  plexServers: PlexServer[];
  sources: LibSource[];
  localTitles: LibraryTitle[];
  remoteTitles: LibraryTitle[];
  sourceFilter: SourceFilter;
  journey: JourneyState;
  setRoom: (room: Room) => void;
  openTitle: (id: string) => void;
  closeTitle: () => void;
  play: (id: string) => void;
  stopPlay: () => void;
  togglePlay: () => void;
  setProgress: (id: string, value: number) => void;
  toggleFavorite: (id: string) => void;
  addTonight: (id: string) => void;
  removeTonight: (id: string) => void;
  addNote: (titleId: string, body: string) => void;
  removeNote: (id: string) => void;
  startParty: (titleId: string, withName: string) => void;
  endParty: () => void;
  setMood: (mood: Mood) => void;
  shufflePlay: () => void;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCoreOpen: (open: boolean, tab?: CoreTab) => void;
  setCoreTab: (tab: CoreTab) => void;
  setNoticesOpen: (open: boolean) => void;
  flash: (msg: string) => void;
  notify: (input: Omit<Notice, "id" | "createdAt" | "readAt">) => void;
  markNoticeRead: (id: string) => void;
  markAllNoticesRead: () => void;
  dismissNotice: (id: string) => void;
  clearNotices: () => void;
  patchPrefs: (p: Partial<Preferences>) => void;
  setTheme: (theme: ThemeId) => void;
  setDashboardWidgets: (widgets: DashboardWidgetId[]) => void;
  toggleLibrary: (id: string) => void;
  addInvite: (name: string, days: number) => Invite;
  setInviteStatus: (id: string, status: Invite["status"]) => void;
  setAiConsent: (on: boolean) => void;
  setNodeUrl: (url: string) => void;
  setNodeSession: (token: string, deviceId: string) => void;
  clearNodeSession: () => void;
  setPlexSession: (token: string, username: string, servers: PlexServer[], clientId: string) => void;
  setPlexServers: (servers: PlexServer[]) => void;
  clearPlexSession: () => void;
  addFolderTitles: (titles: LibraryTitle[], source: LibSource) => void;
  addRemoteTitles: (titles: LibraryTitle[], source: LibSource) => void;
  removeSource: (id: string) => void;
  setSourceFilter: (filter: SourceFilter) => void;
  clearLocalData: () => void;
  awardJourney: (kind: JourneyState["events"][number]["kind"], label: string, xp: number, key: string) => void;
};

export const DEFAULT_LIBRARIES: Library[] = [];

const DEFAULT_PREFS: Preferences = {
  nightMode: true,
  zenMode: false,
  focusMode: false,
  audioHints: true,
  theme: "pulse",
  dashboardWidgets: [...DEFAULT_DASHBOARD_WIDGETS],
};

const FRESH: Pick<
  CinevoState,
  | "progress"
  | "favorites"
  | "invites"
  | "notices"
  | "selectedId"
  | "playingId"
  | "playing"
  | "tonight"
  | "notes"
  | "party"
  | "mood"
  | "sources"
  | "localTitles"
  | "remoteTitles"
  | "sourceFilter"
  | "plexToken"
  | "plexUser"
  | "plexServers"
> = {
  progress: {},
  favorites: [],
  invites: [],
  notices: [],
  selectedId: null,
  playingId: null,
  playing: false,
  tonight: [],
  notes: [],
  party: null,
  mood: "all",
  sources: [],
  localTitles: [],
  remoteTitles: [],
  sourceFilter: "all",
  plexToken: "",
  plexUser: "",
  plexServers: [],
};

function catalogPool(get: () => CinevoState): Title[] {
  return [...get().localTitles, ...get().remoteTitles];
}

function inviteToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 22);
  }
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function hydrateInvites(raw: unknown): Invite[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item as Partial<Invite>;
    const createdAt = Number(row.createdAt) || Date.now();
    const days = Number(row.days) || 7;
    return {
      id: String(row.id || `inv-${createdAt}`),
      token: String(row.token || inviteToken()),
      name: String(row.name || "Friend"),
      days,
      status: row.status === "paused" || row.status === "revoked" ? row.status : "active",
      createdAt,
      expiresAt: Number(row.expiresAt) || createdAt + days * 86_400_000,
      libraries: Array.isArray(row.libraries) ? row.libraries.map(String) : [],
    };
  });
}

export const useCinevo = create<CinevoState>()(
  persist(
    (set, get) => ({
      room: "stage",
      searchOpen: false,
      settingsOpen: false,
      coreOpen: false,
      coreTab: "libraries",
      noticesOpen: false,
      toast: "",
      prefs: DEFAULT_PREFS,
      libraries: [],
      aiConsent: false,
      nodeUrl: "http://127.0.0.1:48184",
      nodeToken: "",
      nodeDevice: "",
      plexClientId: "",
      ...FRESH,
      journey: DEFAULT_JOURNEY,
      setRoom: (room) => set({ room, selectedId: null }),
      openTitle: (id) => set({ selectedId: id }),
      closeTitle: () => set({ selectedId: null }),
      play: (id) => {
        const p = get().progress[id] ?? 0;
        set({
          playingId: id,
          playing: true,
          selectedId: null,
          progress: p >= 100 ? { ...get().progress, [id]: 0 } : get().progress,
        });
      },
      stopPlay: () => set({ playingId: null, playing: false }),
      togglePlay: () => {
        const id = get().playingId;
        if (id && (get().progress[id] ?? 0) >= 100) {
          get().play(id);
          return;
        }
        set({ playing: !get().playing });
      },
      setProgress: (id, value) => {
        const next = Math.max(0, Math.min(100, value));
        const previous = get().progress[id] ?? 0;
        set({ progress: { ...get().progress, [id]: next } });
        if (previous < 100 && next >= 100) {
          get().awardJourney("watch", "Completed a title", 40, `watch:${id}`);
        }
      },
      awardJourney: (kind, label, xp, key) =>
        set({ journey: awardJourney(get().journey, kind, label, xp, key) }),
      toggleFavorite: (id) => {
        const has = get().favorites.includes(id);
        set({
          favorites: has ? get().favorites.filter((x) => x !== id) : [...get().favorites, id],
        });
        if (!has) get().awardJourney("favorite", "Saved a title to My List", 10, `favorite:${id}`);
        get().flash(has ? "Removed from My List" : "Saved to My List");
      },
      addTonight: (id) => {
        if (get().tonight.includes(id)) {
          get().flash("Already in tonight");
          return;
        }
        if (get().tonight.length >= 8) {
          get().flash("Tonight is full");
          return;
        }
        set({ tonight: [...get().tonight, id] });
        get().flash("Queued for tonight");
      },
      removeTonight: (id) => set({ tonight: get().tonight.filter((x) => x !== id) }),
      addNote: (titleId, body) => {
        const text = body.trim().slice(0, 280);
        if (!text) return;
        set({
          notes: [
            { id: `n-${Date.now()}`, titleId, body: text, createdAt: Date.now() },
            ...get().notes,
          ].slice(0, 40),
        });
        get().awardJourney("note", "Added a private note", 12, `note:${titleId}:${text}`);
        get().flash("Note saved");
      },
      removeNote: (id) => set({ notes: get().notes.filter((n) => n.id !== id) }),
      startParty: (titleId, withName) => {
        set({ party: { titleId, with: withName.trim() } });
        get().awardJourney("party", "Started a watch party", 25, `party:${titleId}:${withName.trim()}`);
        get().play(titleId);
        get().flash(withName.trim() ? `Watching with ${withName.trim()}` : "Private watch started");
      },
      endParty: () => set({ party: null }),
      setMood: (mood) => set({ mood }),
      shufflePlay: () => {
        const pool = byMood(get().mood, catalogPool(get));
        const fresh = pool.filter((t) => {
          const p = get().progress[t.id];
          return p == null || p >= 100;
        });
        const list = fresh.length ? fresh : pool;
        const pick = list[Math.floor(Math.random() * list.length)];
        if (pick) get().play(pick.id);
        else get().flash("Add a library first");
      },
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setCoreOpen: (coreOpen, tab) => set({ coreOpen, coreTab: tab ?? get().coreTab }),
      setCoreTab: (coreTab) => set({ coreTab }),
      setNoticesOpen: (noticesOpen) => set({ noticesOpen }),
      flash: (toast) => {
        set({ toast });
        if (typeof window === "undefined") return;
        window.setTimeout(() => {
          if (get().toast === toast) set({ toast: "" });
        }, 2200);
      },
      notify: (input) => {
        const notice: Notice = {
          id: `nt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: Date.now(),
          readAt: null,
          ...input,
        };
        set({ notices: [notice, ...get().notices].slice(0, 40) });
      },
      markNoticeRead: (id) =>
        set({
          notices: get().notices.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: Date.now() } : n)),
        }),
      markAllNoticesRead: () =>
        set({
          notices: get().notices.map((n) => (n.readAt ? n : { ...n, readAt: Date.now() })),
        }),
      dismissNotice: (id) => set({ notices: get().notices.filter((n) => n.id !== id) }),
      clearNotices: () => set({ notices: [] }),
      patchPrefs: (p) => set({ prefs: { ...get().prefs, ...p } }),
      setTheme: (theme) => {
        set({ prefs: { ...get().prefs, theme } });
        if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", theme);
      },
      setDashboardWidgets: (dashboardWidgets) =>
        set({ prefs: { ...get().prefs, dashboardWidgets: sanitizeDashboardWidgets(dashboardWidgets) } }),
      toggleLibrary: (id) =>
        set({
          libraries: get().libraries.map((l) =>
            l.id === id ? { ...l, selected: !l.selected } : l,
          ),
          sources: get().sources.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)),
        }),
      addInvite: (name, days) => {
        const createdAt = Date.now();
        const invite: Invite = {
          id: `inv-${createdAt}`,
          token: inviteToken(),
          name: name.trim() || "Friend",
          days,
          status: "active",
          createdAt,
          expiresAt: createdAt + days * 86_400_000,
          libraries: get().sources.filter((s) => s.selected).map((s) => s.id),
        };
        set({ invites: [invite, ...get().invites] });
        get().notify({
          category: "sharing",
          title: "Private invitation created",
          message: `${invite.name} has ${days} days of access to selected libraries.`,
          href: "/app?core=sharing",
        });
        return invite;
      },
      setInviteStatus: (id, status) => {
        const current = get().invites.find((i) => i.id === id);
        set({
          invites: get().invites.map((i) => (i.id === id ? { ...i, status } : i)),
        });
        if (current) {
          get().notify({
            category: "sharing",
            title: status === "revoked" ? "Invitation revoked" : status === "paused" ? "Invitation paused" : "Invitation restored",
            message: `${current.name} is now ${status}.`,
            href: "/app?core=sharing",
          });
        }
      },
      setAiConsent: (aiConsent) => {
        set({ aiConsent });
        get().notify({
          category: "privacy",
          title: aiConsent ? "AI concierge enabled" : "AI concierge disabled",
          message: aiConsent
            ? "CINEVO may use selected library metadata when you ask."
            : "Metadata assistance is off until you opt in again.",
          href: "/app?core=ai",
        });
      },
      setNodeUrl: (nodeUrl) => set({ nodeUrl }),
      setNodeSession: (nodeToken, nodeDevice) => set({ nodeToken, nodeDevice }),
      clearNodeSession: () => set({ nodeToken: "", nodeDevice: "" }),
      setPlexSession: (plexToken, plexUser, plexServers, plexClientId) =>
        set({ plexToken, plexUser, plexServers, plexClientId }),
      setPlexServers: (plexServers) => set({ plexServers }),
      clearPlexSession: () => set({ plexToken: "", plexUser: "", plexServers: [] }),
      addFolderTitles: (titles, source) => {
        const existing = new Set(get().localTitles.map((t) => t.id));
        const next = titles.filter((t) => !existing.has(t.id));
        const sources = get().sources.filter((s) => s.id !== source.id);
        set({
          localTitles: [...next, ...get().localTitles].slice(0, 200),
          sources: [{ ...source, count: next.length + (get().localTitles.filter((t) => t.sourceLabel === source.name).length) }, ...sources],
        });
        get().flash(next.length ? `Added ${next.length} titles from ${source.name}` : "No new video files in that folder");
        if (next.length) {
          get().notify({
            category: "library",
            title: "Folder indexed",
            message: `${next.length} titles from ${source.name} are now in CINEVO.`,
            href: "/app?core=libraries",
          });
        }
      },
      addRemoteTitles: (titles, source) => {
        const existing = new Set(get().remoteTitles.map((t) => t.id));
        const next = titles.filter((t) => !existing.has(t.id));
        const sources = get().sources.filter((s) => s.id !== source.id);
        set({
          remoteTitles: [...next, ...get().remoteTitles].slice(0, 300),
          sources: [{ ...source, count: next.length }, ...sources],
        });
        get().flash(next.length ? `Imported ${next.length} titles from ${source.name}` : "No titles in that section");
        if (next.length) {
          get().notify({
            category: "library",
            title: `${source.kind === "plex" ? "Plex" : "Jellyfin"} library imported`,
            message: `${next.length} titles from ${source.name} are ready to browse.`,
            href: "/app?core=libraries",
          });
        }
      },
      removeSource: (id) => {
        const src = get().sources.find((s) => s.id === id);
        const localTitles = get().localTitles.filter((t) => t.sourceLabel !== src?.name);
        const remoteTitles = get().remoteTitles.filter((t) => t.sourceLabel !== src?.name);
        const keep = new Set([...localTitles, ...remoteTitles].map((t) => t.id));
        const sources = get().sources.filter((s) => s.id !== id);
        set({
          sources,
          localTitles,
          remoteTitles,
          sourceFilter: sources.length <= 1 ? "all" : get().sourceFilter,
          tonight: get().tonight.filter((tid) => keep.has(tid)),
          favorites: get().favorites.filter((tid) => keep.has(tid)),
        });
        void import("./folder-handles").then((m) => m.deleteFolderHandle(id));
        get().flash("Source removed");
      },
      setSourceFilter: (sourceFilter) => set({ sourceFilter }),
      clearLocalData: () => {
        set({
          ...FRESH,
          journey: DEFAULT_JOURNEY,
          libraries: [],
          searchOpen: false,
          coreOpen: false,
          noticesOpen: false,
          nodeToken: "",
          nodeDevice: "",
          plexToken: "",
          plexUser: "",
          plexServers: [],
          prefs: { ...get().prefs, theme: get().prefs.theme, dashboardWidgets: [...DEFAULT_DASHBOARD_WIDGETS] },
        });
        try {
          localStorage.removeItem("cinevo-state");
          localStorage.removeItem("cinevo-storage");
        } catch {
          /* ignore quota / private mode */
        }
        get().flash("Local data cleared");
      },
    }),
    {
      name: "cinevo-local-v4",
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CinevoState>;
        const theme = p.prefs?.theme && THEMES.some((t) => t.id === p.prefs?.theme) ? p.prefs.theme : "pulse";
        return {
          ...current,
          ...p,
          tonight: Array.isArray(p.tonight) ? p.tonight : [],
          notes: Array.isArray(p.notes) ? p.notes : [],
          party: p.party ?? null,
          mood: p.mood ?? "all",
          nodeUrl: p.nodeUrl || "http://127.0.0.1:48184",
          nodeToken: p.nodeToken ?? "",
          nodeDevice: p.nodeDevice ?? "",
          plexClientId: p.plexClientId ?? "",
          plexToken: p.plexToken ?? "",
          plexUser: p.plexUser ?? "",
          plexServers: Array.isArray(p.plexServers) ? p.plexServers : [],
          sources: Array.isArray(p.sources) ? p.sources : [],
          invites: hydrateInvites(p.invites),
          notices: Array.isArray(p.notices) ? p.notices : [],
          localTitles: Array.isArray(p.localTitles)
            ? p.localTitles.map((t) => ({
                ...t,
                cast: t.cast ?? [],
                genres: t.genres?.length ? t.genres : ["Home library"],
                poster:
                  t.poster && !t.poster.startsWith("data:")
                    ? t.poster
                    : makePoster(t.title, t.accent || "cyan"),
              }))
            : [],
          remoteTitles: Array.isArray(p.remoteTitles)
            ? p.remoteTitles.map((t) => ({
                ...t,
                cast: t.cast ?? [],
                genres: t.genres?.length ? t.genres : [t.genre || "Library"],
              }))
            : [],
          sourceFilter:
            Array.isArray(p.sources) && p.sources.length > 1 &&
            (p.sourceFilter === "folder" || p.sourceFilter === "plex" || p.sourceFilter === "jellyfin")
              ? p.sourceFilter
              : "all",
          journey: {
            ...DEFAULT_JOURNEY,
            ...(p.journey ?? {}),
            completedIds: Array.isArray(p.journey?.completedIds) ? p.journey.completedIds : [],
            events: Array.isArray(p.journey?.events) ? p.journey.events : [],
          },
          prefs: {
            ...DEFAULT_PREFS,
            ...p.prefs,
            theme,
            dashboardWidgets: sanitizeDashboardWidgets(p.prefs?.dashboardWidgets),
            audioHints: p.prefs?.audioHints ?? true,
          },
        };
      },
      partialize: (s) => ({
        progress: s.progress,
        journey: s.journey,
        favorites: s.favorites,
        prefs: s.prefs,
        libraries: s.libraries,
        invites: s.invites,
        notices: s.notices,
        aiConsent: s.aiConsent,
        tonight: s.tonight,
        notes: s.notes,
        party: s.party,
        mood: s.mood,
        nodeUrl: s.nodeUrl,
        nodeToken: s.nodeToken,
        nodeDevice: s.nodeDevice,
        plexClientId: s.plexClientId,
        plexToken: s.plexToken,
        plexUser: s.plexUser,
        plexServers: s.plexServers,
        sources: s.sources,
        localTitles: s.localTitles.map((t) => ({
          ...t,
          poster: t.poster?.startsWith("data:") ? "" : t.poster,
        })),
        remoteTitles: s.remoteTitles,
        sourceFilter: s.sourceFilter,
      }),
    },
  ),
);

export function titleById(id: string | null): Title | undefined {
  if (!id) return undefined;
  const s = useCinevo.getState();
  return s.localTitles.find((t) => t.id === id) ?? s.remoteTitles.find((t) => t.id === id);
}

export function libraryPool(): Title[] {
  const s = useCinevo.getState();
  return [...s.localTitles, ...s.remoteTitles];
}

export function inviteByToken(token: string | undefined) {
  if (!token) return undefined;
  return useCinevo.getState().invites.find((i) => i.token === token);
}
