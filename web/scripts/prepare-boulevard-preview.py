"""Pair the verified Boulevard cartridge with browser maps and an Old Station test save."""

import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

from PIL import Image, ImageColor


WEB = Path(__file__).resolve().parents[1]
DATA = WEB / "src/data"
ART = WEB / "src/assets/boulevard"
GEOMETRY_FIELDS = ("schemaVersion", "coordinateSystem", "world", "mapsByNativeKey", "markersById", "seams")
EXTRA_SIGHTS = {
    "tiger-city": ("Tiger City", "老虎城", "xitun", "Shopping centre", "購物中心"),
    "rainbow-village": ("Rainbow Village", "彩虹眷村", "nantun", "Painted village", "彩繪眷村"),
    "jingming-street": ("Jingming 1st Street", "精明一街", "west", "Shopping street", "購物商圈"),
    "city-hall": ("City Hall", "臺中市政府", "xitun", "Civic plaza", "市政廣場"),
}
INSTALLED_SIGHTS = {
    "green-museumbrary": ("Green Museumbrary", "臺中綠美圖", "shuinan", "Museum and library", "美術館與圖書館"),
    "baseball-stadium": ("Intercontinental Ballpark", "洲際棒球場", "beitun", "Baseball stadium", "棒球場"),
    "folklore-park": ("Folk Museum at Folklore Park", "臺灣民俗文物館", "beitun", "Folk museum", "民俗館"),
}
NEIGHBORHOODS = {
    "fengjia": ("Fengjia", "逢甲", 72, 41),
    "centralpark": ("Shuinan", "水湳", 115, 19),
    "beitun": ("Beitun", "北屯", 218, 38),
    "north": ("North District", "北區", 342, 40),
    "xitun": ("Xitun", "西屯", 93, 114),
    "dadun": ("Dadun", "大墩", 170, 85),
    "west": ("West District", "西區", 236, 139),
    "oldcity": ("Old City", "舊城", 325, 134),
    "nantun": ("Nantun", "南屯", 90, 203),
}


def read(path):
    return json.loads(path.read_text())


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def native_registry(root):
    groups = read(root / "data/maps/map_groups.json")
    layouts = {layout["id"]: layout for layout in read(root / "data/layouts/layouts.json")["layouts"] if layout}
    group = groups["group_order"].index("gMapGroup_Taichung")
    registry = {}
    for number, name in enumerate(groups["gMapGroup_Taichung"]):
        source = read(root / "data/maps" / name / "map.json")
        layout = layouts[source["layout"]]
        registry[source["id"]] = dict(
            nativeKey=f"{group}:{number}", group=group, number=number, packedMapId=group << 8 | number,
            mapId=source["id"], nativeMapName=name, layoutId=source["layout"],
            width=layout["width"], height=layout["height"], registration="registered-source",
        )
    return registry


def street_bands(plan, fill, origin):
    bands = []

    def add(name, zh, rect, axis):
        x0, y0, x1, y1 = rect
        bounds = [x0 - origin[0], y0 - origin[1], x1 - origin[0], y1 - origin[1]]
        bands.append({"name": {"en": name, "zh": zh}, "bounds": bounds, "axis": axis})

    for street in plan["streets"]:
        if street["kind"] not in ("boulevard", "street", "lane"):
            continue
        en = "Taiwan Boulevard" if street["name"] == "Taiwan Blvd" else street["name"]
        for start, end, rect in zip(street["points"], street["points"][1:], street["rects"]):
            add(en, street["zh"], rect, "h" if start[1] == end[1] else "v")
    for lane in fill["newLanes"]:
        if lane["zh"] and lane["direction"] in ("h", "v"):
            add(lane["name"], lane["zh"], lane["rect"], lane["direction"])
    return bands


