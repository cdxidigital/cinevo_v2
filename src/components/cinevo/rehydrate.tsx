import { useEffect, useRef } from "react";
import { useCinevo } from "@/lib/cinevo-store";
import { loadAccountState, saveAccountState } from "@/lib/account-state";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { restoreFolderBlobs } from "@/lib/folder-handles";

const STALE_KEYS = ["cinevo-state", "cinevo-storage", "cinevo-local-v2", "cinevo-local-v3"];

export function Rehydrate() {
  const { user, isPending } = useCurrentUserState();
  const rehydratedRef = useRef(false);
  const accountLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (rehydratedRef.current) return;
    rehydratedRef.current = true;
    try {
      for (const key of STALE_KEYS) localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    void Promise.resolve(useCinevo.persist.rehydrate()).then(async () => {
      const theme = useCinevo.getState().prefs.theme || "pulse";
      document.documentElement.setAttribute("data-theme", theme);
      const restored = await restoreFolderBlobs();
      if (restored) {
        const s = useCinevo.getState();
        useCinevo.setState({ localTitles: [...s.localTitles] });
      }
    });
  }, []);

  useEffect(() => {
    if (isPending || !user || accountLoadedRef.current === user.id) return;
    accountLoadedRef.current = user.id;
    void loadAccountState().then((saved) => {
      if (saved && typeof saved === "object") {
        useCinevo.setState(saved as Partial<ReturnType<typeof useCinevo.getState>>);
      }
    }).catch(() => undefined);
  }, [isPending, user]);

  useEffect(() => {
    if (isPending || !user) return;
    let timer: number | undefined;
    const unsubscribe = useCinevo.subscribe((state) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const {
          room: _room,
          selectedId: _selectedId,
          playingId: _playingId,
          playing: _playing,
          searchOpen: _searchOpen,
          settingsOpen: _settingsOpen,
          coreOpen: _coreOpen,
          coreTab: _coreTab,
          noticesOpen: _noticesOpen,
          toast: _toast,
          ...persisted
        } = state;
        void saveAccountState({ data: { state: persisted } }).catch(() => undefined);
      }, 800);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [isPending, user]);
  return null;
}
