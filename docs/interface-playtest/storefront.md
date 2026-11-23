# FamilyMart rendering during opening dialogue

Base web 4711be42 / native 0e936329, exact ROM SHA256 66bb7f0e4c7e067298036b5f4353fd7eb582cb2f1cbbd73147f270a565110746. Use VITE_BOULEVARD_PREVIEW=1 for this release. No artwork, map geometry, ROM, or pack changes.

The old renderer gated buildings on free-field navigation; native navigation intentionally clears its position during scripts/dialogue. It also included the bottom dialogue area in camera confidence. The approved FamilyMart image/pack is intact (Maps separately regenerated it byte exactly).

The renderer now consumes the existing verified navigation/onboarding clients instead of scanning arbitrary matching heap copies. Onboarding supplies the actual scene during native dialogue. Only a browser-owned pause retains that verified scene; reconnect/reset clears it. The exact-ROM reference must still match the visible upper 112 pixels before rendering; the existing full-frame per-pixel foreground restoration remains unchanged. Public live minimap navigation safety is unchanged.

Validation: TypeScript check; 2 scene/framebuffer regression tests plus existing navigation/onboarding bridge tests. Chrome at http://127.0.0.1:4217/, same released ROM and feature flag, actual opening outside the guest house, production renderer before and fixed renderer after, same native tutorial text/viewport. Sign is readable; text, native window, characters, scooter, mailbox, watering can and plant occlusion remain correct. Paused checks use Game options while the native tutorial is active. This released native script explicitly uses ordinary dialogue without browser tutorial cards or emulator pause (data/maps/TaichungOldCity/scripts.inc); there is no tutorial-owned browser pause to reproduce in this ROM. Unit regression covers retained scene during browser pause.

Evidence in shared workspace: artifacts/qa/2026-11-23-interface-playtest/storefront-{before,after}-{dialogue,paused}.jpg. Before/after dialogue images include the identical TEAM tutorial line. North display inspected: Boulevard geometry northUp=false suppresses the N tab; no North rename made.

Main: cherry-pick the storefront commit independently. Existing pack still binds the production ROM. When integrating a new native ROM, regenerate/re-pair the HD pack using Main’s freeze process even if artwork pixels are unchanged. No publication performed here.
