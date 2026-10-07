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
- Home page: a strip of project cards born at the centre that travel outward to both edges and grow, looping forever (after melius.com). Tunables sit at the top of `assets/carousel.js`: `TRAVEL` (seconds centre to edge), `NEAR_W` (card size at the edge), `P` (growth curve), `GAP`. Projects listed in `cardVideos` (data.mjs) show a looping clip instead of a still.
- The stats drawer opens from the notch attached to the top edge and slides down; its content is `stats` and `teams` in `data.mjs`.
- Styling follows the SketchDeck brand: Blue Moon background, White Rabbit type, Syne (uppercase) for headings and Inter for body, loaded from Google Fonts. Tokens sit at the top of `assets/style.css`. Client colours appear only inside case-study imagery.
- Every project has a square `card.jpg` (strip thumbnail) and a 16:9 `hero.jpg` cut from the same source; regenerate both together if you swap the source image.

## Asset pipeline (optional)
`../tools/` holds the small Swift and Python utilities used to derive every image on the site from the source files
(PDF page rendering, embedded-image extraction, auto-cropping, thumbnail fitting, video re-encoding). They were built
with the macOS command-line tools only (`swiftc`), since ffmpeg/ImageMagick are not installed. `assets2.sh` is the
current pipeline; its paths point at a scratch directory, so adjust `S=` before re-running.
