// Static site generator. Run: node build.mjs   (from the site/ folder)
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { site, stats, teams, people, designers, orgFacts, projects, cardVideos } from "./data.mjs";

const V = Date.now().toString(36); // cache-buster for regenerated thumbnails
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const logos = (base) => `
  <a class="logos" href="${base}index.html" aria-label="SketchDeck and Spotify, back to all work">
    <img class="logo logo-sd" src="${base}assets/img/ui/halfpipe.png" alt="SketchDeck" width="40" height="29">
    <span class="logo-x" aria-hidden="true"></span>
    <img class="logo logo-sp" src="${base}assets/img/ui/spotify.png" alt="Spotify" width="32" height="32">
  </a>`;

const menuButton = `
  <button class="notch" id="menuBtn" aria-expanded="false" aria-controls="sidebar" aria-label="Open relationship stats">
    <span class="menu-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
  </button>`;

const categories = [...new Set(projects.map((p) => p.category))];

const sidebar = (base) => `
  <div class="scrim" id="scrim" hidden></div>
  <aside class="drawer" id="sidebar" aria-label="SketchDeck and Spotify relationship" aria-hidden="true">
    <div class="drawer-inner">
      <div class="drawer-top">
        <p class="sidebar-eyebrow">SketchDeck × Spotify</p>
        <h2 class="sidebar-title">A working relationship, by the numbers</h2>
      </div>
      <dl class="stats">
        ${[...stats, ...orgFacts].map((s) => `<div class="stat"><dt>${esc(s.value)}</dt><dd>${esc(s.label)}</dd></div>`).join("")}
      </dl>
      <div class="drawer-cols drawer-people">
        <div>
          <h3 class="sidebar-h">The SketchDeck team</h3>
          <ul class="people">${people.map((p) => `<li><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></li>`).join("")}</ul>
        </div>
        <div>
          <h3 class="sidebar-h">Designers on this work</h3>
          <ul class="designers">${designers.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
        </div>
      </div>
    </div>
    <button class="drawer-close" id="sidebarClose" aria-label="Close"><span class="menu-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></button>
  </aside>`;

const head = (title, base, extra = "") => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(site.description)}">
<meta name="theme-color" content="#FFFFFF">
<link rel="preload" href="${base}assets/fonts/SpotifyMix-Medium.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}assets/fonts/SpotifyMix-Extrabold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/style.css?v=${V}">
${extra}
</head>`;

const header = (base, extraLeft = "") => `
<header class="topbar">
  <div class="topbar-left">${logos(base)}${extraLeft}</div>
  ${menuButton}
</header>
${sidebar(base)}`;

// ---------------------------------------------------------------- shared blocks
const phone = (inner, bg = "#121212", extra = "") => `
  <div class="phone ${extra}" style="--screen:${bg}">
    <div class="phone-screen">
      <div class="phone-status"><span>9:41</span><span class="phone-status-icons"><i></i><i></i><i></i></span></div>
      ${inner}
    </div>
  </div>`;

const phoneCardImage = (base, slug, c) => phone(`<img class="phone-card-img" src="${base}assets/img/${slug}/${c[0]}.jpg" alt="In-app card" loading="lazy" decoding="async">`, c[1]);

const phoneNativeCard = (base, slug, c) => phone(`
  <div class="app-card">
    <img class="app-card-ill" src="${base}assets/img/${slug}/${c[0]}.svg" alt="" loading="lazy" decoding="async">
    <div class="app-card-body">
      <h3>${esc(c[1])}</h3>
      <p>${esc(c[2])}</p>
      <span class="app-btn">Check it out</span>
      <span class="app-link">Not now</span>
    </div>
  </div>
  <div class="app-chrome"><i></i><i></i><i></i><i></i></div>`, "#121212", "phone-dark");

const prevNextCleanup = ""; // footers removed by request

// ---------------------------------------------------------------- Home
function home() {
  const base = "./";
  // The page hero is always the card's own image in a wider (16:9) crop, generated alongside card.jpg.
  const heroOf = (p) => p.kind === "video" ? `assets/img/${p.slug}/${p.poster}` : p.full ? `assets/img/${p.slug}/${p.full}` : `assets/img/${p.slug}/hero.jpg`;
  const card = (p) => {
    const v = cardVideos[p.slug];
    const media = v
      ? `<video src="assets/video/${v.video}" poster="assets/img/${p.slug}/card.jpg?v=${V}" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>`
      : `<img src="assets/img/${p.slug}/card.jpg?v=${V}" alt="" loading="eager" decoding="async">`;
    return `<a class="card" href="work/${p.slug}.html" data-ar="1" data-hero="${heroOf(p)}" data-tint="${p.bg || ""}" aria-label="${esc(p.title)}, ${esc(p.category)}">${media}</a>`;
  };
  return `${head(site.title, base)}