def terrain_images(fill, plan, candidate, geometry, report):
    os.environ["FILL_RAW"] = "1"
    sys.path.insert(0, str(fill / "src"))
    import engine
    import events

    world = events.build()
    for site in report.get("northXitun", {}).get("sites", []):
        world.put(site["block"], site["ground"])
        for ground_rect in site.get("groundRects", []):
            world.put(ground_rect["rect"], ground_rect["ground"])
    if tower_block := report.get("xitunTowerBlock"):
        world.put(tower_block["paving"], "p")
    width, height = geometry["world"]["width"], geometry["world"]["height"]
    origin = plan["world"]["box"][:2]
    ink = {
        "outside": "#334945", "arterial": "#445b54", "street": "#636f63", "alley": "#879783",
        "path": "#e7e6d0", "land": "#c7d1b9", "park": "#b1c6a1", "block": "#a4b595", "water": "#81abb9",
    }
    image = Image.new("RGB", (width + 4, height + 4), ink["outside"])
    highway = {(x, y) for edge in plan["edges"] if edge["kind"] == "highway"
               for x in range(edge["rect"][0], edge["rect"][2])
               for y in range(edge["rect"][1], edge["rect"][3])}
    named_streets = {(x + origin[0], y + origin[1]) for band in geometry["world"]["streetBands"]
                     for x in range(band["bounds"][0], band["bounds"][2])
                     for y in range(band["bounds"][1], band["bounds"][3])}
    # The report applies the cartridge's collision and boundary corrections.
    walkable_by_tile = {}
    for entry in report["maps"]:
        left, top, _, _ = entry["worldRect"]
        for dy, row in enumerate(entry["localWalkable"]):
            for dx, walkable in enumerate(row):
                walkable_by_tile[left + dx, top + dy] = walkable == "1"
    colors = {key: ImageColor.getrgb(value) for key, value in ink.items()}
    pavilion_tiles = {(x, y) for left, top, right, bottom in report.get("pavilionDeck", {}).values()
                      for x in range(left, right) for y in range(top, bottom)}
    # Only Huimin's compiled path overlays use path ink; other paving stays land.
    huimin_path_tiles = {(x, y) for site in report.get("northXitun", {}).get("sites", [])
                         if site["id"] == "huimin-park"
                         for ground_rect in site.get("groundRects", []) if ground_rect["ground"] == "p"
                         for x in range(ground_rect["rect"][0], ground_rect["rect"][2])
                         for y in range(ground_rect["rect"][1], ground_rect["rect"][3])}
    for row in range(height):
        for col in range(width):
            tile = col + origin[0], row + origin[1]
            ground = world.at(*tile)
            walkable = walkable_by_tile.get(tile)
            if walkable and (tile in pavilion_tiles or ground in "aW=qkK"
                             or ground == "p" and tile in huimin_path_tiles):
                kind = "path"
            elif ground == "~":
                kind = "water"
            elif walkable is None or ground in "HRX" or tile in highway:
                kind = "outside"
            elif walkable and ground in engine.ROAD:
                kind = "arterial" if tile in named_streets else "street"
            elif walkable and ground == "z":
                kind = "alley"
            elif ground in "PGoWwghvf":
                kind = "park"
            else:
                kind = "land" if walkable else "block"
            image.putpixel((col + 2, row + 2), colors[kind])
    ART.mkdir(parents=True, exist_ok=True)
    image.save(ART / "radar.png", optimize=True)
    overview = Image.open(candidate / "city-overview.png")
    require(overview.width * height == overview.height * width, "The city image has the wrong geometry.")
    overview.save(ART / "city.webp", lossless=True, method=6, quality=100)


