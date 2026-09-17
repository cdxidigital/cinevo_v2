import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { THEMES } from "@/lib/library";
import { useCinevo } from "@/lib/cinevo-store";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const prefs = useCinevo((s) => s.prefs);
  const patchPrefs = useCinevo((s) => s.patchPrefs);
  const setTheme = useCinevo((s) => s.setTheme);
  const clearLocalData = useCinevo((s) => s.clearLocalData);
  const [confirmClear, setConfirmClear] = useState(false);

  const rows: { key: "nightMode" | "zenMode" | "focusMode"; label: string; hint: string }[] = [
    { key: "nightMode", label: "OLED night", hint: "True black surfaces" },
    { key: "zenMode", label: "Zen mode", hint: "Hide poster metadata" },
    { key: "focusMode", label: "Focus player", hint: "Quieter playback chrome" },
  ];

  return (
    <div className="house-page max-w-3xl">
      <header>
        <p className="house-kicker">Preferences</p>
        <h1>Settings</h1>
        <p className="lede">Local prefs stay on this device. Theme applies everywhere via data-theme.</p>
      </header>

      <section className="mt-8 space-y-4" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="font-display text-lg tracking-wide">
          Appearance
        </h2>
        <p className="text-sm text-cine-muted">Pick a theme. Accent and surfaces update instantly.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => {
            const selected = prefs.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setTheme(t.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  selected ? "border-cine-cyan glow-cyan bg-cine-surface" : "border-cine-border bg-cine-surface/60"
                }`}
              >
                <span className="flex items-center gap-3">
                  <i
                    className="swatch size-5 rounded-full border border-cine-border"
                    data-swatch={t.id}
                    style={{ background: t.accent }}
                  />
                  <b className="font-ui text-sm">{t.label}</b>
                </span>
                <small className="mt-2 block text-cine-faint">{"feel" in t ? t.feel : ""}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-lg tracking-wide">Playback &amp; chrome</h2>
        {rows.map((row) => (
          <label key={row.key} className="flex items-center justify-between gap-4 rounded-lg bg-cine-surface px-3 py-3">
            <span>
              <b className="block font-ui text-sm">{row.label}</b>
              <small className="text-cine-faint">{row.hint}</small>
            </span>
            <input
              type="checkbox"
              checked={prefs[row.key]}
              onChange={(e) => patchPrefs({ [row.key]: e.target.checked })}
              className="size-5 accent-cine-cyan"
            />
          </label>
        ))}
      </section>

      <section className="mt-10 rounded-lg border border-cine-danger/40 bg-cine-surface px-3 py-3">
        <b className="block font-ui text-sm">Local data</b>
        <p className="mt-1 text-xs text-cine-faint">
          Clears watch progress, My List, indexed titles, and Node pairing on this device.
        </p>
        <button
          type="button"
          className={`mt-3 h-11 w-full rounded-md font-ui font-bold ${
            confirmClear ? "bg-cine-danger text-cine-text" : "border border-cine-danger text-cine-danger"
          }`}
          onClick={() => {
            if (!confirmClear) {
              setConfirmClear(true);
              return;
            }
            clearLocalData();
            setConfirmClear(false);
          }}
        >
          {confirmClear ? "Tap again to clear everything" : "Clear all local data"}
        </button>
      </section>
    </div>
  );
}