<body class="home">
<header class="topbar topbar-home">${menuButton}</header>
${sidebar(base)}
<main class="hero">
  <div class="hero-logos" aria-label="SketchDeck and Spotify">
    <img class="hero-logo hero-logo-sd" src="assets/img/ui/halfpipe.png" alt="SketchDeck">
    <span class="hero-x" aria-hidden="true">×</span>
    <img class="hero-logo hero-logo-sp" src="assets/img/ui/spotify.png" alt="Spotify">
  </div>
  <div class="strip" id="strip" aria-label="Selected work">
    <canvas class="liquid" id="liquid" aria-hidden="true"></canvas>
    <div class="ring" id="ring" aria-hidden="false">${projects.map(card).join("")}</div>
  </div>
  <h1 class="headline">${esc(site.headline).replace(/^(Eight years)/, "<em>$1</em>")}</h1>
  <p class="sub">${esc(site.description)}</p>
</main>
<script src="assets/liquid.js?v=${V}" defer></script>
<script src="assets/ui.js?v=${V}" defer></script>
</body>
</html>`;
}

// ---------------------------------------------------------------- Case study
function galleryItem(base, p, g) {
  const img = (f) => `${base}assets/img/${p.slug}/${f}`;
  const cls = ["g", g.half ? "g-half" : "", g.third ? "g-third" : "", g.twothirds ? "g-twothirds" : "", g.quarter ? "g-quarter" : "", g.tall ? "g-tall" : "", g.contain ? "g-contain" : "", g.portrait ? "g-portrait" : "", g.square ? "g-square" : ""].filter(Boolean).join(" ");
  const styles = [g.bg ? `--tile:${g.bg}` : "", g.ratio ? `--ratio:${g.ratio}` : ""].filter(Boolean).join(";");
  const style = styles ? ` style="${styles}"` : "";
  if (g.video) return `<figure class="${cls}"${style}><video src="${base}assets/video/${g.video}" poster="${img(g.poster)}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(g.alt)}"></video></figure>`;
  if (g.palette) return `<div class="g palette">${g.palette.map((c) => `<span style="background:${c}"><i>${c}</i></span>`).join("")}</div>`;
  if (g.text) return `<p class="g g-text">${esc(g.text)}</p>`;
  if (g.phones) return `<div class="g phones">${g.phones.map((c) => phoneCardImage(base, p.slug, c)).join("")}</div>`;
  if (g.cards) return `<div class="g phones">${g.cards.map((c) => phoneNativeCard(base, p.slug, c)).join("")}</div>`;
  return `<figure class="${cls}"${style}><img src="${img(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async"></figure>`;
}

function caseStudy(p) {
  const base = "../";
  const img = (f) => `${base}assets/img/${p.slug}/${f}`;
  const hero = `<figure class="frame"><img src="${img(p.hero)}" alt="${esc(p.title)}" decoding="async" fetchpriority="high"></figure>`;

  return `${head(`${p.title} — ${site.title}`, base)}
<body class="case">
${header(base, `<a class="back" href="${base}index.html">All work</a>`)}
<main>
  ${hero}
  <section class="case-head">
    <p class="eyebrow">${esc(p.category)}${p.year ? ` · ${esc(p.year)}` : ""}</p>
    <h1>${esc(p.title)}</h1>
    <p class="intro">${esc(p.intro)}</p>
    <dl class="meta">
      ${p.year ? `<div><dt>Year</dt><dd>${esc(p.year)}</dd></div>` : ""}
      ${p.services ? `<div><dt>Services</dt><dd>${p.services.map(esc).join(", ")}</dd></div>` : ""}
    </dl>
  </section>
  <section class="story">
    ${(p.sections || []).map((s) => `<div class="story-row"><h2>${esc(s.h)}</h2><p>${esc(s.p)}</p></div>`).join("")}
  </section>
  <section class="gallery">${(p.gallery || []).map((g) => galleryItem(base, p, g)).join("\n")}</section>
  <p class="all-work"><a href="${base}index.html">All work</a></p>
