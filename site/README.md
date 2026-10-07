# SketchDeck × Spotify showcase

Static site. No framework, no build dependencies beyond Node.

## Edit content
- `data.mjs` holds every project (title, copy, year, team, gallery order), the headline, and the sidebar stats.
- Images live in `assets/img/<slug>/`. Add a file there and reference it in that project's `gallery` list.
- Videos live in `assets/video/`.

## Build
```
node build.mjs
```
Writes `index.html` and one page per project into `work/`.

## Preview
```
python3 -m http.server 8080
```
Then open http://localhost:8080.

## Deploy
Upload the whole `site/` folder to any static host (Netlify, Vercel, S3, GitHub Pages).
The two long films are about 100 MB each; if the host caps file size, move them to a video host and point `video` in `data.mjs` at the new URL.

## Notes
- Fonts: Spotify Mix (woff2) is embedded from `assets/fonts/`.
- Logos: `assets/img/ui/halfpipe.png` (SketchDeck) and `assets/img/ui/spotify.png`.
- Home page: the liquid-glass carousel (`assets/liquid.js`, plain WebGL). Config objects at the top of the file mirror the original project: `CONFIG` (panel height, gap, scroll ease, snap), `LENS` (shape, dispersion, ring, glow, border line) and `ENTRY` (rise/grow animation). Cards are 16:9 (`card.jpg`, cut from the same source as `hero.jpg`). Projects in `cardVideos` (data.mjs) play a looping clip. Earlier carousels (`orbit.js`, `carousel.js`, `carousel3d.js`) are kept but unused.
- The stats drawer opens from the notch attached to the top edge and slides down; its content is `stats` and `teams` in `data.mjs`.
- Styling: dark grey (#0E0E0E) page with white type set in Spotify Mix (embedded woff2), SketchDeck Blue Moon / White Rabbit for the notch and stats drawer. Tokens sit at the top of `assets/style.css`.
- Every project has a square `card.jpg` (strip thumbnail) and a 16:9 `hero.jpg` cut from the same source; regenerate both together if you swap the source image.

## Asset pipeline (optional)
`../tools/` holds the small Swift and Python utilities used to derive every image on the site from the source files
(PDF page rendering, embedded-image extraction, auto-cropping, thumbnail fitting, video re-encoding). They were built
with the macOS command-line tools only (`swiftc`), since ffmpeg/ImageMagick are not installed. `assets2.sh` is the
current pipeline; its paths point at a scratch directory, so adjust `S=` before re-running.

## Credits
The home carousel is a plain-WebGL port of [liquid-glass-carousel](https://github.com/Yousuf-developer/liquid-glass-carousel)
by Yousuf-developer (MIT). The lens shader and the scroll/snap/entry behaviour follow that project; the click action
was changed to open our case studies.
