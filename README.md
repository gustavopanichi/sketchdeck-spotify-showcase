# SketchDeck × Spotify showcase

Eight years of making Spotify's story visible: a static portfolio site of SketchDeck's work for Spotify.

- `site/` is the deployable website (open `site/index.html`, or see `site/README.md` for editing and building).
- `tools/` holds the Swift/Python utilities used to derive every image and clip from the original source files.
- Deploys to Vercel (https://sketchdeck-spotify.vercel.app/) on every push to `main`; `vercel.json` points the host at `site/`.

Raw source material (PDFs, PSDs, master videos, fonts) is intentionally not in this repository.
