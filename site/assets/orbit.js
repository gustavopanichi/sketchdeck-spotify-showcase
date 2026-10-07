// Orbiting thumbnails. Three elliptical rings rotate slowly on their own.
// Scrolling (wheel / touch drag / keyboard) adds a temporary burst of speed that decays back to idle.
// Clicking a thumbnail expands the circle into the full-width frame, then opens the work page.
(() => {
  const stage = document.getElementById("stage");
  const wrap = document.getElementById("orbits");
  if (!wrap) return;
  const orbs = [...wrap.querySelectorAll(".orb")];

  const RINGS = [
    { k: 0.40, speed: 0.040, size: 92 },
    { k: 0.66, speed: -0.028, size: 108 },
    { k: 0.92, speed: 0.020, size: 124 },
  ];

  let W = 0, H = 0, scale = 1;
  const angles = RINGS.map(() => 0);
  let boost = 0;
  const MAX_BOOST = 14;
  const DECAY = 1.6;
  let frozen = false;

  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    scale = Math.max(0.5, Math.min(1, W / 1320, H / 760));
    orbs.forEach((o) => {
      const r = RINGS[+o.dataset.ring];
      const s = Math.round(r.size * scale);
      o.style.width = o.style.height = s + "px";
    });
  }

  function layout() {
    const cx = W / 2, cy = H / 2;
    for (const o of orbs) {
      const ri = +o.dataset.ring, r = RINGS[ri];
      const s = r.size * scale;
      const n = +o.dataset.n, i = +o.dataset.i;
      const rx = Math.max(60, (W / 2 - s / 2 - 16) * r.k);
      const ry = Math.max(60, (H / 2 - s / 2 - 16) * r.k);
      const a = angles[ri] + (i / n) * Math.PI * 2 + ri * 0.7;
      const x = cx + Math.cos(a) * rx - s / 2;
      const y = cy + Math.sin(a) * ry - s / 2;
      const depth = 0.92 + 0.08 * ((Math.sin(a) + 1) / 2);
      o.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${depth.toFixed(3)})`;
      o.style.zIndex = String(10 + Math.round(depth * 100));
    }
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!frozen) {
      const mult = 1 + boost;
      if (!prefersReduced || boost > 0.01) RINGS.forEach((r, i) => { angles[i] += r.speed * mult * dt; });
      boost *= Math.exp(-DECAY * dt);
      if (boost < 0.001) boost = 0;
      layout();
    }
    requestAnimationFrame(tick);
  }

  function kick(amount) { boost = Math.min(MAX_BOOST, boost + amount); }
  addEventListener("wheel", (e) => { e.preventDefault(); kick(Math.min(3, Math.abs(e.deltaY) * 0.012)); }, { passive: false });
  let ty = null;
  addEventListener("touchstart", (e) => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (ty == null) return;
    const dy = e.touches[0].clientY - ty; ty = e.touches[0].clientY;
    kick(Math.min(3, Math.abs(dy) * 0.03));
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  addEventListener("keydown", (e) => { if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " "].includes(e.key)) { e.preventDefault(); kick(2.5); } });

  // ---- expand: circle grows into the work page's frame, then we navigate
  function frameRect() {
    const cs = getComputedStyle(document.documentElement);
    const gutter = parseFloat(cs.getPropertyValue("--gutter")) || 24;
    const top = parseFloat(cs.getPropertyValue("--topbar-h")) || 84;
    const w = innerWidth - gutter * 2;
    const h = Math.min(w * 9 / 16, innerHeight * 0.82);
    return { left: gutter, top, width: w, height: h };
  }
  function expand(orb, href) {
    if (frozen) return;
    frozen = true;
    const img = orb.querySelector("img");
    const r = img.getBoundingClientRect();
    const m = document.createElement("div");
    m.className = "morph";
    const clone = img.cloneNode();
    clone.style.transform = "none";
    m.appendChild(clone);
    // cross-fade to the page's hero image while the circle grows, so the landing feels continuous
    if (orb.dataset.hero) {
      const hero = new Image();
      hero.className = "morph-hero";
      hero.decoding = "async";
      if (orb.dataset.tint) { hero.style.objectFit = "contain"; m.style.background = orb.dataset.tint; hero.style.padding = "clamp(16px, 4vw, 56px)"; hero.style.boxSizing = "border-box"; }
      hero.onload = () => { m.appendChild(hero); requestAnimationFrame(() => hero.classList.add("show")); };
      hero.src = orb.dataset.hero;
    }
    Object.assign(m.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    document.body.appendChild(m);
    document.body.classList.add("expanding");
    const t = frameRect();
    const anim = m.animate([
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "50%" },
      { left: t.left + "px", top: t.top + "px", width: t.width + "px", height: t.height + "px", borderRadius: "14px" },
    ], { duration: prefersReduced ? 0 : 700, easing: "cubic-bezier(.65, 0, .25, 1)", fill: "forwards" });
    anim.onfinish = () => {
      try { sessionStorage.setItem("fromOrbit", "1"); } catch (_) {}
      location.href = href;
    };
  }
  orbs.forEach((o) => o.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    expand(o, o.href);
  }));
  // restore if the user comes back via bfcache
  addEventListener("pageshow", (e) => { if (e.persisted) { frozen = false; document.body.classList.remove("expanding"); document.querySelectorAll(".morph").forEach((n) => n.remove()); } });

  addEventListener("resize", () => { resize(); layout(); });
  resize(); layout();
  requestAnimationFrame(tick);
  wrap.classList.add("ready");
})();
