import { createFileRoute } from "@tanstack/react-router";
import { AppNotFoundComponent } from "@/lib/not-found-component";

export const Route = createFileRoute("/404")({
  component: AppNotFoundComponent,
});
