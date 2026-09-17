import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { titleById, useCinevo } from "@/lib/cinevo-store";

export const Route = createFileRoute("/app/shows/$id")({ component: ShowDetailPage });

function ShowDetailPage() {
  const { id } = Route.useParams();
  const openTitle = useCinevo((s) => s.openTitle);
  const title = titleById(id);

  useEffect(() => {
    openTitle(id);
  }, [id, openTitle]);

  if (!title) {
    return (
      <div className="house-page">
        <p className="house-kicker">Missing</p>
        <h1>Title not found</h1>
        <p className="lede">This series is not in the current library index.</p>
        <Link to="/app/shows" className="house-btn house-btn--ghost mt-4 inline-flex">
          Back to Series
        </Link>
      </div>
    );
  }
  return null;
}
