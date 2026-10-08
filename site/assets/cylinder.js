// Cylinder carousel — the viewer stands at the centre of a drum of panels. The drum turns around them: the panel
// ahead is flat, its neighbours turn away with real perspective, and towards the screen edges the picture is seen
// through thick glass: stretched, split into its colours and blurred. Plain WebGL, two passes a frame:
//   1. the visible panels are projected as perspective quads (rounded corners, premultiplied) into a framebuffer;
//   2. that buffer is drawn to the screen through the edge-glass shader: 16 spectral samples, each refracted a little
//      differently (horizontal and vertical magnification about the glass zone), mip blur, a slow liquid ripple.
// Scrolling, snapping, idle drift, hover, click-to-open (in place) and the warm-up match liquid.js.
// Tuning without editing: ?aspect=1.78&panel=0.28&fov=108&edge=0.72&stretch=1.2&stretchy=1.0&disp=0.28&blur=1.7&wave=0.007&frost=0.07
// (?carousel=liquid loads the previous carousel instead).
(() => {
  const strip = document.getElementById("strip");
  const canvas = document.getElementById("liquid");
  const ring = document.getElementById("ring");
  if (!strip || !canvas || !ring) return;
  const anchors = [...ring.querySelectorAll(".card")];
  const N = anchors.length;
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const query = new URLSearchParams(location.search);
  const num = (k, d) => { const v = parseFloat(query.get(k)); return Number.isFinite(v) ? v : d; };

  // ---- config ----
  const CONFIG = { GAP: 0.09, EASE: 0.09, WHEEL: 1.4, DRAG: 1.6, FRICTION: 0.865, SNAP: true, SNAP_IDLE_MS: 120, SNAP_EASE: 0.05, SELECT_EASE: 0.16 };
  const INTERACT = { CLICK_SLOP: 6, FLICK_IDLE_MS: 90, TOUCH_DRAG: 1.0, TOUCH_EASE: 0.22, TOUCH_CLICK_SLOP: 12 };
  const AUTO = { speed: 52, resumeAfterMs: 2500 }; // px/s idle turn; resumes this long after the last wheel/drag
  const CYL = {
    aspect: num("aspect", 16 / 9),  // panel width / height: the cards stay 16:9 (0.75 gives the reference's portrait cards)
    panelH: num("panel", 0.28),    // centre panel height as a fraction of the strip height
    fov: num("fov", 108),          // horizontal field of view in degrees: how much of the drum is on screen
    edge: num("edge", 0.72),      // where the glass zone starts (0 = centre, 1 = screen edge)
    stretchX: num("stretch", 1.2), // horizontal magnification reached at the very edge
    stretchY: num("stretchy", 1.0),// vertical magnification reached at the very edge
    dispersion: num("disp", 0.28),  // how far the colours separate inside the glass
    blur: num("blur", 1.7),        // mip blur at the edge (WebGL2 only)
    wave: num("wave", 0.007), waveFreq: 7.0, waveSpeed: 0.9, // slow ripple of the glass
    frost: num("frost", 0.07),     // lift towards white inside the glass
    radius: 0.06,                  // corner radius as a fraction of the panel's short side
  };
  const ENTRY = { enabled: !prefersReduced, delay: 0.35, dur: 1.6, spin: 2.6 };
  // the page behind the glass: the fringes are filled with it, so it follows the light / dark switch
  const THEMES = { light: { top: [1, 1, 1], bottom: [0.753, 0.847, 1.0], start: 0.66 }, dark: { top: [0.086, 0.086, 0.22], bottom: [0, 0, 0], start: 0 } };
  let pageTheme = THEMES.light;
  const readTheme = () => { pageTheme = document.documentElement.getAttribute("data-theme") === "dark" ? THEMES.dark : THEMES.light; };
  readTheme(); document.addEventListener("themechange", readTheme);
  const TEX_ASPECT = 16 / 9; // every card.jpg is 16:9; narrower panels take a centred crop of it

  const GL_OPTS = { antialias: false, alpha: true, premultipliedAlpha: true };
  const gl = (query.has("gl1") ? null : canvas.getContext("webgl2", GL_OPTS)) || canvas.getContext("webgl", GL_OPTS); // ?gl1 forces the WebGL1 path for testing
  const fallback = () => { strip.classList.add("no-webgl", "ready"); }; // the plain list of cards, shown
  let contextLost = false;
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); contextLost = true; fallback(); });
  canvas.addEventListener("webglcontextrestored", () => { if (!document.querySelector(".overlay")) location.reload(); });
  if (!gl) { fallback(); return; }
  const isGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
  const hasDeriv = isGL2 || !!gl.getExtension("OES_standard_derivatives");

  // ---- shaders (one source, two dialects) ----
  const VS_HEAD = isGL2 ? "#version 300 es\n#define attribute in\n#define varying out\n" : "";
  const FS_HEAD = isGL2
    ? "#version 300 es\nprecision highp float;\n#define varying in\n#define TEX texture\n#define TEXLOD textureLod\nout vec4 OUT;\n"
    : (hasDeriv ? "#extension GL_OES_standard_derivatives : enable\n" : "#define NO_DERIV\n") + "precision highp float;\n#define TEX texture2D\n#define TEXLOD(t,u,l) texture2D(t,u)\n#define OUT gl_FragColor\n";
  const compile = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh)); return sh; };
  let shaderOk = true;
  const program = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, VS_HEAD + vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FS_HEAD + fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); shaderOk = false; } return p; };

  // pass 1: perspective panel quads. Clip position carries the depth as w, so the texture is interpolated correctly.
  const panelProg = program(`
    attribute vec3 aPos; attribute vec2 aUv; varying vec2 vUv;
    void main(){ gl_Position = vec4(aPos.xy, 0.0, aPos.z); vUv = aUv; }`, `
    varying vec2 vUv; uniform sampler2D uTex; uniform vec2 uSize; uniform float uRadius; uniform vec4 uCrop;
    void main(){
      vec2 p = (vUv - 0.5) * uSize;
      vec2 qd = abs(p) - (uSize * 0.5 - uRadius);
      float d = length(max(qd, 0.0)) + min(max(qd.x, qd.y), 0.0) - uRadius;
      #ifdef NO_DERIV
      float aa = 1.0;
      #else
      float aa = max(fwidth(d), 0.5);
      #endif
      float m = 1.0 - smoothstep(-2.0 * aa, 0.0, d);   // the ramp sits inside the shape: the quad boundary is the SDF zero
      vec3 c = TEX(uTex, vec2(uCrop.x + vUv.x * uCrop.z, uCrop.y + (1.0 - vUv.y) * uCrop.w)).rgb;
      OUT = vec4(c * m, m);
    }`);

  // pass 2: the glass at the screen edges
  const glassProg = program(`
    attribute vec2 a; varying vec2 vUv; void main(){ vUv = a; gl_Position = vec4(a * 2.0 - 1.0, 0.0, 1.0); }`, `
    varying vec2 vUv; uniform sampler2D uTex;
    uniform float uEdge, uStretchX, uStretchY, uDisp, uBlur, uWave, uWaveFreq, uTime, uFx, uFrost, uCenterY, uGradStart; uniform vec2 uPageY;
    uniform vec3 uPageTop, uPageBottom;
    const int NS = 16;
    void main(){
      float x = vUv.x * 2.0 - 1.0;
      float ax = abs(x), sx = x < 0.0 ? -1.0 : 1.0;
      float e = smoothstep(uEdge, 1.0, ax);
      float s = e * e * uFx;                       // glass strength: 0 across the middle, 1 at the screen edge
      if (s < 0.0005) { OUT = TEXLOD(uTex, vUv, 0.0); return; } // most of the screen: no glass, one fetch at an explicit level (implicit derivatives are undefined in this branch and would pick a tiny mip at its boundary)
      float p = uEdge * sx;                        // the glass magnifies about the line where it starts
      float ripple = uWave * s * (sin(vUv.y * uWaveFreq + uTime + sx * 1.7) * 0.7 + sin(vUv.y * uWaveFreq * 2.3 - uTime * 1.4) * 0.3);
      float lod = uBlur * s;
      vec3 col = vec3(0.0), cov = vec3(0.0), wSum = vec3(0.0);
      for (int i = 0; i < NS; i++) {
        float t = float(i) / float(NS - 1);
        float c = 1.0 + uDisp * (t - 0.5) * 2.0;   // each colour is bent a little differently
        float mx = 1.0 + uStretchX * s * c;
        float my = 1.0 + uStretchY * s * c;
        float xs = p + (x - p) / mx + ripple;
        float ys = (vUv.y - uCenterY) / my + uCenterY; // about the panels' own centre line
        vec4 smp = TEXLOD(uTex, vec2(xs * 0.5 + 0.5, ys), lod);
        vec3 dt = (vec3(t) - vec3(0.0, 0.5, 1.0)) / 0.38;
        vec3 w = exp(-dt * dt);                      // spectral weights: red at t=0, green mid, blue at t=1
        col += smp.rgb * w; cov += smp.a * w; wSum += w;
      }
      col /= wSum; cov /= wSum;                    // premultiplied colour and per-channel coverage
      float A = max(cov.r, max(cov.g, cov.b));
      float py = mix(uPageY.x, uPageY.y, 1.0 - vUv.y); // this pixel's position down the viewport, 0 top .. 1 bottom
      vec3 page = mix(uPageTop, uPageBottom, clamp((py - uGradStart) / max(1.0 - uGradStart, 0.001), 0.0, 1.0));
      col += page * (A - cov);                     // a channel the glass did not reach shows the page, so fringes stay pure
      col = mix(col, page * A, uFrost * s);        // frosted lift towards the page colour inside the glass
      OUT = vec4(col, A);
    }`);

  if (!shaderOk) { fallback(); return; }
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const panelBuf = gl.createBuffer();
  const panelData = new Float32Array(20);
  const U = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
  const PU = U(panelProg, ["uTex", "uSize", "uRadius", "uCrop"]);
  const GU = U(glassProg, ["uTex", "uEdge", "uStretchX", "uStretchY", "uDisp", "uBlur", "uWave", "uWaveFreq", "uTime", "uFx", "uFrost", "uCenterY", "uPageY", "uGradStart", "uPageTop", "uPageBottom"]);
  const aPos = gl.getAttribLocation(panelProg, "aPos"), aUv = gl.getAttribLocation(panelProg, "aUv"), glassA = gl.getAttribLocation(glassProg, "a");
  // centred crop of the 16:9 card for the panel aspect
  const CROP = (() => { const a = CYL.aspect; if (a < TEX_ASPECT) { const fw = a / TEX_ASPECT; return [(1 - fw) / 2, 0, fw, 1]; } const fh = TEX_ASPECT / a; return [0, (1 - fh) / 2, 1, fh]; })();

  // ---- textures: one per card; videos re-uploaded every frame ----
  const sources = anchors.map((a) => {
    const v = a.querySelector("video");
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0x22, 0x22, 0x44]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const s = { a, tex, video: v || null, ready: false };
    const img = new Image(); img.decoding = "async";
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      if (isGL2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); const ext = gl.getExtension("EXT_texture_filter_anisotropic"); if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); }
      s.ready = true;
    };
    img.src = v ? v.poster : a.querySelector("img").getAttribute("src");
    if (v) { v.muted = true; v.loop = true; v.playsInline = true; v.play().catch(() => {}); }
    return s;
  });
  function refreshVideos() {
    for (const s of sources) {
      if (!s.video || s.video.readyState < 2 || s.video.videoWidth === 0) continue;
      if (!visibleSrc.has(sources.indexOf(s))) continue;            // off screen: keep the last frame in the texture
      if (s.video.currentTime === s.lastTime) continue; s.lastTime = s.video.currentTime; // same frame: nothing to upload
      gl.bindTexture(gl.TEXTURE_2D, s.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, s.video);
      if (isGL2) gl.generateMipmap(gl.TEXTURE_2D);
    }
  }

  // ---- framebuffer for pass 1 ----
  let W = 0, H = 0, dpr = 1, fbo = null, fboTex = null;
  function makeFbo(w, h) {
    if (fbo) { gl.deleteFramebuffer(fbo); gl.deleteTexture(fboTex); }
    fboTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, isGL2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ---- drum geometry: radius 1, the viewer at the centre looking straight ahead ----
  let panelH = 100, yOff = 0, f = 1, S = 1, wWorld = 0, hWorld = 0, pitch = 0, fovHalf = 1;
  function measure() {
    const r = strip.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    makeFbo(canvas.width, canvas.height);
    const narrow = W < 700;
    // on narrow screens the width rules (the front panel takes about a quarter of it) and the drum is seen through a
    // tighter field of view, so three panels still fit before the glass takes over
    panelH = Math.round(Math.min(H * CYL.panelH, (W * (CYL.aspect < 1 ? 0.28 : 0.5)) / CYL.aspect));
    yOff = innerHeight * 0.038; // panels sit a little below the viewport centre, as before
    fovHalf = ((narrow ? Math.min(CYL.fov, 80) : CYL.fov) * Math.PI / 180) / 2;
    f = 1 / Math.tan(fovHalf);     // focal length in half-screen units
    S = (W / 2) * f;               // screen pixels per radian ahead: a drag of one panel width turns the drum one panel
    hWorld = panelH / S; wWorld = hWorld * CYL.aspect;
    pitch = 2 * Math.atan(wWorld / 2) + wWorld * CONFIG.GAP; // radians per slot
    const hl = strip.querySelector(".headline"); if (hl) hl.style.bottom = (H / 2 - yOff + panelH / 2 + 52).toFixed(1) + "px"; // 52 px above the front panel
    recomputeTotal();
  }
  // the scroll physics stay in pixels (one slot = the pitch seen from the centre), so wheel and drag feel as before
  const slotWidth = () => pitch * S;
  let totalWidth = 0;
  function recomputeTotal() { totalWidth = slotWidth() * N; }
  const centerForIndex = (idx) => idx * slotWidth();
  const nearestIndex = (value) => Math.round(value / slotWidth());
  const centerIndex = (v) => ((nearestIndex(v) % N) + N) % N;

  // ---- scroll state ----
  measure();
  let target = centerForIndex(0), scroll = target - (ENTRY.enabled ? ENTRY.spin * slotWidth() : 0), velocity = 0;
  let lastInput = performance.now(), snapped = true, userInteracted = false;
  let entryActive = ENTRY.enabled, entryT = ENTRY.enabled ? 0 : 1;
  const t0 = performance.now();

  // ---- layout: project the visible panels for the current turn of the drum (every frame) ----
  let panels = [], centeredPanel = null, maxHalfPx = 0;
  const visibleSrc = new Set();
  function layout() {
    panels = []; centeredPanel = null; visibleSrc.clear(); maxHalfPx = 0;
    const sc = 0.6 + 0.4 * entryT;
    const hw = wWorld * sc / 2, hh = hWorld * sc / 2;
    const yOffNdc = -yOff / (H / 2);
    const aspectFix = W / H;
    const i0 = nearestIndex(scroll);
    const span = Math.ceil((fovHalf + Math.atan(wWorld)) / pitch) + 1;
    let bestD = Infinity;
    for (let k = i0 - span; k <= i0 + span; k++) {
      const phi = (centerForIndex(k) - scroll) / S;
      if (Math.abs(phi) > fovHalf + Math.atan(wWorld) + 0.05) continue;
      const cx = Math.sin(phi), cz = -Math.cos(phi), tx = Math.cos(phi), tz = Math.sin(phi);
      const pts = [], clip = [];
      let maxDepth = -1;
      for (const [lx, ly] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]]) {
        const X = cx + lx * tx, Z = cz + lx * tz, depth = -Z;
        maxDepth = Math.max(maxDepth, depth);
        clip.push(f * X, f * aspectFix * ly + yOffNdc * depth, depth); // linear in world space; GL clips what is behind the viewer
        const d = Math.max(depth, 0.02);                                // for hit-testing only: corners behind the viewer land far outside
        const xn = f * X / d, yn = f * aspectFix * ly / d + yOffNdc;
        pts.push([(xn + 1) / 2 * W, (1 - yn) / 2 * H]);
      }
      if (maxDepth < 0.02) continue;
      // how tall this panel gets on screen: height grows as 1/depth along it, so check its ends and where it crosses the screen edges
      const dAt = (lx) => -cz - lx * tz, xAt = (lx) => f * (cx + lx * tx) / dAt(lx);
      const cand = [];
      if (dAt(-hw) > 0.02 && Math.abs(xAt(-hw)) <= 1) cand.push(-hw);
      if (dAt(hw) > 0.02 && Math.abs(xAt(hw)) <= 1) cand.push(hw);
      for (const xb of [-1, 1]) { const den = f * tx + xb * tz; if (Math.abs(den) > 1e-6) { const lx = (-xb * cz - f * cx) / den; if (lx >= -hw && lx <= hw && dAt(lx) > 0.02) cand.push(lx); } }
      for (const lx of cand) maxHalfPx = Math.max(maxHalfPx, (H / 2) * f * aspectFix * hh / dAt(lx));
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const bbox = { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
      if (bbox.right < 0 || bbox.left > W) continue;
      const srcIndex = ((k % N) + N) % N;
      panels.push({ srcIndex, poolIndex: k, phi, clip, pts, bbox }); visibleSrc.add(srcIndex);
      const d = Math.abs(phi);
      if (d < bestD) { bestD = d; centeredPanel = panels[panels.length - 1]; }
    }
    panels.sort((a, b) => Math.abs(b.phi) - Math.abs(a.phi)); // far ones first, the one ahead drawn last
  }
  // point in a projected panel (two triangles); nearest-to-centre panel wins when they touch
  const side = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  function inQuad(q, px, py) {
    const [a, b, c, d] = q.pts; const p = [px, py];
    const tri = (u, v, w) => { const s1 = side(u, v, p), s2 = side(v, w, p), s3 = side(w, u, p); return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0); };
    return tri(a, b, d) || tri(a, d, c);
  }
  // the glass zone shows pixels pulled from nearer the centre: undo that for the pointer (same mapping as the shader, middle sample)
  function throughGlass(px, py) {
    if (!(W > 0)) return [px, py];
    const x = px / W * 2 - 1, ax = Math.abs(x), sx = x < 0 ? -1 : 1;
    const t = Math.min(1, Math.max(0, (ax - CYL.edge) / (1 - CYL.edge))), e = t * t * (3 - 2 * t), s0 = e * e * entryT;
    if (s0 <= 0) return [px, py];
    const pv = CYL.edge * sx, mx = 1 + CYL.stretchX * s0, my = 1 + stretchYEff * s0;
    const xs = pv + (x - pv) / mx;
    const cyPx = H / 2 + yOff;
    return [(xs + 1) / 2 * W, cyPx + (py - cyPx) / my];
  }
  function panelAt(px0, py0) {
    const [px, py] = throughGlass(px0, py0);
    let best = null;
    for (const q of panels) if (px >= q.bbox.left && px <= q.bbox.right && py >= q.bbox.top && py <= q.bbox.bottom && inQuad(q, px, py)) { if (!best || Math.abs(q.phi) < Math.abs(best.phi)) best = q; }
    return best;
  }
  const bboxRect = (q, r) => ({ left: r.left + q.bbox.left, top: r.top + q.bbox.top, width: q.bbox.right - q.bbox.left, height: q.bbox.bottom - q.bbox.top });

  // ---- input (wheel, drag, click) ----
  let hovering = false;
  let dragging = false, dragPointerId = null, dragLastX = 0, dragDist = 0, dragVel = 0, dragMoveT = 0, suppressClick = false, dragType = "mouse";
  let lastPX = NaN, lastPY = NaN, pointerInside = false, frozen = false, pending = null;
  const inputLocked = () => frozen || entryActive || pending !== null;
  canvas.style.touchAction = "pan-y pinch-zoom";
  canvas.addEventListener("wheel", (e) => {
    if (inputLocked()) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    e.preventDefault(); userInteracted = true;
    target += d * CONFIG.WHEEL; lastInput = performance.now(); snapped = false;
  }, { passive: false });
  canvas.addEventListener("pointerdown", (e) => {
    suppressClick = false;
    if (inputLocked() || dragging || (e.button !== 0 && e.pointerType === "mouse")) return;
    dragging = true; dragPointerId = e.pointerId; dragType = e.pointerType || "mouse";
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    dragLastX = e.clientX; dragDist = 0; dragVel = 0; dragMoveT = performance.now(); velocity = 0; userInteracted = true; snapped = false; lastInput = dragMoveT;
    updateCursor();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (dragging && e.pointerId === dragPointerId) {
      const sens = dragType === "mouse" ? CONFIG.DRAG : INTERACT.TOUCH_DRAG;
      const dx = e.clientX - dragLastX; dragLastX = e.clientX; dragDist += Math.abs(dx);
      target -= dx * sens; dragVel = dragVel * 0.6 + -dx * sens * 0.4; dragMoveT = performance.now(); lastInput = dragMoveT; snapped = false;
    }
    const r = strip.getBoundingClientRect(); lastPX = e.clientX - r.left; lastPY = e.clientY - r.top; pointerInside = true;
    updateHover();
  });
  // hover: the drum pauses and the project name appears under the panel ahead
  const label = document.createElement("div"); label.className = "strip-label"; strip.appendChild(label);
  let lastWarm = -1;
  function updateHover() {
    const hit = (pointerInside && !dragging && !inputLocked() && Number.isFinite(lastPX)) ? panelAt(lastPX, lastPY) : null;
    hovering = !!hit;
    if (hit) {
      if (hit.srcIndex !== lastWarm) { lastWarm = hit.srcIndex; warmCard(sources[hit.srcIndex].a); } // fetch its hero and page before the click
      const [title, cat] = sources[hit.srcIndex].a.getAttribute("aria-label").split(",").map((t) => t.trim());
      const html = `<b>${title}</b><span>${cat}</span>`;
      if (label.innerHTML !== html) label.innerHTML = html;
      label.style.top = (H / 2 + yOff + panelH / 2 + 14).toFixed(1) + "px"; // just under the panels
      const lx = Math.min(W - 90, Math.max(90, (Math.max(0, hit.bbox.left) + Math.min(W, hit.bbox.right)) / 2)); // under the part of it that is on screen
      label.style.left = lx.toFixed(1) + "px"; // under the hovered panel (the CSS centres it on this point)
      label.classList.add("show");
    } else if (!ring.contains(document.activeElement)) label.classList.remove("show"); // a focused card keeps its name up
  }
  const endDrag = (e) => {
    if (!dragging || (e && dragPointerId !== null && e.pointerId !== dragPointerId)) return;
    dragging = false; try { canvas.releasePointerCapture(dragPointerId); } catch (_) {} dragPointerId = null;
    velocity = performance.now() - dragMoveT > INTERACT.FLICK_IDLE_MS ? 0 : dragVel; dragVel = 0;
    lastInput = performance.now(); snapped = false;
    suppressClick = dragDist > (dragType === "mouse" ? INTERACT.CLICK_SLOP : INTERACT.TOUCH_CLICK_SLOP);
    updateCursor();
  };
  canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", () => { pointerInside = false; updateCursor(); updateHover(); });
  let cursorNow = "";
  function updateCursor() {
    let v = "";
    if (!inputLocked()) { if (dragging) v = "grabbing"; else if (pointerInside && Number.isFinite(lastPX) && panelAt(lastPX, lastPY)) v = "grab"; }
    if (v !== cursorNow) { cursorNow = v; canvas.style.cursor = v; }
  }
  // click: the panel ahead opens at once; a panel to the side first turns to the front, then opens
  canvas.addEventListener("click", (e) => {
    if (suppressClick) { suppressClick = false; return; }
    if (inputLocked()) return;
    const r = strip.getBoundingClientRect();
    const hit = panelAt(e.clientX - r.left, e.clientY - r.top);
    if (!hit) return;
    e.preventDefault();
    if (Math.abs(hit.phi) < pitch * 0.35) { expand(sources[hit.srcIndex].a, bboxRect(hit, r)); return; }
    pending = hit.poolIndex; target = centerForIndex(hit.poolIndex); velocity = 0; snapped = true; lastInput = performance.now();
    label.classList.remove("show"); updateCursor();
  });
  // keyboard users reach the real anchors in the visually hidden list: focusing one turns the drum to it and names it
  let lastFocused = null;
  anchors.forEach((a, i) => a.addEventListener("focus", () => {
    lastFocused = a;
    if (inputLocked()) return;
    const k = Math.round(scroll / slotWidth()); const loop = Math.round((k - i) / N); // nearest instance of card i
    target = centerForIndex(i + loop * N); snapped = true; lastInput = performance.now();
    const [title, cat] = a.getAttribute("aria-label").split(",").map((t) => t.trim());
    label.innerHTML = `<b>${title}</b><span>${cat}</span>`; label.style.top = (H / 2 + yOff + panelH / 2 + 14).toFixed(1) + "px"; label.style.left = "50%"; label.classList.add("show");
  }));
  ring.addEventListener("focusout", () => { if (!ring.contains(document.activeElement)) label.classList.remove("show"); });
  ring.addEventListener("click", (e) => { const a = e.target.closest(".card"); if (!a) return; e.preventDefault(); expand(a, frameRect(a.dataset.kind)); });

  // where the case page's hero frame will sit: directly under the (fixed-position) logos, which stay put between pages.
  // The frame is 16:9 and no taller than 82vh (centred when that cap applies); infographics keep the full width.
  function frameRect(kind) {
    // the gutter is a clamp() value, so read it resolved from the hero's padding rather than parsing the variable
    const gutter = parseFloat(getComputedStyle(document.querySelector(".hero") || document.body).paddingLeft) || 24;
    const lg = document.querySelector(".hero-logos");
    const top = lg ? lg.getBoundingClientRect().bottom + 24 : 84;
    const full = innerWidth - gutter * 2;
    const w = kind === "infographic" ? full : Math.min(full, innerHeight * 0.82 * 16 / 9);
    return { left: (innerWidth - w) / 2, top, width: w, height: w * 9 / 16 };
  }
  // Open a case study in place: the card morphs into the hero frame while the page is fetched, then the page's
  // content is laid over the home page (same chrome, same positions). The URL updates; Back or the logos return
  // to the carousel exactly where it was.
  let overlay = null;
  const HOME_URL = location.href; // every page path is resolved against the home page, whatever the address bar says
  const abs = (href) => new URL(href, HOME_URL).href;
  const HOME_DIR = location.href.replace(/[^/]*$/, ""); // absolute, so inserted images resolve correctly after the URL changes
  const rebase = (html) => html.replace(/(src|href|poster)="\.\.\//g, `$1="${HOME_DIR}`);
  async function fetchPage(href) {
    const res = await fetch(href, { credentials: "same-origin" });
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const main = doc.querySelector("main.page");
    // the page's body classes (case / ill / infographic / vid) drive its layout rules, so they travel with it
    return { title: doc.title, html: main ? rebase(main.outerHTML) : null, bodyClass: doc.body ? doc.body.className : "" };
  }
  // ---- warm-up: a hovered card's hero picture and page are fetched before the click, and on desktops every hero is
  // fetched quietly once the entry animation is over, so the expanding card can show the sharp hero from its first frame
  const heroCache = new Map(); // hero src -> { img, ready, done }
  const pageCache = new Map(); // page href -> Promise<page>
  function warmHero(src) {
    if (!src) return null;
    if (heroCache.has(src)) return heroCache.get(src);
    const img = new Image(); img.decoding = "async";
    try { img.fetchPriority = "low"; } catch (_) {}
    const entry = { img, done: false, ready: null };
    entry.ready = new Promise((res) => {
      img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => { entry.done = true; res(true); });
      img.onerror = () => res(false);
    });
    img.src = src;
    heroCache.set(src, entry);
    return entry;
  }
  function warmPage(href) {
    if (!pageCache.has(href)) {
      const p = fetchPage(href).catch(() => null);
      pageCache.set(href, p);
      p.then((page) => { if (!page || !page.html) pageCache.delete(href); }); // a failed fetch is retried next time
    }
    return pageCache.get(href);
  }
  function warmCard(a) { if (a.dataset.hero) warmHero(abs(a.dataset.hero)); warmPage(abs(a.getAttribute("href"))); }
  function warmAll() {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return; // never pull every hero over a phone connection
    const c = navigator.connection; if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return; // Chrome's "3g" guess is unreliable on good links
    const mid = centerIndex(scroll);
    const order = sources.map((s, i) => ({ s, d: Math.abs(i - mid) })).sort((x, y) => x.d - y.d).map((o) => o.s);
    const pause = () => new Promise((res) => setTimeout(res, 400));
    (async () => {
      for (const s of order) {
        while (frozen) await pause(); // a page is open: let its own pictures load first, carry on afterwards
        const e = s.a.dataset.hero ? warmHero(abs(s.a.dataset.hero)) : null; warmPage(abs(s.a.getAttribute("href")));
        if (e) await e.ready;
      }
    })();
  }
  const loadImage = (src) => new Promise((res) => { if (!src) return res(); const i = new Image(); i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(res); i.onerror = () => res(); i.src = src; });
  function expand(card, r) {
    if (frozen) return;
    frozen = true; updateCursor();
    const kind = card.dataset.kind || "";
    const href = abs(card.getAttribute("href"));
    const pagePromise = warmPage(href);
    const media = card.querySelector("img, video");
    const heroSrc = card.dataset.hero ? abs(card.dataset.hero) : "";
    const cached = heroSrc ? heroCache.get(heroSrc) : null;
    const m = document.createElement("div"); m.className = "morph";
    let startImg, snapshot = null, heroLater = false;
    if (media.tagName === "VIDEO" && media.readyState >= 2 && media.videoWidth) {
      // start from the exact frame the strip is showing right now; the page's player then opens on that same frame
      startImg = document.createElement("canvas"); startImg.width = media.videoWidth; startImg.height = media.videoHeight;
      startImg.getContext("2d").drawImage(media, 0, 0);
      try { snapshot = startImg.toDataURL("image/jpeg", 0.92); } catch (_) { heroLater = true; }
    } else if (cached && cached.done) {
      startImg = cached.img.cloneNode(); // already fetched and decoded: the sharp hero from the first frame, nothing to swap in later
    } else {
      startImg = new Image(); startImg.src = media.tagName === "VIDEO" ? media.poster : media.getAttribute("src");
      heroLater = !!heroSrc;
    }
    m.appendChild(startImg);
    Object.assign(m.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "6px" });
    document.body.appendChild(m);
    document.body.classList.add("expanding");
    if (heroLater) {
      // the thumbnail is upscaled meanwhile; the hero fades in over it the moment it arrives
      const e = warmHero(heroSrc);
      if (e) e.ready.then((ok) => { if (!ok || !m.isConnected) return; const hero = e.img.cloneNode(); hero.className = "morph-hero"; m.appendChild(hero); requestAnimationFrame(() => hero.classList.add("show")); });
    }
    const t = frameRect(kind);
    const anim = m.animate([
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" },
      { left: t.left + "px", top: t.top + "px", width: t.width + "px", height: t.height + "px" },
    ], { duration: prefersReduced ? 0 : 700, easing: "cubic-bezier(.65, 0, .25, 1)", fill: "forwards" });
    const done = new Promise((res) => { anim.onfinish = res; });
    Promise.all([done, pagePromise]).then(([, page]) => {
      if (!page || !page.html) { location.href = href; return; }
      openOverlay(page, href, true);
      const frame = overlay && overlay.querySelector(".frame");
      const heroEl = frame && frame.querySelector("img, video");
      if (heroEl && heroEl.tagName === "VIDEO" && snapshot) heroEl.poster = snapshot;
      // the real frame can differ from the predicted box by a scrollbar or a rounding step: glide the last pixels
      let glide = Promise.resolve();
      if (frame) {
        const fr = frame.getBoundingClientRect();
        const want = { left: fr.left, top: fr.top, width: fr.width, height: kind === "infographic" ? fr.width * 9 / 16 : fr.height };
        if (Math.abs(want.left - t.left) > 0.5 || Math.abs(want.top - t.top) > 0.5 || Math.abs(want.width - t.width) > 0.5 || Math.abs(want.height - t.height) > 0.5) {
          const a2 = m.animate([
            { left: t.left + "px", top: t.top + "px", width: t.width + "px", height: t.height + "px" },
            { left: want.left + "px", top: want.top + "px", width: want.width + "px", height: want.height + "px" },
          ], { duration: prefersReduced ? 0 : 160, easing: "ease-out", fill: "forwards" });
          glide = new Promise((res) => { a2.onfinish = res; });
        }
      }
      // keep the expanded card on screen until the page's own picture is decoded and painted underneath it, then let go
      let ready;
      if (heroEl && heroEl.tagName === "VIDEO") ready = loadImage(heroEl.poster);
      else if (heroEl && heroEl.decode) ready = heroEl.decode().catch(() => {});
      else ready = Promise.resolve();
      Promise.all([ready, glide]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => { m.style.transition = "opacity .25s ease"; m.style.opacity = "0"; setTimeout(() => { m.remove(); document.body.classList.remove("expanding"); }, 260); })));
    });
  }
  function openOverlay(page, href, push) {
    closeOverlay(false);
    overlay = document.createElement("div");
    overlay.className = "overlay anim-in " + (page.bodyClass || "");
    overlay.innerHTML = page.html;
    document.body.appendChild(overlay);
    document.body.classList.add("overlay-open");
    document.title = page.title || document.title;
    overlay.querySelectorAll("video[autoplay]").forEach((v) => { v.muted = true; v.play().catch(() => {}); });
    overlay.querySelectorAll('a[href$="index.html"]').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); history.back(); }, { once: true }));
    if (push) history.pushState({ work: href }, "", href);
    overlay.scrollTop = 0;
  }
  function closeOverlay(unfreeze = true) {
    if (!overlay) return;
    overlay.remove(); overlay = null;
    document.body.classList.remove("overlay-open", "expanding");
    document.querySelectorAll(".morph").forEach((n) => n.remove());
    document.title = HOME_TITLE;
    if (unfreeze) { frozen = false; lastInput = performance.now(); updateCursor(); if (lastFocused && document.activeElement === document.body) lastFocused.focus({ preventScroll: true }); }
  }
  const HOME_TITLE = document.title;
  addEventListener("popstate", (e) => {
    if (e.state && e.state.work) { frozen = true; warmPage(abs(e.state.work)).then((page) => { if (page && page.html) openOverlay(page, e.state.work, false); else closeOverlay(true); }); }
    else closeOverlay(true);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay && !document.body.classList.contains("menu-open")) history.back(); });
  // deep link reload: the standalone page handles itself; nothing to do here
  addEventListener("pageshow", (e) => { if (e.persisted) { frozen = false; document.body.classList.remove("expanding"); document.querySelectorAll(".morph").forEach((n) => n.remove()); } });

  // ---- render ----
  function drawPanels() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); // premultiplied: nothing drawn = fully transparent
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(panelProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, panelBuf);
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aUv); gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 20, 12);
    gl.uniform1i(PU.uTex, 0); gl.activeTexture(gl.TEXTURE0);
    const sc = 0.6 + 0.4 * entryT;
    const sw = wWorld * sc * S, sh = hWorld * sc * S; // the panel's size in screen pixels when it is straight ahead
    gl.uniform2f(PU.uSize, sw, sh); gl.uniform1f(PU.uRadius, CYL.radius * Math.min(sw, sh));
    gl.uniform4f(PU.uCrop, CROP[0], CROP[1], CROP[2], CROP[3]);
    const uv = [[0, 0], [1, 0], [0, 1], [1, 1]];
    for (const q of panels) {
      for (let v = 0; v < 4; v++) { panelData[v * 5] = q.clip[v * 3]; panelData[v * 5 + 1] = q.clip[v * 3 + 1]; panelData[v * 5 + 2] = q.clip[v * 3 + 2]; panelData[v * 5 + 3] = uv[v][0]; panelData[v * 5 + 4] = uv[v][1]; }
      gl.bufferData(gl.ARRAY_BUFFER, panelData, gl.DYNAMIC_DRAW);
      gl.bindTexture(gl.TEXTURE_2D, sources[q.srcIndex].tex);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.disableVertexAttribArray(aUv);
    gl.disable(gl.BLEND);
  }
  function drawGlass(now) {
    if (isGL2) { gl.bindTexture(gl.TEXTURE_2D, fboTex); gl.generateMipmap(gl.TEXTURE_2D); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(glassProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(glassA); gl.vertexAttribPointer(glassA, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fboTex); gl.uniform1i(GU.uTex, 0);
    // the stretched panel must stay inside the strip: magnify about the panels' centre line, no further than the nearer edge
    const cy = 0.5 - yOff / H, cyPx = H / 2 + yOff; // the texture's y runs bottom-up: the panels sit below the middle, so their centre line is under 0.5
    const room = Math.min(cyPx, H - cyPx) - 10; // pixels available above and below the panels' centre line (minus the blur)
    const goal = maxHalfPx > 0 ? Math.max(0, Math.min(CYL.stretchY, (room / maxHalfPx - 1) / (1 + CYL.dispersion))) : CYL.stretchY;
    stretchYEff += (goal - stretchYEff) * 0.2;
    gl.uniform1f(GU.uCenterY, cy);
    const sr = strip.getBoundingClientRect(); gl.uniform2f(GU.uPageY, sr.top / innerHeight, sr.bottom / innerHeight);
    gl.uniform1f(GU.uEdge, CYL.edge); gl.uniform1f(GU.uStretchX, CYL.stretchX); gl.uniform1f(GU.uStretchY, stretchYEff);
    gl.uniform1f(GU.uDisp, CYL.dispersion); gl.uniform1f(GU.uBlur, CYL.blur); gl.uniform1f(GU.uWave, CYL.wave); gl.uniform1f(GU.uWaveFreq, CYL.waveFreq);
    gl.uniform1f(GU.uTime, prefersReduced ? 0 : now / 1000 * CYL.waveSpeed); gl.uniform1f(GU.uFx, entryT); gl.uniform1f(GU.uFrost, CYL.frost);
    gl.uniform3f(GU.uPageTop, pageTheme.top[0], pageTheme.top[1], pageTheme.top[2]); gl.uniform3f(GU.uPageBottom, pageTheme.bottom[0], pageTheme.bottom[1], pageTheme.bottom[2]); gl.uniform1f(GU.uGradStart, pageTheme.start);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  let stretchYEff = CYL.stretchY;
  const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
  function tick(now) {
    if (contextLost) return;
    if (overlay && !document.querySelector(".morph")) { tick.last = now; requestAnimationFrame(tick); return; } // a page is open over the drum: nothing to draw
    const dt = Math.min(0.05, (now - (tick.last || now)) / 1000); tick.last = now;
    if (entryActive) {
      const te = Math.min(1, Math.max(0, (now - t0) / 1000 - ENTRY.delay) / ENTRY.dur);
      entryT = easeOut3(te);
      if (te >= 1) { entryActive = false; strip.classList.add("entered"); setTimeout(warmAll, 1200); }
    }
    const idle = now - lastInput > AUTO.resumeAfterMs;
    if (!dragging) {
      target += velocity; velocity *= CONFIG.FRICTION; if (Math.abs(velocity) < 0.05) velocity = 0;
      if (CONFIG.SNAP && !snapped && !frozen && !idle && pending === null && now - lastInput > CONFIG.SNAP_IDLE_MS) {
        const rest = target + velocity * CONFIG.FRICTION / (1 - CONFIG.FRICTION); // where the flick would come to rest
        target = centerForIndex(nearestIndex(rest)); velocity = 0; snapped = true;
      }
      // slow automatic turn once the user has been idle; pauses while a panel is hovered
      if (idle && !hovering && !inputLocked() && !prefersReduced) target += AUTO.speed * dt;
    }
    const follow = pending !== null ? CONFIG.SELECT_EASE : dragging && dragType !== "mouse" ? INTERACT.TOUCH_EASE : (snapped && !idle) ? CONFIG.SNAP_EASE : CONFIG.EASE;
    scroll += (target - scroll) * follow;
    layout();
    if (pending !== null && Math.abs(target - scroll) < 0.4) {
      const q = panels.find((p) => p.poolIndex === pending); pending = null;
      if (q) expand(sources[q.srcIndex].a, bboxRect(q, strip.getBoundingClientRect()));
    }
    updateCursor();
    updateHover();
    refreshVideos();
    drawPanels();
    drawGlass(now);
    if (captureReq) { // debug: hand out a downscaled copy of this frame (window.__cylCapture(width)) or one row of pixels (window.__cylRow(yFrac))
      const c = document.createElement("canvas");
      if (captureReq.row !== undefined) {
        c.width = canvas.width; c.height = canvas.height; const ctx = c.getContext("2d"); ctx.drawImage(canvas, 0, 0);
        const y = Math.round(captureReq.row * (canvas.height - 1)); const d = ctx.getImageData(0, y, canvas.width, 1).data; const hits = [];
        for (let x = 0; x < canvas.width; x++) { const a = d[x * 4 + 3]; if (a > 0) hits.push([x, d[x * 4], d[x * 4 + 1], d[x * 4 + 2], a]); }
        captureReq.res({ width: canvas.width, y, nonTransparent: hits.length, runs: hits.slice(0, 12), last: hits.slice(-4) });
      } else {
        const k = captureReq.w / canvas.width; c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k);
        c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height); captureReq.res(c.toDataURL("image/jpeg", 0.8));
      }
      captureReq = null;
    }
    requestAnimationFrame(tick);
  }
  let captureReq = null;
  window.__cylCapture = (w = 720) => new Promise((res) => { captureReq = { w, res }; });
  window.__cylRow = (row = 0.85) => new Promise((res) => { captureReq = { row, res }; });
  window.__cylInfo = () => ({ W, H, panelH, pitchDeg: +(pitch * 180 / Math.PI).toFixed(2), fovDeg: +(fovHalf * 360 / Math.PI).toFixed(1), stretchYEff: +stretchYEff.toFixed(3), maxHalfPx: Math.round(maxHalfPx), bottomPx: Math.round(H / 2 + yOff + maxHalfPx * (1 + stretchYEff * (1 + CYL.dispersion))), topPx: Math.round(H / 2 + yOff - maxHalfPx * (1 + stretchYEff * (1 + CYL.dispersion))) });
  window.__cylPanels = () => panels.map((q) => ({ i: q.srcIndex, phi: +q.phi.toFixed(3), box: [q.bbox.left, q.bbox.top, q.bbox.right - q.bbox.left, q.bbox.bottom - q.bbox.top].map(Math.round) }));

  let resizeQueued = false;
  addEventListener("resize", () => {
    if (resizeQueued) return; resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      const r = strip.getBoundingClientRect();
      if (Math.abs(r.width - W) < 0.5 && Math.abs(r.height - H) < 0.5 && Math.min(2, devicePixelRatio || 1) === dpr) return;
      const ci = centerIndex(target), off = target - scroll, oldSlot = slotWidth();
      measure();
      const k = slotWidth() / oldSlot; // one slot changed size: carry position, destination and momentum over
      if (!userInteracted) { target = centerForIndex(ci); scroll = target - off * k; }
      else { scroll *= k; target *= k; velocity *= k; if (pending !== null) target = centerForIndex(pending); }
    });
  });
  if (!ENTRY.enabled) { strip.classList.add("entered"); setTimeout(warmAll, 1200); }
  requestAnimationFrame(tick);
  strip.classList.add("ready");
})();
