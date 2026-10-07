// All content for the showcase lives here. Edit copy, years and stats freely; run `node build.mjs` afterwards.

export const site = {
  title: "SketchDeck × Spotify",
  headline: "Eight years of making Spotify's story visible",
  description: "A showcase of SketchDeck's creative work for Spotify: branding, presentations, video, social, illustration and infographics.",
};

// Relationship stats shown in the menu sidebar.
// Source: SketchDeck platform (project records across all Spotify accounts), pulled October 2026.
export const stats = [
  { value: "2018", label: "First REVERB project. Spotify has worked with SketchDeck across six separate accounts since then." },
  { value: "900+", label: "Projects placed across Spotify accounts: REVERB, Finance, Finance Strategy Ops, Songwriting, and pay-per-project teams." },
  { value: "22", label: "Pieces selected here, from a 2019 Serge Gainsbourg infographic to deck systems shipped in 2026." },
];

// People, from SketchDeck project records (team rosters) on the showcased projects.
export const people = [
  { name: "Matthew Gorham", role: "Account lead and project management" },
  { name: "Gustavo Panichi", role: "Creative direction" },
];
export const designers = ["Luanna Correia", "Jessica Souza", "Bruno Moncada", "Aleksey Tiurin", "Leandro Feuz", "Marc Lawrence", "Sherman Fuchs", "Katherine Lahude"];
// Spotify-side: distinct collaborators on the showcased projects, and currently active users in the REVERB account.
export const orgFacts = [
  { value: "19", label: "Spotify collaborators across the pieces shown here" },
  { value: "3", label: "Active REVERB members in the last 30 days" },
];

export const teams = [
  "REVERB (Communications)",
  "Finance",
  "Finance Strategy & Operations",
  "Songwriting / Noteable",
  "Live Events",
  "Personalization & Product",
];

// Gallery item types:
//   { src }                         image (optional: half, third, quarter, tall, contain, bg)
//   { video, poster }               looping clip
//   { phones: [{src,bg}], ... }     row of phone mock-ups showing card images
//   { cards: [{svg,title,body}] }   phone mock-ups built natively from an illustration + copy
//   { palette: ["#hex", ...] }      colour swatches
//   { text: "..." }                 a short caption row

const mauCards = [
  ["congrats-on-your-music-milestone", "Congrats on your music milestone", "You just hit a listening high. Keep the streak going."],
  ["looks-like-you-love-playlist", "Looks like you love [Playlist]", "You've played it more than anything else this month."],
  ["number-new-artists-discovered-this-week", "[Number] new artists discovered this week", "Your taste is expanding. Here's who you found."],
  ["the-xxs-are-your-music-decade", "The [XXs] are your music decade", "Most of your top tracks come from one era."],
  ["hear-what-country-is-listening-to", "Hear what [Country] is listening to", "Take a trip through another country's charts."],
  ["your-blend-mate-friend-name-made-a-discovery", "Your Blend-mate [Friend] made a discovery", "A new favourite just landed in your Blend."],
  ["which-song-did-you-listen-to-first", "Which song did you listen to first?", "Go back to the very start of your Spotify story."],
  ["give-artist-name-radio-a-try", "Give [Artist] Radio a try", "More of what you love, and the songs around it."],
  ["wow-number-playlists-this-year", "Wow, [Number] playlists this year", "You've been busy. Here's what you built."],
  ["listen-to-what-s-popular-in-genre", "Listen to what's popular in [Genre]", "The tracks everyone in your genre is playing right now."],
  ["think-back-to-a-year-ago-this-week", "Think back to a year ago this week", "Here's what was on repeat twelve months ago."],
  ["you-might-like-other-podcast", "You might like [Other Podcast]", "Fans of your favourite show are listening to this one too."],
];
const mauIllustrations = [
  "artist-is-on-friend-s-playlist", "congrats-on-your-music-milestone", "geo-can-t-get-enough-of-song", "give-artist-name-radio-a-try",
  "hear-what-country-is-listening-to", "is-playlist-your-soundtrack", "it-s-a-new-personal-playlist-record", "listen-share-discuss",
  "listen-to-what-s-popular-in-genre", "looks-like-you-love-playlist", "make-someone-smile-with-your-playlist", "milestone-met",
  "number-hours-of-music-last-month", "number-new-artists-discovered-this-week", "the-xxs-are-your-music-decade", "think-back-to-a-year-ago-this-week",
  "which-song-did-you-listen-to-first", "wow-number-playlists-this-year", "you-might-like-other-podcast", "your-blend-mate-friend-name-made-a-discovery",
  "your-playlist-playlist-is-popular",
];

