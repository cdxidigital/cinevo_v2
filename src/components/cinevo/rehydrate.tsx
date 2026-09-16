import { useEffect } from "react";
import { useCinevo } from "@/lib/cinevo-store";
import { loadAccountState, saveAccountState } from "@/lib/account-state";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { restoreFolderBlobs } from "@/lib/folder-handles";

const STALE_KEYS = ["cinevo-state", "cinevo-storage", "cinevo-local-v2", "cinevo-local-v3"];

export function Rehydrate() {
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    try {
      for (const key of STALE_KEYS) localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    void Promise.resolve(useCinevo.persist.rehydrate()).then(async () => {
      if (!isPending && user) {
        try {
          const saved = await loadAccountState();
          if (saved && typeof saved === "object") {
            useCinevo.setState(saved as Partial<ReturnType<typeof useCinevo.getState>>);
          }
        } catch {
          // Signed-out and offline sessions continue with local state.
        }
      }
      const theme = useCinevo.getState().prefs.theme || "pulse";
      document.documentElement.setAttribute("data-theme", theme);
      const restored = await restoreFolderBlobs();
      if (restored) {
        const s = useCinevo.getState();
        useCinevo.setState({ localTitles: [...s.localTitles] });
      }
    });
  }, [isPending, user]);

  useEffect(() => {
    if (isPending || !user) return;
    let timer: number | undefined;
    const unsubscribe = useCinevo.subscribe((state) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const { room, selectedId, playingId, playing, searchOpen, settingsOpen, coreOpen, coreTab, noticesOpen, toast, ...persisted } = state;
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
