import type { NavigationState } from './navigation-bridge';
import type { OnboardingState } from './onboarding-bridge';

export type HdScene = { group: number; map: number; x: number; y: number };

/** Rendering hints only. Hidden navigation never becomes a live HUD position.
 * The onboarding mailbox continues publishing the actual map during scripts;
 * its last verified hint may survive a browser-owned pause of that same frame.
 * The renderer must still match the framebuffer against the exact ROM's map. */
export class HdSceneTracker {
  private scene?: HdScene;
  reset() { this.scene = undefined; }
  observe(navigation: NavigationState, onboarding: OnboardingState): HdScene | undefined {
    const nav = navigation.phase === 'live' ? navigation.snapshot : undefined;
    if (nav) return this.scene = { group: nav.mapGroup, map: nav.mapNumber, x: nav.x, y: nav.y };
    const packet = onboarding.status === 'live' || onboarding.status === 'pending' ? onboarding.snapshot : undefined;
    if (packet && (packet.flags & 1) && packet.mapGroup > 0 && packet.mapGroup < 255
        && packet.mapNumber < 255 && packet.x >= 0 && packet.y >= 0) {
      return this.scene = { group: packet.mapGroup, map: packet.mapNumber, x: packet.x, y: packet.y };
    }
    if (onboarding.status === 'paused') return this.scene;
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
