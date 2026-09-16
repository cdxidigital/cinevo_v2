import { ArrowRight, Monitor, Tv, Smartphone } from "lucide-react";

const PLATFORMS = [
  { icon: Smartphone, label: "Android phone", detail: "Touch-first CINEVO app", action: "Download APK", href: "/downloads/cinevo-android.apk", download: true },
  { icon: Tv, label: "Android TV", detail: "Landscape and D-pad ready", action: "Download TV APK", href: "/downloads/cinevo-android-tv.apk", download: true },
  { icon: Monitor, label: "Web app", detail: "Works in any modern browser", action: "Open CINEVO", href: "/app", download: false },
];

export function PlatformDownloads() {
  return (
    <div className="platform-downloads" aria-label="CINEVO platforms">
      {PLATFORMS.map(({ icon: Icon, label, detail, action, href, download }) => (
        <article key={label} className="platform-card">
          <Icon size={20} aria-hidden="true" />
          <div>
            <h3>{label}</h3>
            <p>{detail}</p>
          </div>
          <a href={href} download={download || undefined}>{action} <ArrowRight size={14} /></a>
        </article>
      ))}
    </div>
  );
}

export function AndroidBuildInstructions() {
  return (
    <div id="android-build" className="android-build-card">
      <div>
        <span className="public-kicker">ANDROID PACKAGING</span>
        <h3>One web app. Two Android experiences.</h3>
        <p>Build from the included Capacitor project. The phone flavor is touch-first; the TV flavor adds Leanback discovery and landscape launch behavior.</p>
      </div>
      <ol>
        <li><b>1</b><span>Install Android Studio and the Android SDK.</span></li>
        <li><b>2</b><span>Run <code>npm run mobile:apk</code> for the phone APK.</span></li>
        <li><b>3</b><span>Run <code>npm run mobile:tv-apk</code> for Android TV.</span></li>
      </ol>
    </div>
  );
}
