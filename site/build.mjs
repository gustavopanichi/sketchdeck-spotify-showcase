// Static site generator. Run: node build.mjs   (from the site/ folder)
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { site, stats, teams, people, designers, orgFacts, projects, cardVideos, imageDims, intro, credits, creditsOngoing } from "./data.mjs";

const V = Date.now().toString(36); // cache-buster for regenerated thumbnails
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const logos = (base, link) => `
  <${link ? `a href="${base}index.html" aria-label="SketchDeck and Spotify, back to all work"` : 'div'} class="hero-logos">
    <img class="hero-logo hero-logo-sd" src="${base}assets/img/ui/halfpipe.png" alt="SketchDeck">
    <span class="hero-x" aria-hidden="true">×</span>
    <img class="hero-logo hero-logo-sp" src="${base}assets/img/ui/spotify.png" alt="Spotify">
  </${link ? 'a' : 'div'}>`;

const themeButton = `
  <button class="theme" id="themeBtn" aria-pressed="false" aria-label="Switch to dark mode">
    <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>
    <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/></svg>
  </button>`;

const menuButton = `
  <button class="dots" id="menuBtn" aria-expanded="false" aria-controls="sidebar" aria-label="Open relationship stats">
    <span class="menu-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
  </button>`;

const categories = [...new Set(projects.map((p) => p.category))];

// ---------------------------------------------------------------- drawer: tabbed, so nothing has to scroll
const initials = (name) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const avatar = (person, base) => person.photo
  ? `<img class="avatar" src="${base}assets/img/team/${person.photo}?v=${V}" alt="" width="34" height="34" decoding="async">`
  : `<span class="avatar" aria-hidden="true">${esc(initials(person.name))}</span>`;
const monthLabel = (ym) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(ym.slice(5, 7)) - 1];

// the REVERB credit pool: credits in each month, requests drawing them down, 60-day rollover
const poolVisual = () => {
  const months = [["Month 1", 0.35], ["Month 2", 0.6], ["Month 3", 0.45]];
  return `<figure class="pool" aria-label="Each month credits go into the pool, requests draw them down, and unused credits roll over for 60 days">
    <div class="pool-row">${months.map(([m, used], i) => `
      <div class="pool-month">
        <span class="pool-in">+${esc(intro.reverb.monthlyCredits)} credits</span>
        <div class="pool-tank"><i class="pool-left" style="height:${Math.round((1 - used) * 100)}%"></i><i class="pool-used" style="height:${Math.round(used * 100)}%"><span>requests</span></i></div>
        <span class="pool-label">${m}</span>
      </div>${i < months.length - 1 ? '<span class="pool-arrow" aria-hidden="true">→</span>' : ""}`).join("")}
    </div>
    <figcaption><span class="pool-key pool-key-left"></span>Unused credits roll over for 60 days <span class="pool-key pool-key-used"></span>Drawn down by requests</figcaption>
  </figure>`;
};

const creditChart = () => {
  const max = Math.max(...credits.map((c) => c[1]));
  return `<figure class="chart" aria-label="Spend per month in dollars, October 2025 to October 2026">
    <div class="chart-bars">${credits.map(([ym, v]) => {
      const ongoing = ym === creditsOngoing;
      return `<div class="bar${ongoing ? " bar-ongoing" : ""}"><span class="bar-v">${v >= 1000 ? `$${String(Math.round(v / 100) / 10)}k` : `$${v}`}</span><i style="height:${Math.max(1.5, (v / max) * 100).toFixed(1)}%"></i><span class="bar-m">${monthLabel(ym)}${ym.endsWith("-01") || ym === credits[0][0] ? `<em>${ym.slice(0, 4)}</em>` : ""}</span></div>`;
    }).join("")}</div>
    <figcaption>Spend per month (USD). October 2026 is still in progress.</figcaption>
  </figure>`;
};

const highlightCards = (base) => intro.year.highlights.map((slug) => projects.find((p) => p.slug === slug)).filter(Boolean).map((p) =>
  `<a class="hl" href="${base}work/${p.slug}.html" data-slug="${p.slug}"><img src="${base}assets/img/${p.slug}/card.jpg?v=${V}" alt="" loading="lazy"><span><b>${esc(p.title)}</b>${esc(p.category)}${p.year ? ` · ${esc(p.year)}` : ""}</span></a>`).join("");

const allStats = () => [...stats, ...orgFacts].map((st) => ({ ...st, value: st.value.replace("{pieces}", String(projects.length)) }));

const tabs = [
  ["who", "Who we are"],
  ["numbers", "By the numbers"],
  ["team", "Your team"],
  ["process", "How a project runs"],
  ["year", "The last 12 months"],
];

