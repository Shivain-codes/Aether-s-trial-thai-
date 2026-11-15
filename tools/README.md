# Optional asset tools

The game already includes its final avatar, movie and voice. These tools are not needed to play, run `npm run build`, or run the automated game tests.

- `inspect-character.cjs` loads the actual rig without launching a browser. After `npm ci` in the project root, install its optional canvas dependency with `npm install --prefix tools --no-save @napi-rs/canvas`. Run `node tools/inspect-character.cjs after.json`.
- `render-character-preview.py` turns that export into studio inspection images. Install Python packages Pillow and NumPy; run `python3 tools/render-character-preview.py shots/characters/after.json`. These previews do not reproduce browser lighting.
- `render-intro-short.py` draws the current 30-second movie using Pillow, NumPy and FFmpeg. Drawing helpers use macOS font paths in `render-intro.py`; substitute available fonts on other platforms. Render narration first, then run the visual script and its `--mux` command.
- `render-voice-short.py` uses the separately cached Kokoro ONNX model and voice files. Its docstring and `CREDITS.md` describe the runtime and provenance. Model weights and the voice environment are not included in Git.
- `render-intro.py`, `render-intro-extended.py`, and `render-voice.py` preserve previous movie source versions. Their intermediate outputs are not published.
- `amd/` contains historical, unexecuted cloud preparation notes. No cloud GPU is needed.

Generated dependency directories, raw audio, old renders, CPU geometry exports and Python caches are excluded by `.gitignore`. Final runtime assets remain in `src3d/`.
