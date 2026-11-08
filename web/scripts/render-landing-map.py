#!/usr/bin/env python3
"""Render the landing page's city map from the native map source.

Pastes the three exterior districts at their City Map world origins, using the
game's own metatiles via tools/taichung/render_maps.py. Outside the districts
stays transparent. Sprites and object events are not drawn. Requires Pillow.

  python3 web/scripts/render-landing-map.py --source vendor/pokefirered
"""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=WEB.parent / "vendor/pokefirered")
    parser.add_argument("--contract", type=Path, default=WEB / "src/data/minimap-contract.json")
    parser.add_argument("--output", type=Path, default=WEB / "src/assets/landing/city-map.png")
    args = parser.parse_args()
    source = args.source.resolve()
    sys.path.insert(0, str(source / "tools/taichung"))
    import render_maps as native

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

    # GBA colours fit one indexed palette; index 0 is the transparent outside.
    rgba = image.tobytes()
    pixels = [tuple(rgba[n:n + 4]) for n in range(0, len(rgba), 4)]
    colors = sorted({(r, g, b) for (r, g, b, a) in pixels if a})
    if len(colors) > 255:
        raise ValueError(f"{len(colors)} colours do not fit an indexed palette")
    index = {rgb: n + 1 for n, rgb in enumerate(colors)}
    indexed = Image.new("P", image.size)
    indexed.putpalette([0, 0, 0] + [channel for rgb in colors for channel in rgb])
    indexed.putdata([index[(r, g, b)] if a else 0 for (r, g, b, a) in pixels])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    indexed.save(args.output, transparency=0, optimize=True)

    commit = subprocess.run(["git", "-C", str(source), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(f"{args.output} {indexed.width}x{indexed.height}, {len(colors)} colours, source {commit or 'unknown'}, sha256 {digest}")


if __name__ == "__main__":
    main()
