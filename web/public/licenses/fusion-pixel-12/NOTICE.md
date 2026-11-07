# Taichung Native Bitmap12 source notice

The bundled gzip contains the unmodified `fusion-pixel-12px-monospaced-zh_tw.bdf` from TakWolf/Fusion Pixel Font release2026.10.25. Gzip is a storage container only. The original file SHA-256 is `8232a657b1af25a3e543e313a3659394310d68373a4d77a6edc8edf39c51b2fd`; the exact official archive/entry and source hashes are recorded in `../taichung-native-font.json`.

The game's generated12x14one-bit subset is named **Taichung Native Bitmap12**, derived from this font. It remains under SIL Open Font License1.1. Include all bundled license/copyright notices when redistributing the font or subset with the game. The release bundles Fusion Pixel, Ark Pixel, Cubic11 and Galmuri notices; their exact texts are retained in this directory. This is attribution, not endorsement. No game-ROM glyphs were used.

Original release: https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.10.25
Source project: https://github.com/TakWolf/fusion-pixel-font

The generator reads authored BDF bits directly, with one top padding row, twelve-pixel advance and a12x14cell. It performs no antialiasing, filtering, rescaling, synthetic bolding or hidden fallback. Only the476currently needed glyph rows are compiled into this checkpoint; the larger compressed source exists for reproducible future glyph additions and is not compiled into the cartridge.
