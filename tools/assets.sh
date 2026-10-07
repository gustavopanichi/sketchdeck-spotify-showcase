#!/bin/zsh
set -e
S=/private/tmp/claude-501/-Users-gustavopanichi-spotify-website/1744de8d-367a-4c4e-8e70-5c47bd5665d8/scratchpad
P=/Users/gustavopanichi/spotify_website
IMG=$S/tools/img; R=$S/render; O=$P/site/assets/img
cd "$P"
mk(){ mkdir -p "$O/$1"; }
thumb(){ # slug src fx fy [bg]
  if [ -n "$5" ]; then $IMG "$2" "$O/$1/thumb.jpg" 640 --square --focus $3,$4 --bg $5 --quality 0.88; else $IMG "$2" "$O/$1/thumb.jpg" 640 --square --focus $3,$4 --quality 0.88; fi >/dev/null; }
pages(){ # slug dir pages...
  local slug=$1 dir=$2; shift 2; local n=1
  for p in "$@"; do cp "$R/$dir/p$(printf %02d $p).jpg" "$O/$slug/$(printf %02d $n).jpg"; n=$((n+1)); done; }
img(){ # slug outname src maxW [bg]
  if [ -n "$5" ]; then $IMG "$3" "$O/$1/$2" $4 --bg $5 --quality 0.9; else $IMG "$3" "$O/$1/$2" $4 --quality 0.9; fi >/dev/null; }

# --- Branding
mk audio-playground
thumb audio-playground "Audio Playground 2025/Logo 2/Logo 2 - Green BG.png" 0.5 0.5
for n in 1 2 3 4 5; do $IMG "$R/ap_templates/p0$((n+1)).jpg" "$O/audio-playground/0$n.jpg" 1800 --crop 0.03,0.12,0.94,0.85 --quality 0.9 >/dev/null; done
cp "$R/ap_splash/p01.jpg" "$O/audio-playground/splash.jpg"
img audio-playground logo1.png "Audio Playground 2025/Logo 1/Logo 1 - Full Color.png" 1600
img audio-playground logo2.png "Audio Playground 2025/Logo 2/Logo 2 - Green BG.png" 1600
cp "Audio Playground 2025/Characters_Pink.gif" "$O/audio-playground/characters.gif"
cp "Audio Playground 2025/Logo 1/Logo_1_b.gif" "$O/audio-playground/logo1.gif"
cp "$S/video/std_3.jpg" "$O/audio-playground/savethedate.jpg"
cp "Audio Playground 2025/Save_the_Date.mp4" "$P/site/assets/video/audio-playground-save-the-date.mp4"

mk finance-offsite
thumb finance-offsite "$R/finance_offsite/p02.jpg" 0.17 0.5
pages finance-offsite finance_offsite 1 2 3 4 5 6 7 8

mk spotifest
thumb spotifest "spotifest/Spotifest_Concept_2/Links/visual_post.png" 0.5 0.5
pages spotifest spotifest 3 4 5 6 7 8 9 10 11 12 13 14 15 16
img spotifest poster1.jpg "spotifest/Spotifest_Concept_2/Links/Phoebe_poster_1.png" 1400
img spotifest poster2.jpg "spotifest/Spotifest_Concept_2/Links/Phoebe_poster_2.png" 1400
img spotifest signage.jpg "spotifest/Spotifest_Concept_2/Links/signage_1.png" 1800
img spotifest tote.jpg "spotifest/Spotifest_Concept_2/Links/tote.png" 1400
img spotifest tshirt.jpg "spotifest/Spotifest_Concept_2/Links/tshirt.png" 1800 '#2D00F7'
img spotifest post.jpg "spotifest/Spotifest_Concept_2/Links/visual_post.png" 1400

# --- Presentations
mk prompted-playlist
thumb prompted-playlist "$R/prompted/p01.jpg" 0.5 0.5
pages prompted-playlist prompted 1 2 3 4 5 6 7 8 9 10 14 18 19 21

mk ai-show-and-tell
thumb ai-show-and-tell "$R/aims/p01.jpg" 0.5 0.5
pages ai-show-and-tell aims 1 4 5 8 9 10 11 12 13 14
$S/tools/compress "Spotify_Aims_DeckTemplate_Cover01.mp4" "$P/site/assets/video/ai-show-and-tell-cover.mp4" 1920 2.5 >/dev/null 2>&1
cp "$S/video/aims_2.jpg" "$O/ai-show-and-tell/cover.jpg"

