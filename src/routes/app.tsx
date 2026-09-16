import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/cinevo/shell";
import { RoomSwitch } from "@/components/cinevo/rooms";
import { CoreModal, Detail, SearchOverlay, SettingsModal, Toast } from "@/components/cinevo/overlays";
import { Player } from "@/components/cinevo/player";
import { Keys } from "@/components/cinevo/keys";
import { JourneyPanel } from "@/components/cinevo/journey";
import { useCinevo } from "@/lib/cinevo-store";

export const Route = createFileRoute("/app")({ component: Cinema });

function Cinema() {
  const room = useCinevo((s) => s.room);
  return (
    <Shell
      overlays={
        <>
          <Detail />
          <SearchOverlay />
          <SettingsModal />
          <CoreModal />
          <Player />
          <Toast />
        </>
      }
    >
      <Keys />
      <div className="app-journey-dock"><JourneyPanel /></div>
      <RoomSwitch room={room} />
    </Shell>
  );
}