const sidebar = (base = "./") => `
  <div class="scrim" id="scrim" hidden></div>
  <aside class="drawer" id="sidebar" aria-label="SketchDeck and Spotify relationship" aria-hidden="true">
    <div class="drawer-inner">
      <div class="drawer-top">
        <p class="sidebar-eyebrow">SketchDeck × Spotify</p>
        <div class="tabs" role="tablist" aria-label="About the relationship">
          ${tabs.map(([id, label], i) => `<button class="tab" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${label}</button>`).join("")}
        </div>
      </div>
      <div class="panels">
        <section class="panel panel-who" role="tabpanel" id="panel-who" aria-labelledby="tab-who">
          <div class="panel-col">
            <h2 class="panel-title">${esc(intro.who.headline)}</h2>
            <p class="panel-body">${esc(intro.who.body)}</p>
          </div>
          <div class="panel-col">
            <h3 class="panel-sub">REVERB and how the membership works</h3>
            <p class="panel-lead">${esc(intro.reverb.headline)}</p>
            <p class="panel-body">${esc(intro.reverb.body)}</p>
            ${poolVisual()}
          </div>
        </section>
        <section class="panel panel-numbers" role="tabpanel" id="panel-numbers" aria-labelledby="tab-numbers" hidden>
          <h2 class="panel-title">A working relationship, by the numbers</h2>
          <dl class="stats">
            ${allStats().map((st) => `<div class="stat"><dt>${esc(st.value)}</dt><dd>${esc(st.label)}</dd></div>`).join("")}
          </dl>
        </section>
        <section class="panel panel-team" role="tabpanel" id="panel-team" aria-labelledby="tab-team" hidden>
          <h2 class="panel-title">${esc(intro.team.headline)}</h2>
          <div class="team-cols">
            <div>
              <h3 class="sidebar-h">The SketchDeck team</h3>
              <ul class="people">${people.map((pp) => `<li>${avatar(pp, base)}<span class="who"><strong>${esc(pp.name)}</strong><span>${esc(pp.role)}${pp.note ? `. ${esc(pp.note)}` : ""}</span></span></li>`).join("")}</ul>
              <p class="request"><span class="sidebar-h">How to send a request</span>${esc(intro.team.request)}</p>
            </div>
            <div>
              <h3 class="sidebar-h">Designers on Spotify work</h3>
              <ul class="designers">${designers.map((d) => `<li>${avatar(d, base)}<span class="who"><strong>${esc(d.name)}</strong><span>${esc(d.role)}</span></span></li>`).join("")}</ul>
            </div>
          </div>
        </section>
        <section class="panel panel-process" role="tabpanel" id="panel-process" aria-labelledby="tab-process" hidden>
          <h2 class="panel-title">${esc(intro.process.headline)}</h2>
          <ol class="steps">${intro.process.steps.map(([h, b], i) => `<li><span class="step-n">${i + 1}</span><strong>${esc(h)}</strong><p>${esc(b)}</p></li>`).join("")}</ol>
          <div class="turnaround">
            <h3 class="sidebar-h">Typical turnaround</h3>
            <ul>${intro.process.turnaround.map(([k, eg, t]) => `<li><strong>${esc(k)}</strong><span>${esc(eg)}</span><b>${esc(t)}</b></li>`).join("")}</ul>
          </div>
        </section>
        <section class="panel panel-year" role="tabpanel" id="panel-year" aria-labelledby="tab-year" hidden>
          <div class="year-head">
            <h2 class="panel-title">${esc(intro.year.headline)}</h2>
            <p class="panel-body">${esc(intro.year.body)}</p>
          </div>
          ${creditChart()}
          <div class="highlights"><h3 class="sidebar-h">Highlights</h3><div class="hl-row">${highlightCards(base)}</div></div>
        </section>
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
<script>try{if(localStorage.getItem("theme")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}</script>
<link rel="preload" href="${base}assets/fonts/SpotifyMix-Medium.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}assets/fonts/SpotifyMix-Extrabold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/style.css?v=${V}">
${extra}
</head>`;

const header = (base = "./") => `${themeButton}
${menuButton}
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
  const heroOf = (p) => (p.kind === "video" ? `assets/img/${p.slug}/${p.poster}` : p.full ? `assets/img/${p.slug}/${p.full}` : `assets/img/${p.slug}/hero.jpg`) + `?v=${V}`;
  const card = (p) => {
    const v = cardVideos[p.slug];
    const media = v
      ? `<video src="assets/video/${v.video}?v=${V}" poster="assets/img/${p.slug}/card.jpg?v=${V}" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>`
      : `<img src="assets/img/${p.slug}/card.jpg?v=${V}" alt="" loading="eager" decoding="async">`;
    return `<a class="card" href="work/${p.slug}.html" data-ar="1" data-kind="${p.category === "Infographic" ? "infographic" : (p.kind || "case")}" data-hero="${heroOf(p)}" aria-label="${esc(p.title)}, ${esc(p.category)}">${media}</a>`;
  };
  return `${head(site.title, base)}