mk new-wave
thumb new-wave "$R/newwave/p01.jpg" 0.5 0.5
pages new-wave newwave 1 5 9 13 17 19 21 25 29 31 33 37 45 49 53 61

mk ai-at-spotify
thumb ai-at-spotify "$R/ai_at_spotify/p01.jpg" 0.62 0.5
pages ai-at-spotify ai_at_spotify 1 2 3 4 5 8 9 10 11 12 14 15 17

# --- Video
mk spotify-18th-birthday
thumb spotify-18th-birthday "$S/video/bday_60.jpg" 0.5 0.5
cp "$S/video/bday_60.jpg" "$O/spotify-18th-birthday/poster.jpg"
mk tekniska-museet
thumb tekniska-museet "$S/video/museum_150.jpg" 0.5 0.5
cp "$S/video/museum_150.jpg" "$O/tekniska-museet/poster.jpg"

# --- Social
mk mau-messaging
thumb mau-messaging "$R/mau/p06.jpg" 0.5 0.5
pages mau-messaging mau 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25
mk lifecycle-refresh
thumb lifecycle-refresh "$R/lifecycle_final/p01.jpg" 0.5 0.06
cp "$R/lifecycle_mockups/p01.jpg" "$O/lifecycle-refresh/mockups-1.jpg"
cp "$R/lifecycle_mockups/p02.jpg" "$O/lifecycle-refresh/mockups-2.jpg"
cp "$R/lifecycle_final/p01.jpg" "$O/lifecycle-refresh/final-1.jpg"
cp "$R/lifecycle_final/p02.jpg" "$O/lifecycle-refresh/final-2.jpg"

# --- Illustrations
mk welcome-to-new-york; thumb welcome-to-new-york "Welcome_NY.png" 0.5 0.5; img welcome-to-new-york full.jpg "Welcome_NY.png" 2400 '#6950E5'
mk heart; thumb heart "Heart_2.png" 0.5 0.5; img heart full.jpg "Heart_2.png" 2400 '#7656FF'
mk one-million-tickets; thumb one-million-tickets "1Million_Tickets.png" 0.5 0.5; img one-million-tickets full.jpg "1Million_Tickets.png" 2400 '#000000'
mk space-biker; thumb space-biker "Space_Biker_on_Pegasus1x.png" 0.5 0.5; img space-biker full.png "Space_Biker_on_Pegasus1x.png" 1460
mk punk-rider; thumb punk-rider "Punk_rider1x.png" 0.5 0.5; img punk-rider full.png "Punk_rider1x.png" 1185
mk execution-guidance
thumb execution-guidance "Execution Guidance/Illustration_3.png" 0.5 0.5 '#FBEAEE'
img execution-guidance 1.png "Execution Guidance/Illustration_1.png" 1278
img execution-guidance 2.png "Execution Guidance/Illustration_2.png" 1055
img execution-guidance 3.png "Execution Guidance/Illustration_3.png" 1140
mk strategy-days
thumb strategy-days "Strategy Days1.png" 0.5 0.5 '#F5E6E0'
img strategy-days 1.png "Strategy Days1.png" 1800
img strategy-days 2.png "Strategy Days2.png" 1800
img strategy-days 3.png "Strategy Days3.png" 1800

# --- Infographics
mk strategy-days-takeaways; thumb strategy-days-takeaways "$R/strategy_takeaways/p01.jpg" 0.3 0.5; pages strategy-days-takeaways strategy_takeaways 1 2 3
mk earnings-call-2021; thumb earnings-call-2021 "$R/earnings/p01.jpg" 0.5 0.04; pages earnings-call-2021 earnings 1 2
mk elvis; thumb elvis "$R/elvis/p01.jpg" 0.5 0.06; pages elvis elvis 1
mk serge; thumb serge "$R/serge/p01.jpg" 0.5 0.06; pages serge serge 1 2

# logos
mkdir -p $O/ui
$S/tools/pdf2pngA "LOGOS/SD Logo Asets 2025 4/RGB/halfpipe_blue.pdf" $O/ui/halfpipe.png 480 >/dev/null
$S/tools/pdf2pngA "LOGOS/spotify-icons-logos/icons/01_RGB/03_PDF/Spotify_Icon_RGB_Black.pdf" $O/ui/spotify.png 480 >/dev/null
echo ASSETS DONE; du -sh $O; ls $O
