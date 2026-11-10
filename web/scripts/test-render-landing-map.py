#!/usr/bin/env python3
"""PNG round-trip fixtures at the city renderer's indexed-palette boundary."""
import importlib.util
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest

from PIL import Image

spec = importlib.util.spec_from_file_location("city_map_renderer", Path(__file__).with_name("render-landing-map.py"))
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class LosslessCityMap(unittest.TestCase):
    def round_trip(self, colors):
        image = Image.new("RGBA", (len(colors) + 1, 1))
        image.putdata([(0, 0, 0, 0), *colors])
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "city.png"
            count, mode = renderer.save_lossless_map(image, output)
            with Image.open(output) as saved:
                self.assertEqual(saved.convert("RGBA").tobytes(), image.tobytes())
                return count, mode, saved.mode

    def test_255_opaque_colors_and_transparency_stay_indexed(self):
        colors = [(n, n * 7 % 256, n * 13 % 256, 255) for n in range(255)]
        # Opaque black and transparent black must remain distinct.
        self.assertEqual(self.round_trip(colors), (255, "indexed", "P"))

    def test_256_opaque_colors_are_preserved_in_truecolor(self):
        colors = [(n, n * 7 % 256, n * 13 % 256, 255) for n in range(256)]
        self.assertEqual(self.round_trip(colors), (256, "RGBA", "RGBA"))

    def test_partial_alpha_is_preserved_without_palette_normalization(self):
        self.assertEqual(self.round_trip([(32, 64, 96, 128), (32, 64, 96, 255)]), (1, "RGBA", "RGBA"))


class AnimationSlotOwnership(unittest.TestCase):
    def test_approved_callback_preserves_reclaimed_terrain_slots(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary)
            headers = source / "src/data/tilesets/headers.h"
            headers.parent.mkdir(parents=True)
            headers.write_text(
                "const struct Tileset gTileset_GeneralFixture = { .callback = InitTilesetAnim_General };\n"
                "const struct Tileset gTileset_ApprovedFixture = { .callback = InitTilesetAnim_TaichungApproved };\n"
            )
            palette = [channel for n in range(256) for channel in (n, n, n)]
            original = Image.new("P", (128, 320), 1)
            original.putpalette(palette)
            # All66 reclaimed water/sand slots hold recognizable art patterns.
            for n in range(416, 482):
                tile = Image.new("P", (8, 8), 3 + n % 7)
                original.paste(tile, (n % 16 * 8, n // 16 * 8))
            tiles = source / "tiles.png"
            original.save(tiles)
            for folder, count, color in [("water_current_landwatersedge", 48, 10),
                                         ("sandwatersedge", 18, 11), ("flower", 4, 12)]:
                path = source / "data/tilesets/primary/general/anim" / folder / "0.png"
                path.parent.mkdir(parents=True)
                frame = Image.new("P", (16, count // 2 * 8), color)
                frame.putpalette(palette)
                frame.save(path)
            native = SimpleNamespace(tileset_paths=lambda _source, _label: {"tiles": tiles})
            scratch = source / "scratch"
            scratch.mkdir()
            renderer.animated_tile_paths(native, source, scratch)
            approved = Image.open(native.tileset_paths(source, "ApprovedFixture")["tiles"])
            general = Image.open(native.tileset_paths(source, "GeneralFixture")["tiles"])
            water_rect = (0, 26 * 8, 128, 29 * 8)
            self.assertEqual(approved.crop(water_rect).tobytes(), original.crop(water_rect).tobytes())
            self.assertEqual(set(general.crop(water_rect).tobytes()), {10})
            for n in range(416, 482):
                box = (n % 16 * 8, n // 16 * 8, n % 16 * 8 + 8, n // 16 * 8 + 8)
                self.assertEqual(approved.crop(box).tobytes(), original.crop(box).tobytes())
            for n in range(464, 482):
                self.assertEqual(set(general.crop((n % 16 * 8, n // 16 * 8,
                                                  n % 16 * 8 + 8, n // 16 * 8 + 8)).tobytes()), {11})
            for image in (approved, general):
                for n in range(508, 512):
                    self.assertEqual(set(image.crop((n % 16 * 8, n // 16 * 8,
                                                    n % 16 * 8 + 8, n // 16 * 8 + 8)).tobytes()), {12})
                self.assertEqual(image.crop((0, 0, 8, 8)).tobytes(), original.crop((0, 0, 8, 8)).tobytes())


if __name__ == "__main__":
    unittest.main()