<body class="home">
${header()}
<main class="hero">
  ${logos(base, false)}
  <div class="strip" id="strip" aria-label="Selected work">
    <h1 class="headline">${esc(site.headline)}</h1>
    <canvas class="liquid" id="liquid" aria-hidden="true"></canvas>
    <div class="ring" id="ring" aria-hidden="false">${projects.map(card).join("")}</div>
  </div>
</main>
<script>(function(){var c=new URLSearchParams(location.search).get("carousel");var s=document.createElement("script");s.src="assets/"+(c==="liquid"?"liquid":"cylinder")+".js?v=${V}";document.body.appendChild(s);})();</script>
<script src="assets/ui.js?v=${V}" defer></script>
</body>
</html>`;
}

// ---------------------------------------------------------------- Case study
function galleryItem(base, p, g) {
  const img = (f) => `${base}assets/img/${p.slug}/${f}?v=${V}`;
  const cls = ["g", g.half ? "g-half" : "", g.third ? "g-third" : "", g.twothirds ? "g-twothirds" : "", g.quarter ? "g-quarter" : "", g.tall ? "g-tall" : "", g.contain ? "g-contain" : "", g.portrait ? "g-portrait" : "", g.square ? "g-square" : ""].filter(Boolean).join(" ");
  const styles = [g.bg ? `--tile:${g.bg}` : "", g.ratio ? `--ratio:${g.ratio}` : ""].filter(Boolean).join(";");
  const style = styles ? ` style="${styles}"` : "";
  if (g.video) return `<figure class="${cls}"${style}><video src="${base}assets/video/${g.video}?v=${V}" poster="${img(g.poster)}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(g.alt)}"></video></figure>`;
  if (g.palette) return `<div class="g palette">${g.palette.map((c) => `<span style="background:${c}"><i>${c}</i></span>`).join("")}</div>`;
  if (g.text) return `<p class="g g-text">${esc(g.text)}</p>`;
  if (g.phones) return `<div class="g phones">${g.phones.map((c) => phoneCardImage(base, p.slug, c)).join("")}</div>`;
  if (g.cards) return `<div class="g phones">${g.cards.map((c) => phoneNativeCard(base, p.slug, c)).join("")}</div>`;
  return `<figure class="${cls}"${style}><img src="${img(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async"></figure>`;
}

function caseStudy(p) {
  const base = "../";
  const img = (f) => `${base}assets/img/${p.slug}/${f}?v=${V}`;
  const hero = `<figure class="frame"><img src="${img(p.hero)}" alt="${esc(p.title)}" decoding="async" fetchpriority="high"></figure>`;

  return `${head(`${p.title} — ${site.title}`, base)}
<body class="case">
${header(base)}
<main class="page">
  ${logos(base, true)}
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
  const img = (f) => `${base}assets/img/${p.slug}/${f}?v=${V}`;
  const isInfographic = p.category === "Infographic";
  let frame, rest = "";
  if (isInfographic) {
    const layout = p.stack ? "ill-stack" : p.columns === 2 ? "ill-two" : "ill-single";
    const dims = (f) => { const d = imageDims[`${p.slug}/${f}`]; return d ? ` width="${d[0]}" height="${d[1]}"` : ""; };
    const imgs = p.images.map((f, k) => `<img src="${img(f)}"${dims(f)} alt="${esc(p.title)}${p.images.length > 1 ? ` ${k + 1}` : ""}" decoding="async" ${k === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>`);
    frame = `<div class="frame frame-tint ${layout}">${imgs[0]}</div>`;
    if (imgs.length > 1) rest = `<section class="ill-rest ${layout}">${imgs.slice(1).map((i) => `<div class="ill-tile">${i}</div>`).join("")}</section>`;
  } else {
    // the full piece up top: the artwork itself when it is a finished frame, otherwise all pieces on the tint
    if (p.full) frame = `<figure class="frame"><img src="${img(p.full)}" alt="${esc(p.title)}" decoding="async" fetchpriority="high"></figure>`;
    else frame = `<div class="frame frame-tint ill-multi">${p.images.map((f, k) => `<img src="${img(f)}" alt="${esc(p.title)} ${k + 1}" decoding="async">`).join("")}</div>`;
    if (p.details) rest = `<section class="gallery details">${Array.from({ length: p.details }, (_, k) => `<figure class="g g-half g-square"><img src="${img(`detail-${k + 1}.jpg`)}" alt="${esc(p.title)}, detail ${k + 1}" loading="lazy" decoding="async"></figure>`).join("")}</section>`;
  }
  return `${head(`${p.title} — ${site.title}`, base, `<style>body{--tint:${p.bg}}</style>`)}
<body class="ill ${isInfographic ? "infographic" : ""}">
${header(base)}
<main class="page">
  ${logos(base, true)}
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
${header(base)}
<main class="page">
  ${logos(base, true)}
  <div class="frame frame-video"><video class="player" src="${base}assets/video/${p.video}?v=${V}" poster="${base}assets/img/${p.slug}/${p.poster}?v=${V}" controls playsinline preload="metadata"></video></div>
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
