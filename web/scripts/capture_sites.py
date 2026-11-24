"""Validate native encounter identity before assigning browser marker bits.

Physical positions still come from the compiled map and native events. Retired
slots remain in the native registry but must never bind a current marker.
"""


def captures_from_registry(registry):
    sites = registry["sites"]
    ids = [site["stableSiteId"] for site in sites]
    if sorted(ids) != list(range(len(sites))) or len(sites) not in (24, 27):
        raise SystemExit("The native encounter registry has invalid stable slots.")
    active = [site for site in sites if site.get("currentBinding")]
    if any(site.get("retired") for site in active):
        raise SystemExit("A retired encounter still has a current binding.")
    captures = {site["siteSlug"]: site for site in active}
    if len(captures) != len(active) or len({site["currentBinding"] for site in active}) != len(active):
        raise SystemExit("Multiple native encounters share a current place or binding.")
    if len(sites) == 27:
        expected = {"botanical-garden": (0, 131), "jingming-street": (24, 6),
                    "ding-sheng-bhw": (25, 9), "maple-garden": (26, 3)}
        for place, (stable_id, species) in expected.items():
            site = captures.get(place, {})
            if (site.get("stableSiteId"), site.get("speciesDex"), site.get("level")) != (stable_id, species, 65):
                raise SystemExit(f"The starter rotation differs for {place}.")
        for stable_id, species in ((13, 38), (18, 71), (22, 141)):
            site = next(site for site in sites if site["stableSiteId"] == stable_id)
            if not site.get("retired") or site.get("currentBinding") or site["speciesDex"] != species:
                raise SystemExit(f"Retired encounter {stable_id} was rebound or replaced.")
    return captures


def validate_named_bindings(bindings, captures):
    expected = [(place, captures[place]["stableSiteId"])
                for place in ("national-trade-center", "ding-sheng-bhw", "the-lin")]
    if [(site["id"], site["captureSiteId"]) for site in bindings["sites"]] != expected:
        raise SystemExit("The named Xitun bindings differ from the native encounter registry.")
