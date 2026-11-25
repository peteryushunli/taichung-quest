#!/usr/bin/env python3
"""Register source-backed Boulevard façades against the paired camera references.

The placement inventory is exported from the native authoring compiler in world
tiles. The existing pack and every registered picture remain the baseline.
"""
import argparse
import base64
from collections import Counter
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


SCALE = 2
SHEN_JI_STUDY = "artifacts/worktrees/c291d4842985/landmark-art/shen-ji-study-v1.png"
SHEN_JI_SOURCE = "data/taichung/landmarks/shen-ji/candidate/source-component-footprints.json"
SHEN_JI_MANIFEST = "data/taichung/landmarks/shen-ji/generation.json"
CITY_STYLES = "data/taichung/oldcity-buildings/art.json"
HOME = "v3-shenji-small-home"
WORKSHOP = "v3-shenji-wide-workshop"
SHEN_JI_COMPOSITIONS = {
    "v3-shenji-attached-small-row": (HOME, HOME, HOME),
    "v3-shenji-mixed-frontage": (HOME, WORKSHOP),
}


def read(path):
    return json.loads(path.read_bytes())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def image(path):
    with Image.open(path) as source:
        return source.convert("RGBA")


def fit(source, native):
    """Match the footprint of the original installed sprite at 2× detail."""
    alpha = source.getchannel("A")
    source.putalpha(alpha.point(lambda value: value if value > 40 else 0))
    source = source.crop(source.getbbox())
    x0, y0, x1, y1 = native.getchannel("A").getbbox()
    target = Image.new("RGBA", (native.width * SCALE, native.height * SCALE))
    art = source.resize(((x1-x0)*SCALE, (y1-y0)*SCALE), Image.Resampling.LANCZOS)
    target.alpha_composite(art, (x0*SCALE, y0*SCALE))
    return target