// Lifecycle cards extracted from the vector PDF, with the card's own background colour so the phone screen matches.
const lcCards = [
  ["card_01", "#AF2896"], ["card_03", "#FFC864"], ["card_05", "#2D46B9"], ["card_07", "#509BF5"], ["card_08", "#FF5A3C"],
  ["card_10", "#9B8BBE"], ["card_12", "#2E7D6B"], ["card_13", "#1E3264"], ["card_15", "#FFC864"],
  ["card_20", "#F037A5"], ["card_21", "#2D46B9"], ["card_24", "#FFCDD2"],
];
const lcIlls = ["ill_01", "ill_02", "ill_03", "ill_05", "ill_06", "ill_07", "ill_08", "ill_09", "ill_11", "ill_12", "ill_15", "ill_17", "ill_18", "ill_19", "ill_20"];

// kind: "case" (full case study) | "illustration" (big image in a tinted frame) | "video" (full-width player)
// Projects with motion assets show them on the home strip instead of a still.
export const cardVideos = {
  "audio-playground": { video: "audio-playground-save-the-date.mp4" },
  "ai-show-and-tell": { video: "ai-show-and-tell-cover.mp4" },
  "spotify-18th-birthday": { video: "spotify-18th-birthday-loop.mp4" },
  "tekniska-museet": { video: "tekniska-museet-loop.mp4" },
};

// Aspect ratio (w/h) of each project's assets/img/<slug>/card.jpg, used by the home carousel.
export const cardRatios = {
  "audio-playground": 1.395,
  "finance-offsite": 1.5,
  "spotifest": 0.696,
  "prompted-playlist": 1.779,
  "ai-show-and-tell": 1.779,
  "new-wave": 1.779,
  "ai-at-spotify": 1.779,
  "spotify-18th-birthday": 1.779,
  "tekniska-museet": 1.779,
  "mau-messaging": 1.461,
  "lifecycle-refresh": 0.569,
  "welcome-to-new-york": 1.779,
  "heart": 1.779,
  "execution-guidance": 1.253,
  "one-million-tickets": 1.779,
  "space-biker": 1.404,
  "punk-rider": 1.141,
  "strategy-days": 0.897,
  "strategy-days-takeaways": 1.778,
  "earnings-call-2021": 0.83,
  "elvis": 0.805,
  "serge": 0.79
};

