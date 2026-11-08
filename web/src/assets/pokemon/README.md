# Landing page Pokémon sprites

Unchanged copies of the game's own sprites from `vendor/pokefirered/graphics/pokemon/<species>/`, at native commit `a72bd0e` (the published cartridge source). Each is a 16-colour indexed PNG whose index 0 is already transparent. These are Pokémon game assets, so read the publication-rights note in the root README before publishing them.

| Folder | Source file | Pixels | Used for |
| --- | --- | --- | --- |
| `front/` | `front.png` | 64×64 | Starter cards (3×, 2× on phones) and the hero partner. |
| `icon/` | `icon.png` | 32×64, two 32×32 frames | Header, example team and gym leader teams. The page alternates the two frames like the in-game party menu. |

Gym leader teams follow the native trainer parties in `src/data/trainer_parties.h`: Jun has Rattata and Pidgey; Lian has Goldeen, Psyduck and Pidgeotto; Peiqi has Seel, Cloyster and Lapras. The example team of six is illustrative.

SHA-256 of the exact source/copy bytes:

```text
front/bulbasaur.png  523c5d50a673c3a46a68a96bd32a63fcfae9192637fb6407198a43746c38f7e3
front/charmander.png 0235fcad1ca309f303947ae1688d7564636971c30a0c707b6ee123e697f76022
front/pikachu.png    49e9816a16c0c886233e25d9b91f7ee86ac5083c93aa973a9b210528555f72ec
front/squirtle.png   30d6413a70495a23d4af23a941bae57f5373f7b6fec1e05eb8ef78a0636898bc
icon/bulbasaur.png   7e8819eb44beccf14aede01098077ea5f9e8698bd01630210f1cfed5359f4cfb
icon/charizard.png   69c2a863841d30bba8854636bed80313721a5f7d498f54043d3d9d211722f6e2
icon/charmander.png  1a0f780c5fff00e2264068e0c9bfbb61b4c45dd8eece55d6576079d5e99384db
icon/cloyster.png    f1f694150a10d568c8e064fc6b295b0b7dea98f5a44a85c762801da97583057b
icon/dragonite.png   8a37b2a12eb76a23943feceae52146aa1937bd03386aaf1b0f778d2a596ad04f
icon/eevee.png       20cc3bbde72960e339ce540e6f41b82b827a0642e4a39456439b07db33b7d4a0
icon/gengar.png      de64afcf9e7daef91f6590a006e5339785582b99b52cd08cf7045a0a5eb3033b
icon/goldeen.png     29dd9b3576f72a56454c9e978f3256de7d728cfbd8852d49095ef9875068b207
icon/gyarados.png    46be47e5851ed5115eeb574162de99efb70234641e4b7a44d90e9d8fd210ba37
icon/lapras.png      8399b501b87c2aa6b41927b8cc320637d3a5c0d383a0ffa0df208d4e0f0aa81e
icon/pidgeotto.png   a3c87dd17c39c9371882459b233d7891b39a7c89a669eae67ef3a25be1acdb11
icon/pidgey.png      47c3c22b2510ca17cc55f959d8e92688a581d31e6d404266f6710508391bf726
icon/pikachu.png     5cc872b218a4e529a4f1a250a722b69418825e706e2609c71201ee0d6f225d33
icon/psyduck.png     f425128bc66fe764df979cb49ac505e55ad3148e60d86ed933f0f0ab53dad064
icon/rattata.png     b23668048da278967901b9497abd8cf2a6f9467f70b52b88c39930bd35a45c9b
icon/seel.png        adf1db98dc5090580690516ed524558328a3730846eb9d1a8c4b11eb9e4853d4
icon/snorlax.png     df54dc15d0a0f92c9a39e3f60a2ab2f44c063533756f6d8a532649425786cd6f
icon/squirtle.png    a70b797688ee004c9b6819c842b7eb27616645a8b6ff02cf875405be03f52dc1
```
