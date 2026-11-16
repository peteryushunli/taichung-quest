// Copy for the ten encounter entry points in the existing city, not future sites.
const signSites = new Set([
  'botanical-garden', 'confucius-temple', 'yizhong-street', 'prefectural-hall',
  'second-market', 'cultural-heritage-park', 'fengle-sculpture-park',
  'wenxin-forest-park', 'maple-garden',
]);

export function landmarkCaptureCopy(id: string, surface: 'guide' | 'landing'): string | undefined {
  if (signSites.has(id)) return surface === 'landing'
    ? 'In the game: read its sign for local history and a rare Pokémon encounter. A successful capture unlocks that Pokémon in TEAM.'
    : 'The sign offers a rare Pokémon encounter. A successful capture unlocks that Pokémon in TEAM.';
  if (id === 'wenchang-temple') return surface === 'landing'
    ? 'In the game: meet the hall host for local history and a rare Pokémon encounter. A successful capture unlocks that Pokémon in TEAM.'
    : 'Meet the hall host to begin a rare Pokémon encounter. Successful captures unlock TEAM choices.';
  return undefined;
}