</main>
<script src="${base}assets/ui.js?v=${V}" defer></script>
</body>
</html>`;
}

// ---------------------------------------------------------------- Illustration / infographic
function illustration(p) {
  const base = "../";
  const img = (f) => `${base}assets/img/${p.slug}/${f}`;
  const isInfographic = p.category === "Infographic";
  let frame, rest = "";
  if (isInfographic) {
    const layout = p.stack ? "ill-stack" : p.columns === 2 ? "ill-two" : "ill-single";
    const imgs = p.images.map((f, k) => `<img src="${img(f)}" alt="${esc(p.title)}${p.images.length > 1 ? ` ${k + 1}` : ""}" decoding="async" ${k === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>`);
    frame = `<div class="frame frame-tint ${layout}">${imgs[0]}</div>`;
    if (imgs.length > 1) rest = `<section class="ill-rest ${layout}">${imgs.slice(1).map((i) => `<div class="ill-tile">${i}</div>`).join("")}</section>`;
  } else {
    // the full piece up top: the artwork itself when it is a finished frame, otherwise all pieces on the tint
    if (p.full) frame = `<figure class="frame frame-full"><img src="${img(p.full)}" alt="${esc(p.title)}" decoding="async" fetchpriority="high"></figure>`;
    else frame = `<div class="frame frame-tint ill-multi">${p.images.map((f, k) => `<img src="${img(f)}" alt="${esc(p.title)} ${k + 1}" decoding="async">`).join("")}</div>`;
    if (p.details) rest = `<section class="gallery details">${Array.from({ length: p.details }, (_, k) => `<figure class="g g-half g-square"><img src="${img(`detail-${k + 1}.jpg`)}" alt="${esc(p.title)}, detail ${k + 1}" loading="lazy" decoding="async"></figure>`).join("")}</section>`;
  }
  return `${head(`${p.title} — ${site.title}`, base, `<style>body{--tint:${p.bg}}</style>`)}
<body class="ill ${isInfographic ? "infographic" : ""}">
${header(base, `<a class="back" href="${base}index.html">All work</a>`)}
<main>
  ${frame}
  <section class="case-head">
    <p class="eyebrow">${esc(p.category)}${p.year ? ` · ${esc(p.year)}` : ""}</p>
    <h1>${esc(p.title)}</h1>
  </section>
  ${rest}
  <p class="all-work"><a href="${base}index.html">All work</a></p>
</main>
<script src="${base}assets/ui.js?v=${V}" defer></script>
</body>
</html>`;
}

// ---------------------------------------------------------------- Video
function video(p) {
  const base = "../";
  return `${head(`${p.title} — ${site.title}`, base)}
<body class="vid">
${header(base, `<a class="back" href="${base}index.html">All work</a>`)}
<main>
  <div class="frame frame-video"><video class="player" src="${base}assets/video/${p.video}" poster="${base}assets/img/${p.slug}/${p.poster}" controls playsinline preload="metadata"></video></div>
  <section class="case-head">
    <p class="eyebrow">${esc(p.category)}${p.year ? ` · ${esc(p.year)}` : ""}</p>
    <h1>${esc(p.title)}</h1>
    <p class="intro">${esc(p.intro)}</p>
  </section>
  <p class="all-work"><a href="${base}index.html">All work</a></p>
</main>
<script src="${base}assets/ui.js?v=${V}" defer></script>
</body>
</html>`;
}

// ---------------------------------------------------------------- Write
if (existsSync("work")) rmSync("work", { recursive: true });
mkdirSync("work", { recursive: true });
writeFileSync("index.html", home());
projects.forEach((p) => {
  const html = p.kind === "case" ? caseStudy(p) : p.kind === "video" ? video(p) : illustration(p);
  writeFileSync(`work/${p.slug}.html`, html);
});
console.log(`Built index.html and ${projects.length} work pages.`);
