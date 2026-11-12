# Gym team reminder and intentional movesets

Adds a native English/Traditional Chinese reminder when a one-member team enters
an unbeaten gym. Choose team opens the existing picker and resumes the field
script in the same room; Not now or B allows solo play. The reminder runs once
per visit, not after returning from the picker. All ten gyms are wired, including
Wanhe Temple; completed gyms and visit-only halls do not prompt. No browser card
is used. Leaders remain at three Pokémon, as requested.

All 150 player presets are deliberately authored rather than copied by evolution
family. Each species has a documented role, every direct evolution differs, and
signature moves are granted directly without grinding. Venusaur has Solar Beam,
Sunny Day, Sludge Bomb and Sleep Powder; Arcanine has Extreme Speed; Dragonite has
Outrage. Level stays 50. Actual FireRed natural moves (including late learnset
moves), inherited moves, species-compatible TMs/HMs and ordinary tutors are the
allowed sources. Later-generation, egg/event and friendship/IV-dependent moves
are excluded. The six intrinsically limited species retain honest shorter sets.

Existing parties refresh changed moves when Team opens, on gym entry or before a
Taichung battle. The move-only refresh preserves HP, status, identity, items and
EXP; unchanged moves keep their remaining PP. Authored gym-leader moves remain
protected. Native unit checks cover migration, no repeated PP refill, protected
save fields and trainer flags. There is no new saved variable or save version.

Native source: `6ae533a` (full commit recorded in cartridge metadata). Rebuild and
publish from the checked source patch; never commit the cartridge or test saves.
Geometry remains `48fe4ba5208d0a2b1285c1b6aa6f776377ef003d5501e5ae837ca45c6127e92a`,
save version 12. Claude's current city expansion, gym interiors and landmark art
are retained.

Validation includes all 150 profiles/590 move slots against real native tables,
the three portable exact-source guards (15/11/13 corruption probes), city and
minimap validation, native team/onboarding tests, seven font tests, 59 frontend
tests and TypeScript. Local runtime evidence is under the main repository's
`artifacts/downloads/team-warning-release/`: explicitly synthetic native SRAM
fixtures imported through Continue, normal input only, both reminder choices,
adding a partner/returning to movement, and no reminder for two-member/completed
gym visits. Test images and exports stay within the repository.
