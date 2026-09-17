import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { titleById, useCinevo } from "@/lib/cinevo-store";

export const Route = createFileRoute("/app/watch/$id")({ component: WatchPage });

function WatchPage() {
  const { id } = Route.useParams();
  const play = useCinevo((s) => s.play);
  const title = titleById(id);

  useEffect(() => {
    if (title) play(id);
  }, [id, play, title]);

  if (!title) {
    return (
      <div className="house-page">
        <p className="house-kicker">Playback</p>
        <h1>Nothing to play</h1>
        <p className="lede">That title is not available on this device.</p>
        <Link to="/app/home" className="house-btn house-btn--ghost mt-4 inline-flex">
          Back Home
        </Link>
      </div>
    );
  }
  return (
    <div className="house-page">
      <p className="house-kicker">Now playing</p>
      <h1>{title.title}</h1>
      <p className="lede">Player chrome opens over the house. Press Esc to stop.</p>
    </div>
  );
}
