import { createFileRoute } from "@tanstack/react-router";
import { BrowseRoom } from "@/components/cinevo/rooms";

export const Route = createFileRoute("/app/shows")({ component: ShowsPage });

function ShowsPage() {
  return <BrowseRoom kind="series" />;
}
