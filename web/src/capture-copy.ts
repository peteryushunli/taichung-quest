// The original city predates the capture markers in the Boulevard geometry.
const legacySignSites = new Set([
  'botanical-garden', 'shen-ji-new-village', 'yizhong-street', 'prefectural-hall',
  'second-market', 'cultural-heritage-park', 'fengle-sculpture-park',
  'wenxin-forest-park', 'maple-garden',
]);

export function landmarkCaptureCopy(id: string, surface: 'guide' | 'landing',
  hasEncounter = legacySignSites.has(id) || id === 'wenchang-temple', captureBit?: number): string | undefined {
  if (!hasEncounter) return undefined;
  if (id === 'botanical-garden' && captureBit === 18)
    return 'Read the sign for a level 65 Victreebel encounter. A successful capture unlocks Victreebel in TEAM.';
  if (id === 'yuanbao-temple' && captureBit === 28)
    return 'Read the sign for a level 60 Chansey encounter. A successful capture unlocks Chansey in TEAM.';
  if (id === 'wenchang-temple') return surface === 'landing'
    ? 'In the game: meet the hall host for local history and a rare Pokémon encounter. A successful capture unlocks that Pokémon in TEAM.'
    : 'Meet the hall host to begin a rare Pokémon encounter. Successful captures unlock TEAM choices.';
  return surface === 'landing'
    ? 'In the game: read its sign for local history and a rare Pokémon encounter. A successful capture unlocks that Pokémon in TEAM.'
    : 'The sign offers a rare Pokémon encounter. A successful capture unlocks that Pokémon in TEAM.';
}
