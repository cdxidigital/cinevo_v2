import { Flame, LockKeyhole, Sparkles, Trophy } from "lucide-react";
import { useCinevo } from "@/lib/cinevo-store";
import { levelForXp, unlockedBadges, xpIntoLevel } from "@/lib/journey";

export function JourneyPanel() {
  const journey = useCinevo((s) => s.journey);
  const progress = useCinevo((s) => s.progress);
  const favorites = useCinevo((s) => s.favorites);
  const party = useCinevo((s) => Boolean(s.party));
  const level = levelForXp(journey.xp);
  const current = xpIntoLevel(journey.xp);
  const badges = unlockedBadges(journey, progress, favorites, party);

  return (
    <section className="journey-panel" aria-labelledby="journey-heading">
      <div className="journey-panel__header">
        <div>
          <p className="house-kicker">Cinematic journey</p>
          <h2 id="journey-heading">Your next scene</h2>
        </div>
        <div className="journey-level"><Sparkles size={15} /> Level {level}</div>
      </div>
      <div className="journey-progress" aria-label={`${current} of 100 XP toward the next level`}>
        <div className="journey-progress__track"><span style={{ width: `${current}%` }} /></div>
        <div className="journey-progress__meta"><span>{journey.xp} XP earned</span><span>{100 - current} XP to next</span></div>
      </div>
      <div className="journey-stats">
        <div><Flame size={16} /><strong>{journey.streak}</strong><span>day streak</span></div>
        <div><Trophy size={16} /><strong>{badges.filter((badge) => badge.unlocked).length}</strong><span>badges</span></div>
      </div>
      <div className="journey-badges">
        {badges.map((badge) => (
          <div key={badge.id} className={`journey-badge ${badge.unlocked ? "is-unlocked" : "is-locked"}`} title={badge.detail}>
            {badge.unlocked ? <Trophy size={14} /> : <LockKeyhole size={14} />}
            <span>{badge.icon}</span>
            <small>{badge.label}</small>
          </div>
        ))}
      </div>
      {journey.events.length ? (
        <p className="journey-latest"><span>Latest reward</span> {journey.events[0].label} <b>+{journey.events[0].xp} XP</b></p>
      ) : <p className="journey-latest">Complete a title, save a favorite, or start a party to begin your journey.</p>}
    </section>
  );
}