def landmark_facades(native, fill, report, extras):
    approved = native / "tools/taichung/boulevard_city/landmark-art"
    kit = fill / "kit/sprites"
    catalog = read(DATA / "landmarks.json") + read(DATA / "sights.json") + extras
    facades = {}
    for place in catalog:
        landmark = place["id"]
        filename = f"{landmark}.png"
        source = approved / filename
        if not source.is_file():
            source = kit / filename
        require(source.is_file() and digest(source) == report["spriteSha256"].get(landmark),
                f"{landmark} art does not match the compiled Boulevard report.")
        with Image.open(source) as sprite:
            image = sprite.convert("RGBA")
        bounds = image.getchannel("A").getbbox()
        require(bounds, f"{landmark} facade has no visible pixels.")
        facades[filename] = image.crop(bounds)
    directory = WEB / "src/assets/landmarks/isolated"
    directory.mkdir(parents=True, exist_ok=True)
    for filename, image in facades.items():
        image.save(directory / filename, optimize=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("native", type=Path)
    parser.add_argument("fill", type=Path)
    parser.add_argument("plan", type=Path)
    parser.add_argument("rom_dir", type=Path)
    parser.add_argument("nm", type=Path)
    parser.add_argument("--candidate", type=Path)
    args = parser.parse_args()
    candidate = args.candidate or args.fill / "out/native-city-codex"
    report = read(candidate / "build-report.json")
    raw_path = args.fill / "out/fill-raw.json"
    require(digest(raw_path) == report["sourceSha256"]["fill"]
            and digest(args.fill / "out/mapbook.json") == report["sourceSha256"]["mapBook"],
            "The raw design differs from the compiled Boulevard report.")
    raw = read(raw_path)
    plan = read(args.plan)
    x0, y0, x1, y1 = plan["world"]["box"]
    width, height = x1 - x0, y1 - y0

    def normalize(point):
        return [point[0] - x0, point[1] - y0]

    def map_at(point):
        x, y = point
        matches = [entry for entry in exteriors.values()
                   if entry["worldRect"][0] <= x < entry["worldRect"][2]
                   and entry["worldRect"][1] <= y < entry["worldRect"][3]]
        require(len(matches) == 1, f"No unique exterior at {point}.")
        return matches[0]

    registry = native_registry(args.native)
    exteriors = {}
    for item in report["maps"]:
        entry = registry[item["nativeId"]]
        left, top, right, bottom = item["worldRect"]
        require((entry["number"], entry["width"], entry["height"]) == (item["number"], right - left, bottom - top),
                f"The current registration differs for {entry['mapId']}.")
        origin = normalize([left, top])
        en, zh, _, _ = NEIGHBORHOODS[item["district"]]
        exteriors[entry["mapId"]] = {**entry, "kind": "exterior", "projection": "local-plus-world-origin",
                                     "districtName": {"en": en, "zh": zh},
                                     "worldOrigin": origin, "worldRect": origin + normalize([right, bottom])}
        if split := item.get("districtBefore"):
            split_en, split_zh, _, _ = NEIGHBORHOODS[split["district"]]
            exteriors[entry["mapId"]]["districtBefore"] = {
                "y": split["y"] - y0, "name": {"en": split_en, "zh": split_zh},
            }

    places = {place["id"]: place for place in read(DATA / "landmarks.json") + read(DATA / "sights.json")}
    plan_districts = {district["id"]: district for district in plan["districts"]}
    installed = {entry["id"]: entry for entry in report.get("installedLandmarks", [])}
    named_bindings_path = args.native / "data/taichung/named-xitun-bindings/anchors.json"
    named_bindings = read(named_bindings_path) if named_bindings_path.is_file() else None
    if named_bindings:
        require([(site["id"], site["captureSiteId"]) for site in named_bindings["sites"]] == [
            ("national-trade-center", 21), ("ding-sheng-bhw", 22), ("the-lin", 23)],
            "The named Xitun bindings differ from the approved three-site contract.")
        for site in named_bindings["sites"]:
            installed[site["id"]] = {"id": site["id"],
                                     "worldRect": site["game"]["authoredWorldRect"],
                                     "signTile": site["game"]["authoredWorldInteraction"]}
    captures = {site["siteSlug"]: site
                for site in read(args.native / "data/taichung/encounters/sites.json")["sites"]
                if site["currentBinding"]}
    sight_specs = EXTRA_SIGHTS | {place: INSTALLED_SIGHTS[place] for place in installed if place in INSTALLED_SIGHTS}
    require(set(installed) <= places.keys() | sight_specs.keys(),
            "An installed landmark has no website catalog entry.")
    sight_copy = read(DATA / "boulevard-sight-copy.json")
    short_names = {"baseball-stadium": ("Ballpark", "洲際棒球場"), "folklore-park": ("Folk Museum", "民俗公園")}
    extras = []
    for place, (en, zh, district_id, category, category_zh) in sight_specs.items():
        district = plan_districts[district_id]
        short_en, short_zh = short_names.get(place, (en, zh))
        row = {"id": place, "nameEn": en, "nameZh": zh, "shortNameEn": short_en, "shortNameZh": short_zh,
               "minimapNameEn": short_en, "minimapNameZh": short_zh, "districtId": district_id,
               "districtEn": district["name"], "districtZh": district["zh"],
               "category": category, "categoryZh": category_zh,
               "kind": "sight", "gymStatus": "not-a-gym", "playable": place in installed or place in captures,
               **sight_copy[place]}
        extras.append(row)
        places[place] = row
    places["guest-house"] = {"nameEn": "Guest house", "nameZh": "旅宿", "kind": "visit"}
    events = {}
    for event in raw["events"]["list"]:
        place = event.get("place")
        if place in places and event["tile"] and (
            place not in events or event["type"] == "door" and events[place]["type"] != "door"
        ):
            events[place] = event
    for place, entry in installed.items():
        events[place] = {"type": "sign", "tile": entry["signTile"]}
    # Current registered doors own hall locations. The original design's events
    # predate the Confucius room and must not keep its old outdoor-only anchor.
    native_exteriors = {parent["nativeKey"]: read(args.native / "data/maps" / parent["nativeMapName"] / "map.json")
                        for parent in exteriors.values()}
    for place, special in places.items():
        hall = special.get("landmarkHallRef")
        if not hall:
            continue
        require(hall in registry, f"The website hall for {place} is not registered.")
        doors = []
        for parent in exteriors.values():
            ox, oy = parent["worldOrigin"]
            for warp in native_exteriors[parent["nativeKey"]]["warp_events"]:
                if warp["dest_map"] == hall:
                    doors.append({"type": "door", "destMap": hall,
                                  "tile": [x0 + ox + warp["x"], y0 + oy + warp["y"]]})
        require(doors, f"No active exterior door enters the registered hall for {place}.")
        # Adjacent paired entrance mats have one deterministic western anchor.
        doors.sort(key=lambda door: (door["tile"][1], door["tile"][0]))
        require(len({map_at(door["tile"])["nativeKey"] for door in doors}) == 1,
                f"Multiple exteriors enter the hall for {place}.")
        events[place] = doors[0]

    # A capture can be read from either a sign or a local guide. Derive these
    # anchors from current native objects, including relocated Alakazam and the
    # three Xitun sites, instead of reusing design-era marker coordinates.
    capture_bindings = {site["currentBinding"]: place for place, site in captures.items()}
    located = set()
    capture_anchors = {}
    for parent in exteriors.values():
        native = native_exteriors[parent["nativeKey"]]
        ox, oy = parent["worldOrigin"]
        for event in [*native["bg_events"], *native["object_events"]]:
            if event.get("script") not in capture_bindings:
                continue
            place = capture_bindings[event["script"]]
            require(place in places, f"The native encounter {place} has no website catalog entry.")
            require(place not in located, f"Multiple active exterior capture interactions for {place}.")
            located.add(place)
            tile = [x0 + ox + event["x"], y0 + oy + event["y"]]
            capture_anchors[place] = {"script": event["script"], "world": normalize(tile),
                                      "nativeKey": parent["nativeKey"], "local": [event["x"], event["y"]]}
            # Preserve a visitor hall's actual door projection when its outdoor
            # encounter stands nearby. Both anchors remain in the export.
            if events.get(place, {}).get("type") != "door":
                events[place] = {"type": "sign", "tile": tile}
    required_exterior_captures = (captures.keys() & sight_specs.keys()) | {
        place for place, site in captures.items() if site["stableSiteId"] in (3, 21, 22, 23)
    }
    require(required_exterior_captures <= located,
            "Moved/new Boulevard captures lack their current exterior sign or guide.")

    markers = {}
    interiors = {}
    for place, special in places.items():
        require(place in events, f"Missing Boulevard map anchor for {place}.")
        event = events[place]
        point = normalize(event["tile"])
        parent = map_at(point)
        ox, oy = parent["worldOrigin"]
        marker = {"id": place, "name": {"en": special["nameEn"], "zh": special["nameZh"]},
                  "kind": "home" if place == "guest-house" else "landmark" if special.get("gymStatus") == "not-a-gym" else "landmark-gym",
                  "world": point, "localEntrance": [point[0] - ox, point[1] - oy],
                  "exteriorMapId": parent["mapId"], "exteriorNativeKey": parent["nativeKey"]}
        markers[place] = marker
        if place in captures:
            marker["captureBit"] = captures[place]["stableSiteId"]
            if place in capture_anchors:
                marker["captureInteraction"] = capture_anchors[place]
        if event["type"] == "door":
            room = registry[event["destMap"]]
            interiors[room["nativeKey"]] = {**room, "kind": "interior", "projection": "parent-entrance",
                                              "parentNativeKey": parent["nativeKey"], "parentMarkerId": place,
                                              "parentEntranceWorld": point, "indoorLabel": {"en": "Indoors", "zh": "室內"}}

    seams = []
    for item in report["maps"]:
        source = exteriors[item["nativeId"]]
        for edge in item["connections"]:
            target = exteriors[edge["map"]]
            horizontal = edge["direction"] in ("left", "right")
            transverse = int(horizontal)
            require(target["worldOrigin"][transverse] - source["worldOrigin"][transverse] == edge["offset"],
                    f"Incorrect compiled seam at {item['nativeId']}.")
            seams.append({"fromNativeKey": source["nativeKey"], "toNativeKey": target["nativeKey"],
                          "direction": edge["direction"], "nativeOffset": edge["offset"]})

    geometry = {
        "schemaVersion": 1, "contractId": "taichung-boulevard-preview",
        "coordinateSystem": {"units": "metatiles", "metatilePixels": 16, "northUp": False},
        "world": {"width": width, "height": height, "homeWorld": markers["guest-house"]["world"],
                  "streetBands": street_bands(plan, raw, (x0, y0)),
                  "neighborhoods": [{"name": {"en": en, "zh": zh}, "tile": normalize([x, y])}
                                    for en, zh, x, y in NEIGHBORHOODS.values()]},
        "mapsByNativeKey": {entry["nativeKey"]: entry for entry in exteriors.values()} | interiors,
        "markersById": markers, "seams": seams, "extraSights": extras,
        "sourceSha256": {"compiledMapReport": digest(candidate / "build-report.json"), **report["sourceSha256"],
                         **({"namedXitunBindings": digest(named_bindings_path)} if named_bindings else {})},
    }
    fingerprint = sha256(json.dumps({key: geometry[key] for key in GEOMETRY_FIELDS},
                                     sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
    geometry["geometryFingerprintSha256"] = fingerprint
    write(DATA / "boulevard-preview.json", geometry)
    terrain_images(args.fill, plan, candidate, geometry, report)
    landmark_facades(args.native, args.fill, report, extras)
    source_rom = args.rom_dir / "taichung-firered.gba"
    metadata = read(args.rom_dir / "build.json")
    require(digest(source_rom) == metadata["sha256"] == digest(args.native / "pokefirered.gba"),
            "The frozen cartridge differs from its native build.")
    symbols = subprocess.check_output([args.nm, "--defined-only", "--print-size", args.native / "pokefirered.elf"], text=True)
    [symbol] = [line.split() for line in symbols.splitlines() if line.endswith(" gTaichungEncounterBridge")]
    address, size = [int(value, 16) for value in symbol[:2]]
    require(size in (64, 72) and address % 4 == 0 and 0x02000000 <= address <= 0x02040000 - size,
            "The native encounter bridge has an unexpected layout.")
    metadata["encounterBridge"] = {"version": {64: 1, 72: 2}[size], "size": size, "address": address,
                                    "magicA": 0x4E454354, "magicB": 0x31525443}
    metadata["minimap"] = {"schemaVersion": 1, "geometryFingerprintSha256": fingerprint}
    dest = WEB / "public/roms"
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_rom, dest / source_rom.name)
    write(dest / "build.json", metadata)
    print(f"Paired {len(exteriors)} Boulevard maps and {len(markers)} landmarks to the verified cartridge.")


if __name__ == "__main__":
    main()