def authored_masters(project, native, installed):
    masters = {}
    city = read(native / CITY_STYLES)
    study = native / city["study"]["png"]
    assert sha(study) == city["study"]["sha256"]
    atlas = image(study)
    for style in city["styles"]:
        name = style["id"]
        pixels = installed[name]
        authored = np.asarray(image(native / style["png"]))
        compiled_input = np.asarray(pixels)
        opaque = compiled_input[..., 3] >= 128
        assert authored.shape == compiled_input.shape
        assert np.array_equal(authored[opaque], compiled_input[opaque]), name
        art = atlas.crop(style["studyCrop"])
        if name == "teal-pair":
            # The installed duplex mirrors the left half of the approved study.
            left = art.crop((0, 0, art.width // 2, art.height))
            native_left = pixels.crop((0, 0, pixels.width // 2, pixels.height))
            sharp_half = fit(left, native_left)
            sharp = Image.new("RGBA", (pixels.width * SCALE, pixels.height * SCALE))
            sharp.alpha_composite(sharp_half)
            sharp.alpha_composite(ImageOps.mirror(sharp_half), (sharp_half.width, 0))
        else:
            sharp = fit(art, pixels)
        masters[name] = sharp, str(study), sha(study)

    study = project / SHEN_JI_STUDY
    digest = sha(study)
    assert digest == read(native / SHEN_JI_MANIFEST)["artifactSha256"]
    atlas = image(study)
    boxes = read(native / SHEN_JI_SOURCE)["largestTwoLeftToRight"]
    for name, box in zip((HOME, WORKSHOP), boxes):
        masters[name] = fit(atlas.crop(box["boxExclusive"]), installed[name]), str(study), digest
    for name, parts in SHEN_JI_COMPOSITIONS.items():
        pixels = installed[name]
        assembled = Image.new("RGBA", (pixels.width * SCALE, pixels.height * SCALE))
        x = 0
        for part in parts:
            art = masters[part][0]
            assembled.alpha_composite(art, (x, 0))
            x += art.width
        assert x == assembled.width
        masters[name] = assembled, str(study), digest
    return masters


def envelope(row, origin, margin):
    x = (row["x"] - origin[0] + margin) * 16
    y = (row["y"] - origin[1] + margin) * 16
    w, h = row["tiles"]
    return x, y, w * 16, h * 16


def clip_box(reference, box):
    x, y, w, h = box
    a, b = max(0, x), max(0, y)
    c, d = min(reference.shape[1], x + w), min(reference.shape[0], y + h)
    if a >= c or b >= d:
        return None
    return np.s_[b:d, a:c], np.s_[b-y:d-y, a-x:c-x]


def owned_mask(reference, sprite, box, occupied):
    clipped = clip_box(reference, box)
    if clipped is None:
        return None
    target, source = clipped
    s = np.asarray(sprite)[source]
    opaque = s[..., 3] >= 128
    if opaque.sum() < 64:
        return None
    match = (opaque & np.all((reference[target] >> 3) == (s[..., :3] >> 3), axis=2))
    if match.sum() < opaque.sum() * 0.9:
        return None
    # The current renderer restores uncovered native pixels after the building
    # pass. A second entry across existing HD foreground could erase it.
    if occupied[target].any():
        return None
    mask = np.zeros((box[3], box[2]), dtype=bool)
    mask[source] = match
    occupied[target] |= match
    return mask


def mark_existing(reference, entries):
    occupied = np.zeros(reference.shape[:2], dtype=bool)
    for entry in entries:
        box = tuple(entry[k] for k in ("x", "y", "w", "h"))
        clipped = clip_box(reference, box)
        if clipped is None:
            continue
        target, source = clipped
        raw = np.frombuffer(base64.b64decode(entry["covers"]), dtype=np.uint8)
        mask = np.unpackbits(raw, count=entry["w"] * entry["h"], bitorder="little")
        occupied[target] |= mask.reshape(entry["h"], entry["w"])[source].astype(bool)
    return occupied


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    for name in ("project", "native", "baseline", "inventory", "output", "receipt"):
        ap.add_argument(name, type=Path)
    args = ap.parse_args()
    pack = read(args.baseline / "pack.json")
    inventory = read(args.inventory)
    assert pack["romSha256"] == sha(args.native / "pokefirered.gba")
    rows = [row for row in inventory["placements"] if row["kind"] in ("building", "landmark")]
    installed = {name: image(path) for name, path in {p["sprite"]: p["native"] for p in rows}.items()}
    masters = authored_masters(args.project, args.native, installed)
    served = {}
    details = []
    before_primary = set()
    new_primary = set()
    for key, origin in inventory["maps"].items():
        current = pack["maps"][key]
        existing = current["buildings"]
        with Image.open(args.baseline / current["ref"]) as native_ref:
            reference = np.asarray(native_ref.convert("RGB"))
        boxes = {(b["x"], b["y"], b["w"], b["h"]) for b in existing if not b.get("kind")}
        occupied = mark_existing(reference, existing)
        # Existing bounding boxes outside their masks are restored by the
        # compositor. Keep new entries disjoint from those restore regions.
        existing_envelopes = occupied.copy()
        for box in boxes:
            clipped = clip_box(reference, box)
            if clipped is not None:
                existing_envelopes[clipped[0]] = True
        additions = []
        for row in rows:
            name = row["sprite"]
            identity = name, row["x"], row["y"], row["mirrored"]
            rect = envelope(row, origin, current["margin"])
            is_inside = (origin[0] <= row["x"] < origin[2] and origin[1] <= row["y"] < origin[3])
            if rect in boxes:
                if is_inside:
                    before_primary.add(identity)
                continue
            if name not in masters or row["kind"] != "building":
                continue
            clipped = clip_box(reference, rect)
            if clipped is None:
                continue
            # Reject rectangles that would restore another overlay's pixels.
            # A transparent apron can be cut from the overlay without moving
            # the art or its game position.
            sprite = installed[name]
            if row["mirrored"]:
                sprite = ImageOps.mirror(sprite)
            bounds = sprite.getchannel("A").getbbox()
            x, y, _, _ = rect
            bx, by, br, bd = bounds
            box = x + bx, y + by, br - bx, bd - by
            clipped = clip_box(reference, box)
            if clipped is None or existing_envelopes[clipped[0]].any():
                continue
            cropped = sprite.crop(bounds)
            mask = owned_mask(reference, cropped, box, occupied)
            if mask is None:
                continue
            picture_key = name, row["mirrored"]
            if picture_key not in served:
                sharp, source, digest = masters[name]
                if row["mirrored"]:
                    sharp = ImageOps.mirror(sharp)
                picture = f"pictures/city-facades--{name}{'-mirrored' if row['mirrored'] else ''}-2x.webp"
                destination = args.output / picture
                destination.parent.mkdir(parents=True, exist_ok=True)
                sharp.crop(tuple(v * SCALE for v in bounds)).save(destination, "WEBP", quality=90, method=6)
                served[picture_key] = picture, source, digest
            picture = served[picture_key][0]
            sprite_id = f"city-facades/{name}"
            covers = base64.b64encode(np.packbits(mask.ravel(), bitorder="little")).decode()
            additions.append(dict(sprite=sprite_id, mirrored=row["mirrored"], x=box[0], y=box[1],
                                  w=box[2], h=box[3], picture=picture, covers=covers))
            existing_envelopes[clipped[0]] = True
            details.append(dict(map=key, sprite=name, world=[row["x"],row["y"]],
                                primary=is_inside, box=box, covered=int(mask.sum()),
                                clipped=box[0] < 0 or box[1] < 0 or box[0]+box[2] > reference.shape[1]
                                or box[1]+box[3] > reference.shape[0]))
            if is_inside:
                new_primary.add(identity)
        insertion = next((i for i, b in enumerate(existing) if b.get("kind") == "sign"), len(existing))
        existing[insertion:insertion] = additions

    assert details, "No installed façades matched the approved masters"
    pack["originals"] = sorted(set(pack["originals"]) | {f"city-facades/{name}" for name, _ in served})
    (args.output / "pack.json").write_text(json.dumps(pack, separators=(",", ":")) + "\n")
    pictures = []
    for (name, mirrored), (file, source, digest) in served.items():
        path = args.output / file
        with Image.open(path) as picture:
            width, height = picture.size
        pictures.append(dict(file=file, style=name, mirrored=mirrored, source=source, sourceSha256=digest,
                             sha256=sha(path), transferBytes=path.stat().st_size, decodedBytes=width*height*4,
                             pixels=[width,height]))
    remaining = Counter(row["sprite"] for row in rows
                        if (row["sprite"],row["x"],row["y"],row["mirrored"]) not in before_primary | new_primary)
    result = dict(romSha256=pack["romSha256"], totalAuthoredPlacements=len(rows),
                  primaryBefore=len(before_primary), primaryAdded=len(new_primary),
                  mapEntriesAdded=len(details), pictures=pictures, details=details,
                  remainingByDesign=dict(remaining),
                  transferBytesAdded=sum(p["transferBytes"] for p in pictures),
                  decodedBytesAdded=sum(p["decodedBytes"] for p in pictures))
    args.receipt.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Added {len(details)} views and {len(new_primary)} primary placements using {len(served)} images")


if __name__ == "__main__":
    main()
