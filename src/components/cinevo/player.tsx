import { useEffect, useRef, useState } from "react";
import { Expand, Pause, Play, Subtitles, Volume2, VolumeX, X } from "lucide-react";
import { titleById, useCinevo } from "@/lib/cinevo-store";
import { mediaUrl } from "@/lib/library";
import { nodeStreamUrl } from "@/lib/node-client";

export function Player() {
  const playingId = useCinevo((s) => s.playingId);
  const playing = useCinevo((s) => s.playing);
  const progress = useCinevo((s) => (s.playingId ? s.progress[s.playingId] ?? 0 : 0));
  const focusMode = useCinevo((s) => s.prefs.focusMode);
  const play = useCinevo((s) => s.play);
  const togglePlay = useCinevo((s) => s.togglePlay);
  const stopPlay = useCinevo((s) => s.stopPlay);
  const setProgress = useCinevo((s) => s.setProgress);
  const flash = useCinevo((s) => s.flash);
  const title = titleById(playingId);
  const nodeUrl = useCinevo((s) => s.nodeUrl);
  const nodeToken = useCinevo((s) => s.nodeToken);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [chrome, setChrome] = useState(true);
  const localFile = title ? mediaUrl(title.id) : undefined;
  const file = localFile ?? (title && nodeToken && (title.source === "plex" || title.source === "jellyfin")
    ? nodeStreamUrl(nodeUrl, nodeToken, title.id, title.connectionId)
    : undefined);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !file) return;
    video.muted = muted;
    if (playing) void video.play().catch(() => useCinevo.setState({ playing: false }));
    else video.pause();
  }, [playing, file, playingId, muted]);

  useEffect(() => {
    if (!playing || !file) {
      setChrome(true);
      return;
    }
    let timer = window.setTimeout(() => setChrome(false), 2200);
    const bump = () => {
      setChrome(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChrome(false), 2200);
    };
    window.addEventListener("mousemove", bump);
    window.addEventListener("touchstart", bump);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("touchstart", bump);
    };
  }, [playing, file]);

  const seek = (value: number) => {
    if (!title) return;
    setProgress(title.id, value);
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = (value / 100) * video.duration;
    }
  };

  const onToggle = () => {
    if (!title) return;
    const video = videoRef.current;
    if ((progress >= 100 || video?.ended) && video && file) {
      video.currentTime = 0;
      setProgress(title.id, 0);
      useCinevo.setState({ playing: true });
      void video.play().catch(() => useCinevo.setState({ playing: false }));
      return;
    }
    if (video && file) {
      if (video.paused) {
        useCinevo.setState({ playing: true });
        void video.play().catch(() => useCinevo.setState({ playing: false }));
      } else {
        video.pause();
        useCinevo.setState({ playing: false });
      }
      return;
    }
    if (progress >= 100) play(title.id);
    else togglePlay();
  };

  useEffect(() => {
    if (!title) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      onToggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // onToggle closes over current video/progress
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, file, progress, playing]);

  if (!title) return null;

  const missing =
    !file &&
    (title.source === "folder"
      ? "Re-select this folder to play. CINEVO does not store the file."
      : title.source === "plex" || title.source === "jellyfin"
        ? "Pair CINEVO Node to proxy this Plex stream securely from your server."
        : "No playable file on this device.");

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-50 bg-cine-bg text-cine-text"
      role="dialog"
      aria-modal="true"
      aria-label={`${title.title} player`}
      onClick={() => file && onToggle()}
    >
      {file ? (
        <video
          ref={videoRef}
          src={file}
          className="absolute inset-0 h-full w-full bg-cine-bg object-contain"
          playsInline
          autoPlay
          muted={muted}
          onLoadedData={(e) => {
            const v = e.currentTarget;
            v.muted = muted;
            if (progress > 0 && progress < 100 && Number.isFinite(v.duration)) {
              v.currentTime = (progress / 100) * v.duration;
            }
            if (playing) void v.play().catch(() => useCinevo.setState({ playing: false }));
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (!v.duration) return;
            setProgress(title.id, (v.currentTime / v.duration) * 100);
          }}
          onEnded={() => {
            setProgress(title.id, 100);
            useCinevo.setState({ playing: false });
            setChrome(true);
          }}
        />
      ) : (
        <img src={title.still || title.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-cine-bg to-transparent transition-opacity ${
          chrome ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        aria-label="Close player"
        onClick={(e) => {
          e.stopPropagation();
          stopPlay();
        }}
        className={`absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full border border-cine-line bg-cine-elevated/80 text-cine-text transition-opacity ${
          chrome ? "opacity-100" : "opacity-0"
        }`}
      >
        <X size={18} />
      </button>
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 transition-opacity ${
          file && playing && !chrome ? "opacity-0" : "opacity-100"
        }`}
      >
        {file ? (
          <span className="flex size-16 items-center justify-center rounded-full bg-cine-text text-cine-bg">
            {playing ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}
          </span>
        ) : (
          <p className="max-w-md text-center font-ui text-sm text-cine-muted">{missing}</p>
        )}
        {file && muted && playing ? (
          <p className="font-ui text-xs uppercase tracking-[0.22em] text-cine-muted">Sound off · unmute in the bar</p>
        ) : null}
      </div>
      <section
        className={`absolute inset-x-0 bottom-0 z-10 space-y-3 p-5 transition-opacity ${
          chrome ? "opacity-100" : "pointer-events-none opacity-0"
        } ${focusMode ? "opacity-70" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-ui text-xs tracking-widest text-cine-muted">
          {progress >= 100 ? "Finished · Play again from the start" : file ? "Esc closes · Space pauses" : "Esc closes"}
        </p>
        {file ? (
          <div className="flex items-center gap-3 font-mono text-xs text-cine-muted">
            <span className="w-10 tabular-nums">{Math.round(progress)}%</span>
            <input
              aria-label="Timeline"
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1 flex-1 accent-cine-cyan"
            />
            <span>{title.runtime}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {file ? (
              <button
                type="button"
                onClick={onToggle}
                aria-label={playing ? "Pause" : "Play"}
                className="flex size-11 items-center justify-center"
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
            ) : null}
            <strong className="truncate font-ui text-lg tracking-wide">{title.title}</strong>
          </div>
          <div className="flex items-center text-cine-muted">
            {file ? (
              <>
                <button
                  type="button"
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="flex size-11 items-center justify-center"
                  onClick={() => {
                    const next = !muted;
                    setMuted(next);
                    if (videoRef.current) videoRef.current.muted = next;
                  }}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                  type="button"
                  aria-label="Subtitles"
                  className="flex size-11 items-center justify-center"
                  onClick={() => flash("No subtitles on this file")}
                >
                  <Subtitles size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Fullscreen"
                  className="flex size-11 items-center justify-center"
                  onClick={() => {
                    const node = stageRef.current;
                    if (!node) return;
                    if (document.fullscreenElement) void document.exitFullscreen();
                    else void node.requestFullscreen();
                  }}
                >
                  <Expand size={18} />
                </button>
              </>
            ) : null}
            <button type="button" className="h-11 px-3 font-ui text-sm font-bold text-cine-cyan" onClick={stopPlay}>
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
