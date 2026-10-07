// Home strip, after melius.com: cards are born at the vanishing point in the centre, travel outward to both
// edges and grow as they come, then wrap around to the centre again. Projection is computed in 2D (a receding
// plane on each side), so cards never overlap and nothing spills outside the strip.
(() => {
  const strip = document.getElementById("strip");
  if (!strip) return;
  const sides = [...strip.querySelectorAll(".side")].map((el) => ({
    el, sign: +el.dataset.side,
    cards: [...el.querySelectorAll(".card")].map((c) => ({ el: c, ar: parseFloat(c.dataset.ar) || 1.5, u: 0, w: 0 })),
  }));
  const band = strip.querySelector(".strip-band");
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Tunables
  const TRAVEL = 7;        // seconds for a card to go from the centre to the edge
  const GAP = 0.06;        // gap between cards, as a fraction of the near card height
  const NEAR_W = 0.30;     // width of a 3:2 card at the near edge, as a fraction of the strip width
  const P = 2.2;           // growth curve: 1 = linear, higher = cards stay small longer near the centre
  let W = 0, H = 0, C = 0, half = 0, U = 0, XMAX = 0, nearH = 0;

  // World distance u runs from 0 (centre) to U (past the edge). Screen offset g(u) and local scale g'(u)
  // come from one monotonic curve, so neighbouring cards can never overlap.
  const g = (u) => XMAX * Math.pow(u / U, P);
  const scaleAt = (u) => Math.pow(u / U, P - 1);
  const screenX = g;

  function measure() {
    const r = strip.getBoundingClientRect();
    W = r.width; H = r.height; C = W / 2; half = W / 2;
    XMAX = half * 1.3;          // cards are fully off-screen when u = U
    U = XMAX * P;               // so that the scale reaches exactly 1 at the edge
    nearH = Math.min(H * 0.92, (W * NEAR_W) / 1.5);
    for (const s of sides) for (const c of s.cards) c.w = nearH * c.ar;
    if (band) { band.style.height = Math.max(10, nearH * 0.22) + "px"; band.style.width = Math.max(40, W * 0.2) + "px"; }
  }

  // Lay cards out consecutively along u starting from the far end, then stagger the two sides.
  function seed() {
    for (const s of sides) {
      let u = s.sign === -1 ? 0 : -0.5 * (s.cards[0].w + GAP * nearH);
      for (const c of s.cards) { c.u = u; u += c.w + GAP * nearH; }
      s.len = u; // total world length of one lap
    }
  }

  // Cards are sized once (nearH square) and only transformed per frame, which keeps the animation on the compositor.
  function size() { for (const s of sides) for (const c of s.cards) { c.el.style.width = c.el.style.height = nearH.toFixed(2) + "px"; } }
  function place(c, sign) {
    const u0 = c.u, u1 = c.u + c.w;
    const el = c.el;
    if (u1 <= 0) { if (!c.hidden) { el.style.visibility = "hidden"; c.hidden = true; } return; }
    const x0 = screenX(Math.max(0, u0)), x1 = screenX(Math.min(U, Math.max(0, u1)));
    const w = x1 - x0;
    const sc = w / nearH;                 // exact on-screen width → uniform scale, so neighbours never overlap
    const h = nearH * sc;
    const left = sign === -1 ? C - x1 : C + x0;
    const top = (H - h) / 2;
    if (c.hidden) { el.style.visibility = "visible"; c.hidden = false; }
    el.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
    const zi = 10 + Math.round(sc * 100);
    if (zi !== c.zi) { el.style.zIndex = String(zi); c.zi = zi; }
  }

  let last = performance.now();
  let frozen = false;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const s of sides) {
      if (!frozen && !prefersReduced) {
        for (const c of s.cards) {
          c.u += (U / TRAVEL) * dt;
          if (c.u > U) c.u -= s.len; // wrap to the far end, behind the last card
        }
      }
      for (const c of s.cards) place(c, s.sign);
    }
    requestAnimationFrame(tick);
  }

  // ---- expand into the page frame on click
  function frameRect() {
    const cs = getComputedStyle(document.documentElement);
    const gutter = parseFloat(cs.getPropertyValue("--gutter")) || 24;
    const top = parseFloat(cs.getPropertyValue("--topbar-h")) || 84;
    const w = innerWidth - gutter * 2;
    const h = Math.min(w * 9 / 16, innerHeight * 0.82);
    return { left: gutter, top, width: w, height: h };
  }
  function expand(card) {
    if (frozen) return;
    frozen = true;
    const media = card.querySelector("img, video");
    const r = card.getBoundingClientRect();
    const m = document.createElement("div");
    m.className = "morph";
    const start = media.tagName === "VIDEO" ? Object.assign(new Image(), { src: media.poster }) : media.cloneNode();
    m.appendChild(start);
    Object.assign(m.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: getComputedStyle(card).borderRadius });
    document.body.appendChild(m);
    document.body.classList.add("expanding");
    if (card.dataset.hero) {
      const hero = new Image();
      hero.className = "morph-hero";
      if (card.dataset.tint) { hero.style.objectFit = "contain"; m.style.background = card.dataset.tint; hero.style.padding = "clamp(16px, 4vw, 56px)"; hero.style.boxSizing = "border-box"; }
      hero.onload = () => { m.appendChild(hero); requestAnimationFrame(() => hero.classList.add("show")); };
      hero.src = card.dataset.hero;
    }
    const t = frameRect();
    const anim = m.animate([
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" },
      { left: t.left + "px", top: t.top + "px", width: t.width + "px", height: t.height + "px", borderRadius: "14px" },
    ], { duration: prefersReduced ? 0 : 700, easing: "cubic-bezier(.65, 0, .25, 1)", fill: "forwards" });
    anim.onfinish = () => {
      try { sessionStorage.setItem("fromOrbit", "1"); } catch (_) {}
      location.href = card.href;
    };
  }
  strip.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    expand(card);
  });
  addEventListener("pageshow", (e) => { if (e.persisted) { frozen = false; document.body.classList.remove("expanding"); document.querySelectorAll(".morph").forEach((n) => n.remove()); } });

  addEventListener("resize", () => { measure(); size(); seed(); });
  measure(); size(); seed();
  requestAnimationFrame(tick);
  strip.classList.add("ready");
})();
