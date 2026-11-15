# Credits and provenance

Aether, Paimon, Mondstadt, Windrise, Dawn Winery, Stormterror and Genshin Impact are references to HoYoverse's game. This is an unofficial fan-made prototype. No Genshin models, textures, music, voice recordings, or game files were extracted or bundled. The character, companion and landmarks are simplified interpretations, not exact replicas.

The humanoid base mesh and textures are adapted from **VRM1_Constraint_Twist_Sample.vrm**, © 2022 pixiv Inc., from the official three-vrm examples:
https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm/examples/models

The downloaded model's embedded metadata permits redistribution and modification; license URL: https://vrm.dev/licenses/1.0/. The original `.vrm` is retained in `src3d/assets/traveler.vrm` with its metadata. Hair, clothing additions, sword, cape, companion, buildings, landscape and effects are authored programmatically for this prototype. Resident variants reuse the same licensed humanoid base.

- Three.js 0.180.0: MIT. https://github.com/mrdoob/three.js/blob/dev/LICENSE
- three-vrm 3.4.4: MIT. https://github.com/pixiv/three-vrm/blob/dev/LICENSE
- esbuild 0.25.12: MIT; build-time tool. https://github.com/evanw/esbuild/blob/main/LICENSE.md
- Current female narration: Kokoro-82M `af_heart`, generated locally through kokoro-onnx and ONNX Runtime on CPU. Model weights: Apache-2.0; kokoro-onnx: MIT. The voice is synthetic, not a human recording or celebrity imitation. The previous Samantha narration is retained only in the old backup.

Visual references inspected include the user's two attached images, official Mondstadt screenshots, and this community Dawn Winery screenshot. These references are not game textures:
https://genshin.hoyoverse.com/ja/news/detail/104574
https://www.hoyolab.com/article/5204062

The new opening film takes broad silhouette-storytelling inspiration from [Shadow Fight 2](https://shadowfight2.com/), developed/published by Nekki and Banzai Games. Its artwork, narrative, animation and synth score were created locally for Windborne in `tools/render-intro-short.py` (drawing helpers in `tools/render-intro.py` and `tools/render-intro-extended.py`); it does not contain Shadow Fight footage, music or dialogue. Narration is produced by `tools/render-voice-short.py` using [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) and the [ONNX community export](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX), with the [kokoro-onnx runtime](https://github.com/thewh1teagle/kokoro-onnx). Only generated audio is bundled; model weights and the Python environment remain in the local cache. The rendered source video is `src3d/assets/windborne-intro.mp4`.

Character refinements use authored geometry, procedural eye/face textures and the same licensed VRM base. Additional visual references: Aether full-body character artwork (https://www.creativeuncut.com/gallery-39/gi-traveler-male.html) and Paimon artwork from miHoYo’s event page (https://webstatic-sea.mihoyo.com/ys/event/e20200910-predrawcard-sea/index.html?region=jp). These reference images were not bundled into the game.
