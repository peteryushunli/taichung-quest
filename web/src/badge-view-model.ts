export const BADGE_ASSET_SET = 'taichung-badges-masters-v1';
export const BADGE_GYM_IDS = ['old-taichung-station', 'taichung-park', 'miyahara',
  'natural-science-museum', 'calligraphy-greenway', 'confucius-temple', 'fine-arts-museum',
  'fengjia-night-market', 'wanhe-temple', 'taichung-theater'] as const;

/** Packet identity does not assert an artwork/name layout. Main pairs this
 * explicit slot list only when the combined native badges match this set. */
export function pairedBadgePresentation(value: unknown, romSha256: string, romBytes: number) {
  if (!value || typeof value !== 'object' || !/^[a-f\d]{64}$/.test(romSha256)) return false;
  const build = value as Record<string, unknown>;
  const binding = build.badgePresentation as Record<string, unknown> | undefined;
  return typeof build.sha256 === 'string' && build.sha256.toLowerCase() === romSha256 && build.bytes === romBytes
    && !!binding && binding.schemaVersion === 1 && binding.assetSetId === BADGE_ASSET_SET
    && Array.isArray(binding.gymIds) && binding.gymIds.length === BADGE_GYM_IDS.length
    && binding.gymIds.every((id, index) => id === BADGE_GYM_IDS[index]);
}
