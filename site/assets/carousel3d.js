// Home carousel: a ring of cards with the viewer standing at its centre. The ring turns slowly; cards ahead
// face you from across the ring, cards passing at your sides come close, turn edge-on and dissolve into the
// blurred vignette. Geometry is CSS 3D (compositor-friendly); per-card blur and fade are stepped, so they only
// touch the DOM when a card crosses a threshold.
(() => {
  const strip = document.getElementById("strip");
  const ring = document.getElementById("ring");
  if (!strip || !ring) return;
  const cards = [...ring.querySelectorAll(".card")];
  const N = cards.length;
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Tunables
  const PERIOD = 90;        // seconds for one full turn of the ring
  const VISIBLE = 62;       // degrees from straight-ahead at which a card is fully gone
  const FADE_FROM = 30;     // degrees where fading/blurring starts
  const BLUR_STEPS = [0, 1.5, 3, 6, 10, 16]; // px, applied by angle band

  let P = 0, R = 0, size = 0;
  const step = 360 / N;
  let angle = 0;

  function measure() {
    const r = strip.getBoundingClientRect();
    const W = r.width, H = r.height;
    P = Math.max(360, W * 0.5);                           // camera distance = perspective; a card at angle a lands at x = P·tan(a)
    size = Math.min(P * 0.29, H * 0.6);                   // card edge (square); neighbours sit P·tan(step) apart, so this never overlaps
    R = P * 1.18;                                         // ring radius: the far card sits a little beyond the screen plane
    strip.style.setProperty("--p", P + "px");
    strip.style.setProperty("--r", R + "px");
    cards.forEach((c, i) => {
      c.style.width = c.style.height = size + "px";
      c.style.marginLeft = c.style.marginTop = (-size / 2) + "px";
      c.style.transform = `rotateY(${(i * step).toFixed(3)}deg) translateZ(${-R}px)`;
    });
  }

  function norm(a) { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; }

  function paint() {
    ring.style.transform = `translateZ(${P}px) rotateY(${angle.toFixed(3)}deg)`;
    for (let i = 0; i < N; i++) {
      const c = cards[i];
      const phi = Math.abs(norm(i * step + angle));         // 0 = straight ahead across the ring
      let state;
      if (phi >= VISIBLE) state = -1;                       // hidden (behind or beside the viewer)
      else if (phi <= FADE_FROM) state = 0;                 // crisp
      else state = 1 + Math.min(BLUR_STEPS.length - 2, Math.floor((phi - FADE_FROM) / (VISIBLE - FADE_FROM) * (BLUR_STEPS.length - 1)));
      if (state === c._state) continue;
      c._state = state;
      if (state === -1) { c.style.visibility = "hidden"; c.style.opacity = "0"; continue; }
      c.style.visibility = "visible";
      const t = state === 0 ? 0 : state / (BLUR_STEPS.length - 1);
      c.style.opacity = String(1 - t * 0.85);
      c.style.filter = state === 0 ? "none" : `blur(${BLUR_STEPS[state]}px)`;
      c.style.pointerEvents = state >= BLUR_STEPS.length - 2 ? "none" : "auto";
    }
  }

  let last = performance.now();
  let frozen = false, hover = false;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!frozen && !prefersReduced) angle += (360 / PERIOD) * dt * (hover ? 0.35 : 1);
    paint();
    requestAnimationFrame(tick);
  }
  strip.addEventListener("pointerenter", () => { hover = true; });
  strip.addEventListener("pointerleave", () => { hover = false; });

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
    Object.assign(m.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "16px" });
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
      { left: t.left + "px", top: t.top + "px", width: t.width + "px", height: t.height + "px", borderRadius: "6px" },
    ], { duration: prefersReduced ? 0 : 700, easing: "cubic-bezier(.65, 0, .25, 1)", fill: "forwards" });
    anim.onfinish = () => {
      try { sessionStorage.setItem("fromOrbit", "1"); } catch (_) {}
      location.href = card.href;
    };
  }
  ring.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    expand(card);
  });
  addEventListener("pageshow", (e) => { if (e.persisted) { frozen = false; document.body.classList.remove("expanding"); document.querySelectorAll(".morph").forEach((n) => n.remove()); } });

  addEventListener("resize", measure);
  measure(); paint();
  requestAnimationFrame(tick);
  strip.classList.add("ready");
})();
