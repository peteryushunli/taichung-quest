import type { NavigationState } from './navigation-bridge';
import type { OnboardingState } from './onboarding-bridge';

export type HdScene = { group: number; map: number; x: number; y: number };

/** Rendering hints only. The paired onboarding mailbox continues to publish
 * the map during scripts even when its tutorial is idle. Use that idle position
 * only while the advancing navigation mailbox confirms a loaded field.
 * The renderer still matches every frame to the paired map before drawing. */
export class HdSceneTracker {
  private scene?: HdScene;
  reset() { this.scene = undefined; }
  observe(navigation: NavigationState, onboarding: OnboardingState, fieldInteraction = false): HdScene | undefined {
    const nav = navigation.phase === 'live' ? navigation.snapshot : undefined;
    if (nav) return this.scene = { group: nav.mapGroup, map: nav.mapNumber, x: nav.x, y: nav.y };
    const scriptedField = navigation.phase === 'hidden' && fieldInteraction;
    const packet = onboarding.status === 'live' || onboarding.status === 'pending' ? onboarding.snapshot : undefined;
    if (packet && ((packet.flags & 1) || scriptedField) && packet.mapGroup > 0 && packet.mapGroup < 255
        && packet.mapNumber < 255 && packet.x >= 0 && packet.y >= 0) {
      return this.scene = { group: packet.mapGroup, map: packet.mapNumber, x: packet.x, y: packet.y };
    }
    if (scriptedField || onboarding.status === 'paused') return this.scene;
    this.reset();
  }
}

/** Leave the bottom 48 pixels out of camera confidence: native dialogue covers
 * that area. It is still composited from the full native frame afterwards. */
export function scoreHdCamera(frame: Uint16Array, ref: Uint16Array, refW: number, refH: number,
  cx: number, cy: number, step = 7) {
  if (cx < 0 || cy < 0 || cx + 240 > refW || cy + 160 > refH) return 0;
  let hit = 0, all = 0;
  for (let y = 3; y < 112; y += step) {
    const row = (cy + y) * refW + cx, frow = y * 240;
    for (let x = (y * 3) % step; x < 240; x += step) {
      all++;
      if (ref[row + x] === frame[frow + x]) hit++;
    }
  }
  return hit / all;
}
