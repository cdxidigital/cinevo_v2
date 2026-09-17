import { createFileRoute } from "@tanstack/react-router";
import { BrowseRoom } from "@/components/cinevo/rooms";

export const Route = createFileRoute("/app/movies")({ component: MoviesPage });

function MoviesPage() {
  return <BrowseRoom kind="movie" />;
}
