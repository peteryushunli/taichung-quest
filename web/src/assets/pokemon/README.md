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

## Remaining seven leader teams

Added on 8 November 2026 as unchanged copies from native source `b7b027d443f213def7d31aa76d2d0aa3cd478b76`. The following order is read from `src/data/trainer_parties.h` at that exact commit. All 21 team slots use native icons; Snorlax reuses its existing byte-identical web asset. There are 17 newly copied icon files, each 32×64 with the source transparency preserved. The earlier assets and example team are unchanged. Native runtime acceptance is still pending Main.

| Leader | Native party order |
| --- | --- |
| Yicheng | Magneton, Porygon, Omastar |
| Xingan | Bellsprout, Vileplume, Tangela |
| Axiu | Meowth, Machoke, Ditto |
| Caining | Butterfree, Ditto, Porygon |
| Jiahe | Farfetch’d, Magmar, Snorlax |
| Muqing | Poliwhirl, Butterfree, Vaporeon |
| Ling | Jigglypuff, Jynx, Mr. Mime |

SHA-256 of the added exact source/copy bytes (`graphics/pokemon/<species>/icon.png`):

```text
icon/bellsprout.png 5bce5499818fd6c17fe741dec90dfda8e50cabc182d3c943e5ea953191a9a8b7
icon/butterfree.png 120eff312ec5113740737951e9288e02f0d50f54f6f3cf91d4b027a3e34013ae
icon/ditto.png 6c99be61bcc6ddaee06ec256de047fc97c45bde6f442a6dd87603c0acd29ff57
icon/farfetchd.png a3148d0a45b289607469cc1c98d84d533cec449626dd0247a41f6c5a1b54fd09
icon/jigglypuff.png 75449d52b516eb2e62f08255ef7b979eaed7bd1bee46b1dc021875ddb55fc96d
icon/jynx.png 76649721db4e768364f60977bec82bf5caa0fab48035ad69ef457bf2fb55b073
icon/machoke.png 769131471236351ce697b439067bfe83263f88c69a71ba223cb7f00f5dab0c27
icon/magmar.png 1e1be61a5a92a693891fa3d23cbce35a38e4f3c73daa345cde362c98456333fa
icon/magneton.png 69af5373c8bf5b8092a072fdb091d19afcf993f1884822623ed0027c952028ea
icon/meowth.png a9a25f423d2785b0198c87b51ba504c495a058650e17289bdd6aa31298fbb1c3
icon/mr_mime.png 0beed31d9f9451d149e462654aca58ebab304fe2e09c74b0b9e9572008499373
icon/omastar.png 9d9495b247a70988d804426215953961010367c8987c50484789ccc61958f6c6
icon/poliwhirl.png 11c8538fa61fbb7c63809fd9e021920e6ba65fdc675895853c0aef48dd616a1f
icon/porygon.png 5dceb78fed6712ed39040d9d4a71d22280253b5f9423ef17ea5fec23f3605843
icon/tangela.png c30256d79899afc52f9acda5471688549f0c9f51f1ec7f02fea0a8838d4e574d
icon/vaporeon.png ac7eb05a1fe6d1831c0283597fc579a4acac1318ace977d4e0604e4902ca2a9d
icon/vileplume.png 225bb834ad8daff529cd834bb340f3636acdc2d9612cea037ccb59da1d0dca0f
```
