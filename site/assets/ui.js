// Menu sidebar open/close, shared by every page. Also plays the arrival animation after an orbit click.
(() => {
  try {
    if (sessionStorage.getItem("fromOrbit")) { sessionStorage.removeItem("fromOrbit"); document.body.classList.add("anim-in"); }
  } catch (_) {}

  const btn = document.getElementById("menuBtn");
  const side = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  const close = document.getElementById("sidebarClose");
  if (!btn || !side) return;
  const set = (open) => {
    document.body.classList.toggle("menu-open", open);
    btn.setAttribute("aria-expanded", String(open));
    side.setAttribute("aria-hidden", String(!open));
    scrim.hidden = !open;
    if (open) requestAnimationFrame(() => close.focus()); else btn.focus();
  };
  btn.addEventListener("click", () => set(!document.body.classList.contains("menu-open")));
  close.addEventListener("click", () => set(false));
  scrim.addEventListener("click", () => set(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) set(false); });
})();

// Custom cursor: a 3 × 3 px dot. It is drawn white with difference blending, so it reads black over the white page
// and white over dark imagery (and stays visible over colour). Only for fine pointers; touch devices are untouched.
(() => {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  dot.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot);
  document.documentElement.classList.add("has-dot-cursor");
  let x = -100, y = -100, shown = false, big = false;
  const interactive = (el) => !!el && (!!el.closest("a, button, [role=button], label, input, select, textarea, video") || /grab|pointer/.test(el.style.cursor || ""));
  function paint() { dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`; dot.classList.toggle("big", big); }
  addEventListener("pointermove", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    if (!shown) { shown = true; dot.classList.add("show"); }
    big = interactive(document.elementFromPoint(x, y));
    paint();
  }, { passive: true });
  addEventListener("pointerdown", () => { dot.classList.add("down"); });
  addEventListener("pointerup", () => { dot.classList.remove("down"); });
  document.addEventListener("mouseleave", () => { shown = false; dot.classList.remove("show"); });
  document.addEventListener("mouseenter", () => { shown = true; dot.classList.add("show"); });
  addEventListener("blur", () => { shown = false; dot.classList.remove("show"); });
})();
