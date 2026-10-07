#!/bin/zsh
set -e
S=/private/tmp/claude-501/-Users-gustavopanichi-spotify-website/1744de8d-367a-4c4e-8e70-5c47bd5665d8/scratchpad
P=/Users/gustavopanichi/spotify_website
IMG=$S/tools/img; PR=$S/tools/pdfregion; R=$S/render; X=$S/extract; O=$P/site/assets/img
cd "$P"
fit(){ $IMG "$2" "$O/$1/thumb.jpg" 640 --fit $3 --bg "$4" --trim --quality 0.9 >/dev/null; }
cover(){ $IMG "$2" "$O/$1/thumb.jpg" 640 --square --focus ${3:-0.5},${4:-0.5} --quality 0.9 >/dev/null; }
region(){ $PR "$2" $3 $4 640 "$O/$1/thumb.jpg" >/dev/null; }
jpg(){ $IMG "$2" "$O/$1/$3" ${4:-1800} --quality 0.9 >/dev/null; }

# ---------- thumbnails
fit audio-playground "Audio Playground 2025/Logo 2/Logo 2 - Full Color.png" 0.78 '#FFCE2E'
$IMG $X/finance/img00030_1080x1419.jpg $S/cand/fin_logo.png 900 --crop 0.22,0.13,0.56,0.36 >/dev/null; fit finance-offsite $S/cand/fin_logo.png 0.74 '#1F2358'
$PR spotifest/spotifest.pdf 6 0.16,0.17,0.3,0.3 1200 $S/cand/sf_logo.png >/dev/null; fit spotifest $S/cand/sf_logo.png 0.72 '#171636'
region prompted-playlist "Prompted Playlist Virtual Briefing.pdf" 1 0.08,0.2,0.42,0.747
fit ai-show-and-tell $X/aims/img00014_1997x876.jpg 0.74 '#FFFFFF'
region new-wave "Spotify_NewWave_Template_20260407.pdf" 1 0.0,0.05,0.5,0.889
fit ai-at-spotify $X/aispot/img00018_2048x1752.jpg 0.8 '#000000'
cover spotify-18th-birthday $S/video/b_75.jpg
cover tekniska-museet $S/video/museum_150.jpg
cover mau-messaging "Spotify_Mau_Messaging_Text_Ready/SVG/Congrats on your music milestone.svg"
cover lifecycle-refresh $X/lc/ill_01.png
fit welcome-to-new-york Welcome_NY.png 0.82 '#6950E5'
fit heart Heart_2.png 0.82 '#7656FF'
fit execution-guidance "Execution Guidance/Illustration_3.png" 0.78 '#FBEAEE'
fit one-million-tickets 1Million_Tickets.png 0.84 '#000000'
fit space-biker Space_Biker_on_Pegasus1x.png 0.86 '#FFFFFF'
fit punk-rider Punk_rider1x.png 0.86 '#FFFFFF'
fit strategy-days "Strategy Days1.png" 0.8 '#F5E6E0'
region strategy-days-takeaways "STRATEGY DAYS “TOP 5-7 TAKEAWAYS”.pdf" 1 0.02,0.3,0.3,0.533
region earnings-call-2021 "Spotify_2021_EarningsCallSeries_Design Refresh_20210326.pdf" 1 0,0,1,0.1657
region elvis Elvis_infographic_FINAL_090819.pdf 1 0,0,1,0.483
region serge Serge_Infographic_20190612.pdf 1 0,0,1,0.355