export const projects = [
  // ---------------------------------------------------------------- Branding
  {
    slug: "audio-playground",
    kind: "case",
    title: "Audio Playground",
    category: "Branding",
    year: "2025",
    team: "Spotify REVERB",
    services: ["Event identity", "Logo system", "Illustration", "Signage & collateral", "Motion", "Brand book"],
    intro: "An event identity for Spotify's family day, built to be loud, playful and endlessly recombinable across signage, screens and merch.",
    sections: [
      { h: "The brief", p: "Spotify needed a visual identity for Audio Playground, an internal event that turns the office into a space for families and kids. The identity had to feel unmistakably Spotify yet entirely its own, work on a lobby screen as well as on a hot-dog menu, and ship in time for a day at the London Adelphi building." },
      { h: "The idea", p: "Instruments with faces. A cast of illustrated characters, a guitar, a saxophone, a trumpet, a keyboard, carries the identity, set against a chunky mix of checkerboards, stripes and clashing brights. Two logo lockups, a curved badge and a stacked wordmark, let the mark flex between wayfinding and hero moments." },
      { h: "What we made", p: "Mood boards, brand concept, a full asset library, application samples and a brand book. The system was then rolled out into welcome walls, wayfinding, photo-booth backdrops, lobby and elevator screens, menus, a save-the-date animation and a splash page." },
    ],
    hero: "hero.jpg",
    gallery: [
      { src: "logo1.png", alt: "Audio Playground badge logo", half: true, contain: true, bg: "#2D7DF6" },
      { src: "logo2.png", alt: "Audio Playground stacked logo", half: true, contain: true, bg: "#FFCE2E" },
      { src: "piece02.jpg", alt: "Welcome wall, yellow variant", ratio: "4096/2305" },
      { src: "piece04.jpg", alt: "WC sign", quarter: true, ratio: "2460/4096" },
      { src: "piece06.jpg", alt: "Entrance sign", quarter: true, ratio: "2460/4096" },
      { src: "piece05.jpg", alt: "Exit to food court", quarter: true, ratio: "2460/4096" },
      { src: "piece08.jpg", alt: "Exit to WC", quarter: true, ratio: "2460/4096" },
      { src: "piece03.jpg", alt: "Food court banner", half: true, ratio: "4096/1275" },
      { src: "piece07.jpg", alt: "Coat check banner", half: true, ratio: "4096/1275" },
      { src: "piece09.jpg", alt: "Photo booth backdrop with the instrument cast", ratio: "4096/2938" },
      { src: "characters.gif", alt: "Animated character strip", ratio: "1920/520" },
      { src: "piece10.jpg", alt: "From playlists to playtime, landscape screen", half: true, ratio: "4/3" },
      { src: "piece11.jpg", alt: "From playlists to playtime, portrait screen", half: true, contain: true, bg: "#111", ratio: "4/3" },
      { video: "audio-playground-save-the-date.mp4", poster: "savethedate.jpg", alt: "Save the date animation", half: true },
      { src: "logo1.gif", alt: "Animated badge", half: true, contain: true, bg: "#111" },
      { src: "piece14.jpg", alt: "Hot-dog menu", ratio: "3509/2481" },
      { src: "splash.jpg", alt: "Event splash page", tall: true },
    ],
  },
  {
    slug: "finance-offsite",
    kind: "case",
    title: "Finance Global Offsite",
    category: "Branding",
    year: "2022",
    team: "Spotify Finance",
    services: ["Event identity", "Logo", "Brand assets", "Merch", "Stage & environmental"],
    intro: "A campaign identity for Spotify Finance's global offsite in Barcelona, timed to the 2022 World Cup and built from the city's own geometry.",
    sections: [
      { h: "The brief", p: "The Finance team was bringing colleagues from around the world to Barcelona for a multi-day offsite. They asked for a design concept that reflected the team's identity and the spirit of the city, and that could carry a touch of the World Cup without turning into a football poster." },
      { h: "The idea", p: "Gaudí's mosaics, broken into a system. We drew a palette of trencadís-style shapes, a sun-like logo built from those fragments, and a 2022 Finance Offsite badge that locks up with dates and place. The pieces recombine freely, so every application looks related without repeating." },
      { h: "What we made", p: "Mood boards, logo design, a brand asset library, application samples and a brand book, delivered in two phases. Applications included the stage backdrop and welcome screen, outdoor banners, lanyards and roll-up signage, sticker sheets and T-shirts." },
    ],
    hero: "hero.jpg",
    gallery: [
      { src: "gaudi.jpg", alt: "Trencadís inspiration", half: true, ratio: "4/3" },
      { src: "logo-card.jpg", alt: "2022 Finance Offsite badge", half: true, contain: true, bg: "#F4F1EA", ratio: "4/3" },
      { src: "banners.jpg", alt: "Outdoor banners", ratio: "2048/1365" },
      { src: "stage-welcome.jpg", alt: "Welcome Spotifiers stage screen", ratio: "4/3" },
      { src: "lanyard.jpg", alt: "Lanyard", half: true, ratio: "4/3" },
      { src: "rollup.png", alt: "Roll-up banner", half: true, contain: true, bg: "#1F2358" },
      { src: "laptop.jpg", alt: "Sticker sheet on a laptop", half: true, ratio: "16/9" },
      { src: "tshirts.jpg", alt: "T-shirts", half: true, ratio: "16/9" },
      { src: "backdrop.jpg", alt: "Stage backdrop", ratio: "2048/1365" },
    ],
  },
  {
    slug: "spotifest",
    kind: "case",
    title: "Spotifest",
    category: "Branding",
    year: "2022",
    team: "Spotify CommunityX",
    services: ["Festival identity", "Logotype", "Generative pattern", "Posters & signage", "Merch"],
    intro: "A festival identity concept for Spotify's internal music festival, built on how sound becomes visible.",
    sections: [
      { h: "The brief", p: "Spotify's CommunityX team planned an internal music festival for Spotifiers around the world and ran an RFP for its identity. The ask: something with the energy of a real festival, playful and bold, that could stretch across stages, posters, wayfinding and merch." },
      { h: "The idea", p: "Moving to the beat. The concept takes Spotify's own sound-wave logo as a starting point and borrows from Chladni figures, the patterns sand forms on a vibrating plate. Those figures become the festival's key visual, a rippling pattern that frames artists and spells out the logotype. The custom Spotifest wordmark is built on a rounded grid that echoes the same movement." },
      { h: "What we made", p: "Two concept routes, a logotype with lockup variations, typography and colour, the pattern system, and applications: artist posters, social posts, entrance and wayfinding signage, T-shirts and tote bags." },
    ],
    hero: "hero.jpg",
    gallery: [
      { src: "logo.png", alt: "Spotifest logotype", twothirds: true, contain: true, bg: "#171636" },
      { src: "chladni.jpg", alt: "Chladni figure, the starting point", third: true, contain: true, bg: "#0A0A0A" },
      { src: "logo-grid.jpg", alt: "Logotype construction grid", half: true, ratio: "16/9" },
      { src: "logo-variations.jpg", alt: "Logo variations", half: true, ratio: "16/9" },
      { palette: ["#FE4632", "#4100F2", "#CBF265", "#19E388", "#FECACF"] },
      { src: "pattern-1.jpg", alt: "Pattern, pink", third: true, square: true },
      { src: "pattern-2.jpg", alt: "Pattern, red", third: true, square: true },
      { src: "pattern-3.jpg", alt: "Pattern, green", third: true, square: true },
      { src: "street.jpg", alt: "Artist posters in the street", ratio: "3/2" },
      { src: "poster1.jpg", alt: "Phoebe Bridgers poster", half: true, portrait: true },
      { src: "tote.jpg", alt: "Tote bag", half: true, portrait: true },
      { src: "post-phoebe.jpg", alt: "Artist social post", half: true, square: true },
      { src: "signage-2.jpg", alt: "Wayfinding", half: true, square: true },
      { src: "entrance-h.jpg", alt: "Entrance sign", ratio: "2200/800" },
      { src: "tshirt.jpg", alt: "T-shirts", ratio: "3/2" },
    ],
  },

  // ---------------------------------------------------------------- Presentations
  {
    slug: "prompted-playlist",
    kind: "case",
    title: "Prompted Playlist",
    category: "Presentations",
    year: "2026",
    team: "Spotify REVERB",
    services: ["Deck design", "Visual system", "Product storytelling"],
    intro: "The press-briefing deck for Prompted Playlist, Spotify's feature that turns a sentence into a personalised playlist.",
    sections: [
      { h: "The brief", p: "Ahead of the January 2026 launch, Spotify's communications team needed a deck for virtual briefings with press, led by the VP of Product Personalization and the Head of Global Music Curation and Discovery. It had to explain a new product clearly, carry embargo rules, and look like a launch, not a status update." },
      { h: "The idea", p: "The product is about taste made visible, so the slides are built from spray-textured, hand-made patterns in acid green, pink and yellow that shift from slide to slide. Device mock-ups sit inside the pattern rather than on top of it, and the three inputs that shape a prompted playlist, genre, mood and world knowledge, become the closing visual." },
      { h: "What we made", p: "Style discovery in two rounds, then full design across 21 slides including speakers, embargo, product walkthrough, example prompts and Q&A. Delivered as an editable template so the team could drop in final brand and creative assets as they landed." },
    ],
    hero: "hero.jpg",
    gallery: [
      { src: "02.jpg", alt: "Speakers", half: true }, { src: "03.jpg", alt: "Embargo rules", half: true },
      { src: "04.jpg", alt: "Personalization stat", half: true }, { src: "05.jpg", alt: "Product screens", half: true },
      { src: "06.jpg", alt: "Playlist made just for you" },
      { src: "07.jpg", alt: "Listening history, Prompted Playlist, Culture", half: true }, { src: "08.jpg", alt: "Device in the pattern", half: true },
      { src: "09.jpg", alt: "Example prompts", half: true }, { src: "10.jpg", alt: "Playlist covers", half: true },
      { src: "11.jpg", alt: "Let's make a Prompted Playlist" },
      { src: "12.jpg", alt: "Q&A", half: true }, { src: "13.jpg", alt: "Thank you", half: true },
      { src: "14.jpg", alt: "Genre, Mood, World Knowledge" },
    ],
  },
  {
    slug: "ai-show-and-tell",
    kind: "case",
    title: "AI Show & Tell",
    category: "Presentations",
    year: "2026",
    team: "Spotify REVERB",
    services: ["Deck template", "Event identity", "Motion cover"],
    intro: "A deck template for an internal AI show-and-tell series, with a pixel-pattern identity that animates.",
    sections: [
      { h: "The brief", p: "Spotify runs internal sessions where teams demo what they are building with AI. They needed a shared template so every presenter looks like part of the same event, plus a cover that could open the session on screen." },
      { h: "The idea", p: "A pixelated pattern in red, electric blue and lime, shifting like a low-resolution signal, frames white content panels with a clipped corner. The AIM mark sits in the corner of every slide. The same pattern animates in the cover video, so the identity moves before anyone speaks." },
      { h: "What we made", p: "Two rounds of style discovery and three rounds of full design. The template includes three cover variants, agenda, chapter slides, headline, one- and two-column text, three-up layouts, image slides and a closing slide, plus the animated cover." },
    ],
    hero: "hero.jpg",
    gallery: [
      { video: "ai-show-and-tell-cover.mp4", poster: "cover.jpg", alt: "Animated cover" },
      { src: "02.jpg", alt: "Agenda", half: true }, { src: "03.jpg", alt: "Chapter slide", half: true },
      { src: "04.jpg", alt: "Big headline slide", half: true }, { src: "05.jpg", alt: "Three-up layout", half: true },
      { src: "06.jpg", alt: "One column text", half: true }, { src: "07.jpg", alt: "Two column text", half: true },
      { src: "08.jpg", alt: "Headline with image", half: true }, { src: "09.jpg", alt: "Headline", half: true },
      { src: "10.jpg", alt: "Thank you" },
    ],
  },
  {
    slug: "new-wave",
    kind: "case",
    title: "The New Wave",
    category: "Presentations",
    year: "2026",
    team: "Spotify REVERB",
    services: ["Deck template", "Visual system", "Data slides"],
    intro: "A 64-slide presentation system in four colourways, built around a bold ribbon pattern that reads from a distance.",
    sections: [
      { h: "The brief", p: "Spotify needed a presentation template for The New Wave, flexible enough to host artist stats, quotes and long-form sections while staying instantly recognisable. It had to be delivered on an express timeline." },
      { h: "The idea", p: "One thick, looping ribbon pattern, cut and cropped differently on every slide type, in mint, salmon, mustard and steel blue on black. Because the pattern is the identity, the content can be plain: white type, big numbers, a photo. The four colourways let presenters theme a section without breaking the system." },
      { h: "What we made", p: "Three cover options in four colours, agenda, headline, section dividers, stat slides for artist milestones, quote slides and closers, 64 layouts in total, delivered in two design rounds." },
    ],
    hero: "hero.jpg",
    gallery: [
      { src: "02.jpg", alt: "Cover option 2", half: true }, { src: "03.jpg", alt: "Cover option 3", half: true },
      { src: "04.jpg", alt: "Agenda", half: true }, { src: "05.jpg", alt: "Headline slide, mint", half: true },
      { src: "06.jpg", alt: "Headline slide, mustard", half: true }, { src: "07.jpg", alt: "Section divider", half: true },
      { src: "08.jpg", alt: "Artist stat slide", half: true }, { src: "09.jpg", alt: "Artist stat with photo", half: true },
      { src: "10.jpg", alt: "Artist stat, mustard", half: true }, { src: "11.jpg", alt: "Section divider, mint", half: true },
      { src: "12.jpg", alt: "Quote slide", half: true }, { src: "13.jpg", alt: "Quote slide, mint", half: true },
      { src: "14.jpg", alt: "Section divider with photo", half: true }, { src: "15.jpg", alt: "Thank you", half: true },
    ],
  },
  {
    slug: "ai-at-spotify",
    kind: "case",
    title: "AI at Spotify",
    category: "Presentations",
    year: "2025",
    team: "Spotify Engineering & Machine Learning",
    services: ["Keynote design", "Data visualisation", "Product storytelling"],
    intro: "A keynote for Spotify's VP of Engineering and Head of AI, telling the story of personalisation from recommendations to DJ and AI Playlist.",
    sections: [
      { h: "The brief", p: "An external-facing talk on how Spotify uses machine learning and generative AI across the product. The deck had to carry big numbers, product screenshots and architecture-level ideas like how LLMs sit in the loop, and hold up on a conference screen." },
      { h: "The idea", p: "Deep indigo and violet gradients, a glowing star motif and thin contour lines give the deck a quiet, technical glow. Phones float in the dark; stats are set large and clean; the LLM diagrams are reduced to a few labelled pills so the audience reads the shape of the system, not a wiring chart." },
      { h: "What we made", p: "Eighteen slides covering Spotify at a glance, personalisation across surfaces and verticals, scaling discovery, DJ and DJ Livi, AI Merch, AI Playlist, the under-the-hood loop of test, learn, refine, and why AI is working." },
    ],
    hero: "hero.jpg",
    gallery: [
      { src: "02.jpg", alt: "Spotify by the numbers", half: true }, { src: "03.jpg", alt: "Personalization is about connecting", half: true },
      { src: "04.jpg", alt: "ML and AI across surfaces", half: true }, { src: "05.jpg", alt: "Across verticals", half: true },
      { src: "06.jpg", alt: "A DJ in your pocket" },
      { src: "07.jpg", alt: "DJ Livi", half: true }, { src: "08.jpg", alt: "Under the hood: DJ", half: true },
      { src: "09.jpg", alt: "AI Merch", half: true }, { src: "10.jpg", alt: "Under the hood: AI Merch", half: true },
      { src: "11.jpg", alt: "AI Playlist", half: true }, { src: "12.jpg", alt: "Under the hood: AI Playlist", half: true },
      { src: "13.jpg", alt: "Why AI is working" },
    ],
  },

  // ---------------------------------------------------------------- Video
  {
    slug: "spotify-18th-birthday",
    kind: "video",
    title: "Spotify 18th Birthday",
    category: "Video",
    year: "2024",
    team: "Spotify REVERB",
    intro: "A film for Spotify's eighteenth birthday, mixing a timeline of milestones with the people who lived them.",
    video: "spotify-18th-birthday.mp4",
    poster: "poster.jpg",
  },
  {
    slug: "tekniska-museet",
    kind: "video",
    title: "Tekniska Museet Milestone Film",
    category: "Video",
    year: "2026",
    team: "Spotify REVERB",
    intro: "A paper-collage motion piece tracing Spotify's milestones, from a founding in Stockholm to 100 million subscribers, made for Stockholm's museum of technology.",
    video: "tekniska-museet.mp4",
    poster: "poster.jpg",
  },

  // ---------------------------------------------------------------- Social cards
  {
    slug: "mau-messaging",
    kind: "case",
    title: "MAU Messaging",
    category: "Social cards",
    year: "2022",
    team: "Spotify Growth",
    services: ["Illustration system", "In-app cards", "Concepting"],
    intro: "Twenty-one illustrated in-app messages designed to bring lapsed and light listeners back, each one a small character with something to say.",
    sections: [
      { h: "The brief", p: "Spotify's growth team was testing messages aimed at monthly active users: nudges about milestones, discoveries, friends' playlists and listening habits. Each message needed its own visual that could run inside the app, in a consistent style, at a pace that let the team test many variants." },
      { h: "The idea", p: "Give every message a character. Boomboxes, trophies, hourglasses, globes and microphones grow arms and faces and act out the copy: a trophy for a milestone met, binoculars for discovery, a calendar flipping for a new personal record. Flat, saturated colour fields keep each card legible at thumbnail size." },
      { h: "What we made", p: "Messaging concepts, sketches for each copy line, final illustration for 21 messages and the full set of in-app card layouts, delivered as SVG and PNG with the source files." },
    ],
    hero: "hero.jpg",
    gallery: [
      { cards: mauCards },
      { text: "The full set of 21 illustrations" },
      ...mauIllustrations.map((s) => ({ src: `${s}.svg`, alt: s.replace(/-/g, " "), third: true, ratio: "1011/693" })),
    ],
  },
  {
    slug: "lifecycle-refresh",
    kind: "case",
    title: "Lifecycle In-App Creative Refresh",
    category: "Social cards",
    year: "2022",
    team: "Spotify Growth",
    services: ["Illustration style", "In-app creative", "Templates"],
    intro: "A refreshed illustration style for Spotify's Premium lifecycle messaging, applied across a full set of in-app cards.",
    sections: [
      { h: "The brief", p: "Spotify's lifecycle messages, the cards that greet, nudge and upsell listeners through the app, had drifted in style. The growth team wanted a single illustration language that felt current, worked at small sizes and could be extended by the team afterwards." },
      { h: "The idea", p: "Bold, geometric scenes built from a few saturated colours and gradients: a play button bursting like a sun, two listeners sharing headphones, a runner skipping through stripes. Each composition is designed to sit above its copy in a card and to work on any of the colourways." },
      { h: "What we made", p: "Content review, two rounds of illustration style samples, sketches for each copy concept, and three rounds of full design covering the complete card set for trial-eligible and non-trial audiences, delivered as mock-ups and as final illustrations." },
    ],
    hero: "hero.jpg",
    gallery: [
      { phones: lcCards },
      { text: "The illustrations" },
      ...lcIlls.map((s) => ({ src: `${s}.jpg`, alt: "Lifecycle illustration", third: true, ratio: "1.46" })),
    ],
  },

  // ---------------------------------------------------------------- Illustrations
  { slug: "welcome-to-new-york", kind: "illustration", title: "Welcome to New York", category: "Illustration", team: "Spotify REVERB", bg: "#6950E5", full: "full.jpg", details: 4 },
  { slug: "heart", kind: "illustration", title: "Heart", category: "Illustration", team: "Spotify REVERB", bg: "#7656FF", full: "full.jpg", details: 4 },
  { slug: "execution-guidance", kind: "illustration", title: "Execution Guidance", category: "Illustration", year: "2024", team: "Spotify REVERB", bg: "#FBEAEE", images: ["1.png", "2.png", "3.png"], details: 4 },
  { slug: "one-million-tickets", kind: "illustration", title: "1 Million Tickets", category: "Illustration", team: "Spotify Live Events", bg: "#000000", full: "full.jpg", details: 4 },
  { slug: "space-biker", kind: "illustration", title: "Space Biker on Pegasus", category: "Illustration", team: "Spotify Productivity Engineering", bg: "#161638", full: "full.jpg", details: 4 },
  { slug: "punk-rider", kind: "illustration", title: "Punk Rider", category: "Illustration", team: "Spotify Productivity Engineering", bg: "#161638", full: "full.jpg", details: 4 },
  { slug: "strategy-days", kind: "illustration", title: "Strategy Days", category: "Illustration", year: "2024", team: "Spotify REVERB", bg: "#F5E6E0", images: ["1.png", "2.png", "3.png"], details: 4 },

  // ---------------------------------------------------------------- Infographics
  { slug: "strategy-days-takeaways", kind: "illustration", title: "Strategy Days: Top Takeaways", category: "Infographic", year: "2025", team: "Spotify REVERB", bg: "#0E0A1A", images: ["01.jpg", "02.jpg", "03.jpg"], stack: true },
  { slug: "earnings-call-2021", kind: "illustration", title: "2021 Earnings Call Series", category: "Infographic", year: "2021", team: "Spotify REVERB", bg: "#111111", images: ["01.jpg", "02.jpg"], columns: 2 },
  { slug: "elvis", kind: "illustration", title: "Elvis Week", category: "Infographic", year: "2019", team: "Spotify REVERB", bg: "#1E1A1C", images: ["01.jpg"] },
  { slug: "serge", kind: "illustration", title: "Serge Gainsbourg by the Numbers", category: "Infographic", year: "2019", team: "Spotify REVERB", bg: "#F3E7DF", images: ["01.jpg", "02.jpg"], columns: 2 },
];
