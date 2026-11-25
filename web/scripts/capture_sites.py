"""Validate native encounter identity before assigning browser marker bits.

Physical positions still come from the compiled map and native events. Retired
slots remain in the native registry but must never bind a current marker.
"""


REASSIGNED_LANDMARKS = {
    "yuanbao-temple": (24, 6, 65),
    "tiger-city": (12, 150, 75),
    "city-hall": (5, 59, 65),
    "national-trade-center": (7, 146, 75),
    "shen-ji-new-village": (28, 113, 60),
    "jingming-street": (21, 82, 65),
    "prefectural-hall": (3, 65, 65),
    "cultural-heritage-park": (14, 145, 75),
}


def captures_from_registry(registry):
    sites = registry["sites"]
    ids = [site["stableSiteId"] for site in sites]
    if sorted(ids) != list(range(len(sites))) or len(sites) not in (24, 27, 29):
        raise SystemExit("The native encounter registry has invalid stable slots.")
    active = [site for site in sites if site.get("currentBinding")]
    if any(site.get("retired") or site.get("reserved") for site in active):
        raise SystemExit("An inactive encounter still has a current binding.")
    captures = {site["siteSlug"]: site for site in active}
    if len(captures) != len(active) or len({site["currentBinding"] for site in active}) != len(active):
        raise SystemExit("Multiple native encounters share a current place or binding.")
    if len(sites) >= 27:
        by_id = {site["stableSiteId"]: site for site in sites}
        reassigned = len(sites) == 29 and by_id[24].get("siteSlug") == "yuanbao-temple"
        expected = {"botanical-garden": (18, 71, 65),
                    "ding-sheng-bhw": (25, 9, 65), "maple-garden": (26, 3, 65)}
        lapras = by_id[0]
        if lapras.get("retired"):
            if (lapras.get("species"), lapras.get("speciesDex"), lapras.get("level"),
                    lapras.get("entryScript"), lapras.get("currentBinding")) != ("LAPRAS", 131, 65, None, None):
                raise SystemExit("Retired capture slot 0 must preserve Lapras and its saved history.")
        else:
            expected["taichung-park-lakeshore"] = (0, 131, 65)
            if lapras.get("currentBinding") != "TaichungEncounter_TaichungParkLakeshore":
                raise SystemExit("The historical active Lapras interaction differs.")
        if reassigned:
            expected.update(REASSIGNED_LANDMARKS)
        else:
            expected["jingming-street"] = (24, 6, 65)
            if len(sites) == 29:
                expected.update({"shen-ji-new-village": (3, 65, 65), "prefectural-hall": (5, 59, 65),
                                 "cultural-heritage-park": (7, 146, 75), "city-hall": (12, 150, 75),
                                 "tiger-city": (14, 145, 75), "national-trade-center": (21, 82, 65)})
        for place, identity in expected.items():
            site = captures.get(place, {})
            if (site.get("stableSiteId"), site.get("speciesDex"), site.get("level")) != identity:
                raise SystemExit(f"The active capture roster differs for {place}.")
        if captures["botanical-garden"]["currentBinding"] != "TaichungCity_Sign_BotanicalGarden":
            raise SystemExit("The active capture interaction differs for botanical-garden.")
        for stable_id, species in ((13, 38), (22, 141)):
            site = by_id[stable_id]
            if not site.get("retired") or site.get("currentBinding") or site["speciesDex"] != species:
                raise SystemExit(f"Retired encounter {stable_id} was rebound or replaced.")
    if len(sites) == 29:
        reserved = by_id[27]
        if (reserved.get("siteSlug") != "central-park-mew-reserved" or reserved.get("reserved") is not True
                or any(reserved.get(key) is not None for key in ("currentBinding", "species", "speciesDex", "level", "entryScript"))):
            raise SystemExit("Capture slot 27 must preserve history without an active encounter.")
        yuanbao = by_id[28]
        if not reassigned and (yuanbao.get("siteSlug"), yuanbao.get("speciesDex"), yuanbao.get("level"),
                               yuanbao.get("entryScript"), yuanbao.get("currentBinding")) != (
                "yuanbao-temple", 113, 60, "TaichungEncounter_YuanbaoTemple", "TaichungCity_Sign_YuanbaoTemple"):
            raise SystemExit("The historical Yuanbao Temple encounter must use Chansey's slot 28.")
    return captures


def validate_named_bindings(bindings, captures):
    expected = [(place, captures[place]["stableSiteId"])
                for place in ("national-trade-center", "ding-sheng-bhw", "the-lin")]
    if [(site["id"], site["captureSiteId"]) for site in bindings["sites"]] != expected:
        raise SystemExit("The named Xitun bindings differ from the native encounter registry.")
