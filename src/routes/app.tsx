import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/cinevo/shell";
import { Detail, Toast } from "@/components/cinevo/overlays";
import { Player } from "@/components/cinevo/player";
import { Keys } from "@/components/cinevo/keys";
import { JourneyPanel } from "@/components/cinevo/journey";
import { SignInGate } from "@/lib/auth/gates";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  return (
    <SignInGate>
      <Shell
        overlays={
          <>
            <Detail />
            <Player />
            <Toast />
          </>
        }
      >
        <Keys />
        <div className="app-journey-dock">
          <JourneyPanel />
        </div>
        <Outlet />
      </Shell>
    </SignInGate>
  );
}
