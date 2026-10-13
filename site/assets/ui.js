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

  // tabs: one panel at a time; arrow keys move between tabs
  const tabs = [...side.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t, false));
    t.addEventListener("keydown", (e) => {
      let j = null;
      if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); select(tabs[j], true); }
    });
  });

  // highlights: on the home page they open in place like a carousel card; elsewhere they are plain links
  side.querySelectorAll(".hl[data-slug]").forEach((a) => a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const card = document.querySelector(`.ring a.card[href="work/${a.dataset.slug}.html"]`);
    if (!card) return;
    e.preventDefault();
    set(false);
    setTimeout(() => card.click(), 380); // let the drawer slide away first
  }));
})();

// Light / dark switch. The choice is kept in localStorage and applied before first paint by a line in <head>.
(() => {
  const btn = document.getElementById("themeBtn");
  if (!btn) return;
  const root = document.documentElement, meta = document.querySelector('meta[name="theme-color"]');
  const apply = (dark, save) => {
    if (dark) root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
    btn.setAttribute("aria-pressed", String(dark));
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    if (meta) meta.content = dark ? "#000000" : "#FFFFFF";
    if (save) { try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (_) {} }
    document.dispatchEvent(new CustomEvent("themechange", { detail: { dark } }));
  };
  apply(root.getAttribute("data-theme") === "dark", false);
  btn.addEventListener("click", () => apply(root.getAttribute("data-theme") !== "dark", true));
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
