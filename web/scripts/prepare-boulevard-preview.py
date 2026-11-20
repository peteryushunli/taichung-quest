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
    "tiger-city": ("Tiger City", "老虎城", "Across from Maple Garden in Xitun.", "位於西屯，鄰近秋紅谷。"),
    "rainbow-village": ("Rainbow Village", "彩虹眷村", "Painted houses in southwestern Nantun.", "南屯西南側的彩繪眷村。"),
    "jingming-street": ("Jingming 1st Street", "精明一街", "A pedestrian shopping street in the West District.", "西區的行人商店街。"),
    "city-hall": ("City Hall", "臺中市政府", "The City Hall plaza on Taiwan Boulevard.", "臺灣大道旁的市政府廣場。"),
    "central-park": ("Central Park", "中央公園", "Follow the promenade through the park.", "沿著園道探索中央公園。"),
}
LABELS = [
    ("FENGJIA 逢甲", 40, 6), ("CENTRAL PARK 中央公園", 94, 6), ("BEITUN 北屯", 178, 23),
    ("XITUN 西屯", 46, 103), ("GREENWAY 草悟道", 205, 116),
    ("OLD CITY 舊城", 347, 22), ("NANTUN 南屯", 48, 215),
]


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


def terrain_images(fill, plan, candidate, width, height, origin):
    os.environ["FILL_RAW"] = "1"
    sys.path.insert(0, str(fill / "src"))
    import engine
    import events

    world = events.build()
    ink = {"outside": "#304940", "road": "#c5caab", "land": "#829d78", "water": "#83adb5"}
    image = Image.new("RGB", (width + 4, height + 4), ink["outside"])
    highway = {(x, y) for edge in plan["edges"] if edge["kind"] == "highway"
               for x in range(edge["rect"][0], edge["rect"][2])
               for y in range(edge["rect"][1], edge["rect"][3])}
    colors = {key: ImageColor.getrgb(value) for key, value in ink.items()}
    for row in range(height):
        for col in range(width):
            x, y = col + origin[0], row + origin[1]
            ch = world.at(x, y)
            kind = ("outside" if ch in "HRX" or (x, y) in highway else "water" if ch == "~"
                    else "road" if ch in engine.ROAD or ch in "bslaWyiq" else "land")
            image.putpixel((col + 2, row + 2), colors[kind])
    ART.mkdir(parents=True, exist_ok=True)
    image.save(ART / "radar.png", optimize=True)
    overview = Image.open(candidate / "city-overview.png")
    require(overview.width * height == overview.height * width, "The city image has the wrong geometry.")
    shutil.copyfile(candidate / "city-overview.png", ART / "city.png")
    art_rects = {place["id"]: place["artRect"] for place in plan["places"] if place["id"] in EXTRA_SIGHTS}
    art_rects["central-park"] = [78, 32, 102, 50]
    scale = overview.width // width
    places_art = ART / "places"
    places_art.mkdir(exist_ok=True)
    for place, (left, top, right, bottom) in art_rects.items():
        bounds = ((left - origin[0] - 2) * scale, (top - origin[1] - 1) * scale,
                  (right - origin[0] + 2) * scale, (bottom - origin[1] + 3) * scale)
        overview.crop(bounds).save(places_art / f"{place}.png")


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
        exteriors[entry["mapId"]] = {**entry, "kind": "exterior", "projection": "local-plus-world-origin",
                                     "worldOrigin": origin, "worldRect": origin + normalize([right, bottom])}

    places = {place["id"]: place for place in read(DATA / "landmarks.json") + read(DATA / "sights.json")}
    plan_districts = {district["id"]: district for district in plan["districts"]}
    extra_districts = ["xitun", "nantun", "west", "xitun", "shuinan"]
    extras = []
    for (place, (en, zh, description, description_zh)), district_id in zip(EXTRA_SIGHTS.items(), extra_districts):
        district = plan_districts[district_id]
        row = {"id": place, "nameEn": en, "nameZh": zh, "shortNameEn": en, "shortNameZh": zh,
               "minimapNameEn": en, "minimapNameZh": zh, "description": description,
               "descriptionZh": description_zh, "districtId": district_id,
               "districtEn": district["name"], "districtZh": district["zh"],
               "kind": "sight", "gymStatus": "not-a-gym", "playable": False}
        extras.append(row)
        places[place] = row
    places["guest-house"] = {"nameEn": "Guest house", "nameZh": "旅宿", "kind": "visit"}
    events = {"central-park": {"type": "sign", "tile": [89, 42]}}
    for event in raw["events"]["list"]:
        place = event.get("place")
        if place in places and event["tile"] and (
            place not in events or event["type"] == "door" and events[place]["type"] != "door"
        ):
            events[place] = event

    markers = {}
    interiors = {}
    for place, special in places.items():
        require(place in events, f"Missing Boulevard map anchor for {place}.")
        event = events[place]
        point = normalize(event["tile"])
        parent = map_at(point)
        ox, oy = parent["worldOrigin"]
        marker = {"id": place, "name": {"en": special["nameEn"], "zh": special["nameZh"]},
                  "kind": "landmark" if special.get("gymStatus") == "not-a-gym" else "landmark-gym",
                  "world": point, "localEntrance": [point[0] - ox, point[1] - oy],
                  "exteriorMapId": parent["mapId"], "exteriorNativeKey": parent["nativeKey"]}
        markers[place] = marker
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
                  "districtLabels": [{"label": label, "x": x - x0, "y": y - y0} for label, x, y in LABELS]},
        "mapsByNativeKey": {entry["nativeKey"]: entry for entry in exteriors.values()} | interiors,
        "markersById": markers, "seams": seams, "extraSights": extras,
        "sourceSha256": {"compiledMapReport": digest(candidate / "build-report.json"), **report["sourceSha256"]},
    }
    fingerprint = sha256(json.dumps({key: geometry[key] for key in GEOMETRY_FIELDS},
                                     sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
    geometry["geometryFingerprintSha256"] = fingerprint
    write(DATA / "boulevard-preview.json", geometry)
    terrain_images(args.fill, plan, candidate, width, height, (x0, y0))
    source_rom = args.rom_dir / "taichung-firered.gba"
    metadata = read(args.rom_dir / "build.json")
    require(digest(source_rom) == metadata["sha256"] == digest(args.native / "pokefirered.gba"),
            "The frozen cartridge differs from its native build.")
    symbols = subprocess.check_output([args.nm, "--defined-only", "--print-size", args.native / "pokefirered.elf"], text=True)
    [symbol] = [line.split() for line in symbols.splitlines() if line.endswith(" gTaichungEncounterBridge")]
    address, size = [int(value, 16) for value in symbol[:2]]
    require(size == 64 and address % 4 == 0 and 0x02000000 <= address <= 0x02040000 - size,
            "The native encounter bridge has an unexpected layout.")
    metadata["encounterBridge"] = {"version": 1, "size": size, "address": address,
                                    "magicA": 0x4E454354, "magicB": 0x31525443}
    metadata["minimap"] = {"schemaVersion": 1, "geometryFingerprintSha256": fingerprint}
    dest = WEB / "public/roms"
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_rom, dest / source_rom.name)
    write(dest / "build.json", metadata)
    save = WEB / "public/preview/old-station.sav"
    save.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(args.rom_dir / "taichung-firered.sav", save)
    print(f"Paired {len(exteriors)} Boulevard maps and {len(markers)} landmarks to the verified cartridge.")


if __name__ == "__main__":
    main()
