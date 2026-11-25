"""Validate native encounter identity before assigning browser marker bits.

Physical positions still come from the compiled map and native events. Retired
slots remain in the native registry but must never bind a current marker.
"""


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
        expected = {"taichung-park-lakeshore": (0, 131), "botanical-garden": (18, 71),
                    "jingming-street": (24, 6),
                    "ding-sheng-bhw": (25, 9), "maple-garden": (26, 3)}
        for place, (stable_id, species) in expected.items():
            site = captures.get(place, {})
            if (site.get("stableSiteId"), site.get("speciesDex"), site.get("level")) != (stable_id, species, 65):
                raise SystemExit(f"The active capture roster differs for {place}.")
        for place, binding in {
            "taichung-park-lakeshore": "TaichungEncounter_TaichungParkLakeshore",
            "botanical-garden": "TaichungCity_Sign_BotanicalGarden",
        }.items():
            if captures[place]["currentBinding"] != binding:
                raise SystemExit(f"The active capture interaction differs for {place}.")
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
        if (yuanbao.get("siteSlug"), yuanbao.get("speciesDex"), yuanbao.get("level"),
                yuanbao.get("entryScript"), yuanbao.get("currentBinding")) != (
                "yuanbao-temple", 113, 60, "TaichungEncounter_YuanbaoTemple", "TaichungCity_Sign_YuanbaoTemple"):
            raise SystemExit("Capture slot 28 must match the Yuanbao Temple Chansey encounter.")
    return captures


def validate_named_bindings(bindings, captures):
    expected = [(place, captures[place]["stableSiteId"])
                for place in ("national-trade-center", "ding-sheng-bhw", "the-lin")]
    if [(site["id"], site["captureSiteId"]) for site in bindings["sites"]] != expected:
        raise SystemExit("The named Xitun bindings differ from the native encounter registry.")
