import { createFileRoute } from "@tanstack/react-router";
import { StageRoom } from "@/components/cinevo/rooms";

export const Route = createFileRoute("/app/home")({ component: HomePage });

function HomePage() {
  return <StageRoom />;
}
