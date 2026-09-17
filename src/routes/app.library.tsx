import { createFileRoute } from "@tanstack/react-router";
import { SidebarRoom } from "@/components/cinevo/rooms";

export const Route = createFileRoute("/app/library")({ component: LibraryPage });

function LibraryPage() {
  return <SidebarRoom />;
}