# ---------- Audio Playground: extracted pieces replace slide crops
rm -f $O/audio-playground/0*.jpg
i=0; for f in $(ls $X/ap/*.jpg | grep -v alpha); do i=$((i+1)); jpg audio-playground "$f" piece$(printf %02d $i).jpg 2000; done

# ---------- Finance offsite: extracted photos
rm -f $O/finance-offsite/0*.jpg
jpg finance-offsite $X/finance/img00012_2048x1366.jpg tshirt-woman.jpg
jpg finance-offsite $X/finance/img00030_1080x1419.jpg logo-card.jpg
jpg finance-offsite $X/finance/img00031_2048x1365.jpg gaudi.jpg
jpg finance-offsite $X/finance/img00039_2048x1365.jpg banners.jpg
jpg finance-offsite $X/finance/img00048_2048x1536.jpg stage-welcome.jpg
jpg finance-offsite $X/finance/img00055_2048x1311.jpg lanyard.jpg
$IMG $X/finance/img00056_2048x1536.jpg $O/finance-offsite/rollup.png 1600 --mask $X/finance/img00056_2048x1536.alpha.pgm >/dev/null || jpg finance-offsite $X/finance/img00056_2048x1536.jpg rollup.jpg
jpg finance-offsite $X/finance/img00070_2048x1152.jpg laptop.jpg
jpg finance-offsite $X/finance/img00077_2048x1365.jpg backdrop.jpg
jpg finance-offsite $X/finance/img00084_2048x1152.jpg tshirts.jpg
cp $S/cand/fin_logo.png $O/finance-offsite/logo.png

# ---------- Spotifest: vector regions + supplied PNGs
rm -f $O/spotifest/0*.jpg
cp $S/cand/sf_logo.png $O/spotifest/logo.png
$PR spotifest/spotifest.pdf 6 0.1,0.1,0.8,0.8 1800 $O/spotifest/logo-variations.jpg >/dev/null
$PR spotifest/spotifest.pdf 5 0.2,0.25,0.6,0.5 1600 $O/spotifest/logo-grid.jpg >/dev/null
$PR spotifest/spotifest.pdf 10 0.07,0.1,0.86,0.8 1800 $O/spotifest/keyvisual.jpg >/dev/null
$PR spotifest/spotifest.pdf 3 0.6,0.05,0.35,0.9 1200 $O/spotifest/chladni.jpg >/dev/null
$PR spotifest/spotifest.pdf 9 0.08,0.2,0.26,0.6 1200 $O/spotifest/pattern-1.jpg >/dev/null
$PR spotifest/spotifest.pdf 9 0.37,0.2,0.26,0.6 1200 $O/spotifest/pattern-2.jpg >/dev/null
$PR spotifest/spotifest.pdf 9 0.66,0.2,0.26,0.6 1200 $O/spotifest/pattern-3.jpg >/dev/null
jpg spotifest $X/spotifest/img00012_2048x1366.jpg street.jpg 2>/dev/null || true
jpg spotifest "spotifest/Spotifest_Concept_2/Links/Entrance_sign_horizontal.png" entrance-h.jpg
jpg spotifest "spotifest/Spotifest_Concept_2/Links/Phoebe_post.png" post-phoebe.jpg 1400
jpg spotifest "spotifest/Spotifest_Concept_2/Links/signage_2.png" signage-2.jpg
jpg spotifest "spotifest/Spotifest_Concept_2/Links/Phoebe_poster_1.png" poster1.jpg 1400

# ---------- Lifecycle: vector-extracted illustrations + cards
rm -f $O/lifecycle-refresh/ill_*.jpg $O/lifecycle-refresh/card_*.jpg $O/lifecycle-refresh/final-*.jpg $O/lifecycle-refresh/mockups-*.jpg
for f in $X/lc/ill_*.png; do b=$(basename $f .png); jpg lifecycle-refresh $f $b.jpg 1600; done
for f in $X/lc/card_*.png; do b=$(basename $f .png); jpg lifecycle-refresh $f $b.jpg 900; done

# ---------- MAU: SVG illustrations
rm -f $O/mau-messaging/[0-9]*.jpg; mkdir -p $O/mau-messaging
python3 - <<'PY'
import os,re,shutil
src='Spotify_Mau_Messaging_Text_Ready/SVG'; dst='site/assets/img/mau-messaging'
for f in sorted(os.listdir(src)):
    if not f.endswith('.svg') or f.startswith('Artboard'): continue
    slug=re.sub(r'[^a-z0-9]+','-',f[:-4].lower()).strip('-')
    shutil.copy(os.path.join(src,f), os.path.join(dst,slug+'.svg'))
print(len([f for f in os.listdir(dst) if f.endswith('.svg')]),'svgs')
PY
echo ASSETS2 DONE
