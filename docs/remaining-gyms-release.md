# Seven remaining gym battles

The release candidate activates Science Museum/Yicheng, Greenway/Xingan, Shen Ji/Axiu, Fine Arts/Caining, Fengjia/Jiahe, Maple Garden/Muqing and Theater/Ling in their existing halls. It retains the live Station, Park and Miyahara battles and all ten permanent gym IDs.

The seven leaders use the shipped voluntary challenge flow: decline safely, prepare the selected party at level 50, battle the correct native trainer, record only a matching actual win, and allow a fresh attempt after a loss. Already-earned badges remain recorded without another battle. Each leader uses the existing field sprite and portrait, an authored three-member original-150 team and paired English/Traditional Chinese dialogue. Teams and move choices remain adjustable defaults.

Candidate native source: `b7b027d443f213def7d31aa76d2d0aa3cd478b76`, based on the live banner-fix source `c8e1495`. The seven new trainers occupy previously unused IDs746–752 and completion bits3–9; maximum trainer capacity768 and the version-7 save layout are unchanged. Existing three gym adapters, progression/team/save code, geometry, maps, artwork, opening/settings and banner code are exact to the previous live build.

Main appended the seven drafts' combined105 missing glyphs once, preserving all506 released mappings and bitmap rows byte for byte. The current codebook contains611 glyphs. Future punctuation proposals must append/re-encode by Unicode against this codebook rather than copy old indices or generated tables.

Completed checks:

- Native build and actual script assembly pass. Frozen ROM SHA-256: `88efa224c2e95fda382e26d79d14ad3964ff1c20407bb7eee46b92e321ba9385`; matching metadata comes from its ELF.
- Seven adapters share an outcome/text-guard matrix covering512 prior-badge combinations per gym, matching and mismatched battle starts/ends, non-wins, loss notices, repeats and volatile resets. Existing progress, team and version-7 save checks pass.
- All21 proposed species and their level-50 move presets validate against native original-150 data. The140 installed dialogue constants match current Story drafts; line-width review passes.
- The full portable patch applies to the pinned baseline and reproduces exact candidate tree `80ebcb76649f8738895b9c5530521c4bc43800d3`. Main independently checked the frozen ROM/metadata source and digest bindings.

Actual native per-gym portrait/team/win/record checks and one combined native Save/Continue/City Pass check remain pending. No production publication, physical-device test or completed organic playthrough is claimed by this candidate note. The current live game remains available during acceptance.

Evidence: ignored `artifacts/worktrees/3c6cc7b4e276/remaining-gyms/`, `artifacts/remaining-gyms/{font,integration}/` and `artifacts/story/native-dialogue/current-seven/`. Main owns canonical integration, patch export, pull request and Vercel publication. Claude's map/placement proposals and the unapproved opening/tutorial/settings work are excluded; the merged landing-page update remains included.
