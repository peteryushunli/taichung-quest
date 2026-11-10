#!/usr/bin/env python3
"""Render the landing page's city map from the native map source.

Pastes the three exterior districts at their City Map world origins, using the
game's own metatiles via tools/taichung/render_maps.py. Tile slots the game
animates are drawn with their first animation frame, as the cartridge shows them
(the still, flat water, for one). Outside the districts stays transparent.
Sprites and object events are not drawn. Requires Pillow.

  python3 web/scripts/render-landing-map.py --source vendor/pokefirered
"""

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parents[1]
# InitTilesetAnim_General copies these frames over the primary's tiles at run time (src/tileset_anims.c):
# folder under data/tilesets/primary/general/anim, first 4bpp tile slot, tile count.
GENERAL_ANIMS = (("water_current_landwatersedge", 416, 48), ("sandwatersedge", 464, 18), ("flower", 508, 4))
ANIMS_BY_CALLBACK = {
    "InitTilesetAnim_General": GENERAL_ANIMS,
    # Approved-art banks bake still water before packing and draw no sand;
    # slots416-481 can contain landmark art. Only flowers animate there.
    "InitTilesetAnim_TaichungApproved": GENERAL_ANIMS[2:],
}


def animated_tile_paths(native, source, scratch):
    """Render frame0 only in the graphic slots owned by each native callback."""
    headers = (source / "src/data/tilesets/headers.h").read_text()
    original = native.tileset_paths
    patched = {}

    def tileset_paths(src, label):
        paths = original(src, label)
        name = label if label.startswith("gTileset_") else f"gTileset_{label}"
        header = re.search(rf"\b{re.escape(name)}\s*=\s*\{{(.*?)\}};", headers, re.S).group(1)
        callback = re.search(r"\.callback\s*=\s*(\w+)", header)
        callback = callback.group(1) if callback else "NULL"
        if callback == "NULL":
            return paths
        if callback not in ANIMS_BY_CALLBACK:
            raise ValueError(f"{name} animates with {callback}; teach this script its frames before rendering")
        if name not in patched:
            # A copy keeps the tileset's own palette, so saving it cannot remap the 4bpp indices.
            sheet = Image.open(paths["tiles"]).copy()
            if sheet.height < 512 // 16 * 8:
                raise ValueError(f"{paths['tiles']} has no room for the animated slots")
            for folder, first, count in ANIMS_BY_CALLBACK[callback]:
                frame = Image.open(source / "data/tilesets/primary/general/anim" / folder / "0.png")
                for k in range(count):
                    tile = frame.crop((k % 2 * 8, k // 2 * 8, k % 2 * 8 + 8, k // 2 * 8 + 8))
                    n = first + k
                    sheet.paste(tile, (n % 16 * 8, n // 16 * 8))
            patched[name] = scratch / f"{name}.png"
            sheet.save(patched[name])
        return {**paths, "tiles": patched[name]}

    native.tileset_paths = tileset_paths


def save_lossless_map(image, output):
    """Keep compact indexed maps when possible; never quantize native art.

    Each native tileset has a hardware palette, but the assembled city may use
    more than 255 opaque colors across its many maps. Such maps need a truecolor
    PNG to retain all of those colors alongside the transparent outside region.
    """
    rgba = image.convert("RGBA")
    pixels = rgba.tobytes()
    colors = sorted({tuple(pixels[n:n + 3]) for n in range(0, len(pixels), 4) if pixels[n + 3]})
    binary_alpha = not any(rgba.getchannel("A").histogram()[1:255])
    output.parent.mkdir(parents=True, exist_ok=True)
    if len(colors) > 255 or not binary_alpha:
        rgba.save(output, optimize=True)
        return len(colors), "RGBA"

    # Reserve index 0 for the transparent outside; opaque black has its own index.
    index = {rgb: n + 1 for n, rgb in enumerate(colors)}
    indexed = Image.frombytes("P", rgba.size, bytes(
        index[(pixels[n], pixels[n + 1], pixels[n + 2])] if pixels[n + 3] else 0
        for n in range(0, len(pixels), 4)
    ))
    indexed.putpalette([0, 0, 0] + [channel for rgb in colors for channel in rgb])
    indexed.save(output, transparency=0, optimize=True)
    return len(colors), "indexed"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=WEB.parent / "vendor/pokefirered")
    parser.add_argument("--contract", type=Path, default=WEB / "src/data/minimap-contract.json")
    parser.add_argument("--output", type=Path, default=WEB / "src/assets/landing/city-map.png")
    args = parser.parse_args()
    source = args.source.resolve()
    sys.path.insert(0, str(source / "tools/taichung"))
    import render_maps as native
    scratch = Path(tempfile.mkdtemp(prefix="city-map-"))
    animated_tile_paths(native, source, scratch)

    contract = json.loads(args.contract.read_text())
    layouts = {layout["id"]: layout for layout in json.loads((source / "data/layouts/layouts.json").read_text())["layouts"] if "id" in layout}
    world = contract["world"]
    image = Image.new("RGBA", (world["width"] * 16, world["height"] * 16))
    for key, district in contract["mapsByNativeKey"].items():
        if district["kind"] != "exterior":
            continue
        layout = layouts[district["layoutId"]]
        if (layout["width"], layout["height"]) != (district["width"], district["height"]):
            raise ValueError(f"{key} is {layout['width']}x{layout['height']} in source but {district['width']}x{district['height']} in the contract")
        tiles = native.render_metatiles(source, layout["primary_tileset"], layout["secondary_tileset"])
        cells = native.words(source / layout["blockdata_filepath"])
        x0, y0 = district["worldOrigin"]
        for n, value in enumerate(cells):
            image.paste(tiles[value & 0x3FF], ((x0 + n % layout["width"]) * 16, (y0 + n // layout["width"]) * 16))

    color_count, png_mode = save_lossless_map(image, args.output)

    commit = subprocess.run(["git", "-C", str(source), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(f"{args.output} {image.width}x{image.height}, {color_count} colours ({png_mode}), source {commit or 'unknown'}, sha256 {digest}")


if __name__ == "__main__":
    main()
