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
