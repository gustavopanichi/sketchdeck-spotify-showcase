// Liquid glass carousel — a port of Yousuf-developer/liquid-glass-carousel (MIT) to plain WebGL, no three.js, no GSAP.
//
// Two passes every frame:
//   1. the row of 16:9 panels is drawn into an offscreen framebuffer with an orthographic camera (1 unit = 1 px);
//   2. that buffer is drawn to screen through the liquid-glass lens shader (tilted ellipse: inward refraction,
//      16-sample chromatic dispersion at the rim, white nova, shimmering blue ring, bright border line, fluid rim wave).
// Wheel and drag move a target; the row lerps after it and settles onto the nearest panel once input goes idle.
// Panels shrink up to 25% with scroll speed. On load the panels rise from below, then grow to full size while the
// lens blooms in. Clicking a panel opens its case study (our expand animation), replacing the original's focus mode.
(() => {
  const strip = document.getElementById("strip");
  const canvas = document.getElementById("liquid");
  const ring = document.getElementById("ring");
  if (!strip || !canvas || !ring) return;
  const anchors = [...ring.querySelectorAll(".card")];
  const N = anchors.length;
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- config (mirrors lib/carousel/config.js of the original) ----
  const CONFIG = { PANEL_H: 450, GAP: 12, EASE: 0.09, WHEEL: 1.4, DRAG: 1.6, FRICTION: 0.865, SNAP: true, SNAP_IDLE_MS: 120, SNAP_EASE: 0.05, SHRINK_MAX: 60, SHRINK_ATTACK: 0.25, SHRINK_DECAY: 0.06 };
  const INTERACT = { CLICK_SLOP: 6, FLICK_IDLE_MS: 90, TOUCH_DRAG: 1.0, TOUCH_EASE: 0.22, TOUCH_CLICK_SLOP: 12 };
  const LENS = { rotation: 65, sizeX: 0.565, sizeY: 1, zoom: 0, dispersion: 11, glow: 4.2, whiteGlow: 0.24, novaSize: 12, blueRing: 6, ringRadius: 0.49, ringWidth: 0.014, shimmer: true, shimmerFreq: 12, shimmerSpeed: 3.5, shimmerDepth: 0.12, rimStart: 0.578, rimTangential: 0.6, rimInward: 0, rimFreq1: 2, rimFreq2: 1, blueColor: [0 / 255, 157 / 255, 255 / 255], rimLine: 1.4, rimLinePos: 0.488, rimLineWidth: 0.003, samples: 16 }; // verbatim from the original repo
  const AUTO = { speed: 34, resumeAfterMs: 2500 }; // px/s idle drift; resumes this long after the last wheel/drag
const ENTRY = { enabled: !prefersReduced, delay: 0.5, startH: 80, riseDuration: 1.0, stagger: 0.07, fromBelow: 0.9, growDelay: 0.25, growDuration: 2.15, growStagger: 0.085, lensBloom: 1.4 };
  const PAGE_BG = [1, 1, 1]; // white, as the original
  const ASPECT = 16 / 9;

  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: false }) || canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) { strip.classList.add("no-webgl"); return; }
  const isGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;

  // ---- shaders ----
  const compile = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh)); return sh; };
  const program = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p)); return p; };

  // pass 1: textured panel quads, pixel units
  const panelProg = program(`
    attribute vec2 a; uniform vec2 uRes; uniform vec4 uRect; varying vec2 vUv;
    void main(){ vec2 px = uRect.xy + a * uRect.zw; vec2 clip = px / uRes * 2.0 - 1.0; gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0); vUv = a; }`, `
    precision mediump float; varying vec2 vUv; uniform sampler2D uTex; void main(){ gl_FragColor = vec4(texture2D(uTex, vUv).rgb, 1.0); }`);

  // pass 2: the lens, ported line for line from the original fragment shader
  const lensProg = program(`
    attribute vec2 a; varying vec2 vUv; void main(){ vUv = a; gl_Position = vec4(a * 2.0 - 1.0, 0.0, 1.0); }`, `
    #define PI 3.14159265
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform vec2  uRes;
    uniform vec2  uCenter;
    uniform float uSizeX, uSizeY, uAspect, uZoom, uDispersion, uGlow, uWhiteGlow, uNovaSize, uBlueRing, uRingRadius, uRingWidth;
    uniform float uShimmer, uShimmerFreq, uShimmerSpeed, uShimmerDepth, uTime, uRimStart, uRimTangential, uRimInward, uRimFreq1, uRimFreq2;
    uniform vec3  uBlueColor;
    uniform float uRimLine, uRimLinePos, uRimLineWidth, uRotation;
    uniform vec3  uPageBg;
    uniform float uRimScale;  // (sizeX+sizeY)/2 of the ORIGINAL lens: keeps the rim wave the same size at any aspect
    const int MAX_SAMPLES = 16;
    float gCov = 0.0;

    vec3 discLens(vec2 center, float aspectCorrect, out float outA) {
      vec2 p = (vUv - center);
      p.x *= aspectCorrect;
      float ca = cos(uRotation), sa = sin(uRotation);
      p = mat2(ca, -sa, sa, ca) * p;
      vec2 halfSize = vec2(uSizeX, uSizeY);
      float dist = length(p / halfSize);
      outA = 0.0;
      float maskND = dist;
      if (maskND > 1.0) return vec3(0.0);
      float shapeND = clamp(maskND, 0.0, 1.0);
      float nd = clamp(dist, 0.0, 1.0);
      vec2  offset = vUv - center;
      vec2  radialDir = normalize(offset + 1e-6);
      vec2  tangentDir = vec2(-radialDir.y, radialDir.x);
      float angle = atan(p.y, p.x);
      float pull = uZoom * 0.30 * (nd * nd);
      float rimStrength = smoothstep(uRimStart, 1.0, nd);
      float fluidWave = sin(angle * uRimFreq1) * 0.55 + sin(angle * uRimFreq2) * 0.25;
      float rScreen = uRimScale;
      vec2  rimOff = tangentDir * fluidWave * rimStrength * rScreen * uRimTangential;
      vec2  rimPull = -radialDir * rimStrength * rScreen * uRimInward;
      vec2 baseUV = center + offset * (1.0 - pull) + rimOff + rimPull;
      float rimMask = smoothstep(0.55, 1.0, nd);
      vec2  dispDir = offset * uDispersion * 0.004 * rimMask;
      vec3 col = vec3(0.0);
      vec3 caW = vec3(0.0);
      float cov = 0.0;
      for (int i = 0; i < MAX_SAMPLES; i++) {
        float t = float(i) / float(MAX_SAMPLES - 1);
        vec2 sUV = baseUV + dispDir * (t - 0.5);
        vec4 s = texture2D(uTex, sUV);
        vec3 w = vec3(exp(-pow((t - 0.00) / 0.38, 2.0)), exp(-pow((t - 0.50) / 0.38, 2.0)), exp(-pow((t - 1.00) / 0.38, 2.0)));
        col += s.rgb * w; caW += w; cov += s.a;
      }
      col /= max(caW, vec3(0.001));
      gCov = cov / float(MAX_SAMPLES);
      col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, shapeND));
      float r2 = shapeND * shapeND * 0.25;
      float gs = max(uNovaSize * uGlow * 0.003, 0.004);
      float nova = exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18;
      nova *= uWhiteGlow * (uGlow / 17.0) * 1.15;
      // glass edge light: where the bent picture meets the background inside the rim band
      float softA = 0.0;
      for (int k = -3; k <= 3; k++) softA += texture2D(uTex, baseUV + radialDir * float(k) * 0.006).a;
      softA /= 7.0;
      float edge = softA * (1.0 - softA) * 4.0;
      float facing = 0.5 + 0.5 * dot(radialDir, normalize(vec2(-0.6, 1.0)));
      col += (vec3(1.0) * 0.9 + uBlueColor * 0.35) * edge * rimStrength * (0.55 + 0.45 * facing) * 1.1;
      col += vec3(nova);
      float dC = shapeND * 0.5;
      float tR = clamp(uRingRadius, 0.1, 0.49);
      float rW = max(uRingWidth, 0.003);
      float ring = exp(-pow((dC - tR) / rW, 2.0));
      ring *= uBlueRing * (uGlow / 17.0) * 1.8;
      if (uShimmer > 0.5) ring *= sin(angle * uShimmerFreq + uTime * uShimmerSpeed) * uShimmerDepth + (1.0 - uShimmerDepth);
      float ringAura = exp(-pow((dC - tR) / (rW * 6.0), 2.0)) * 0.28 * uBlueRing * (uGlow / 17.0);
      col += uBlueColor * (ring + ringAura);
      col += vec3(exp(-pow((dC - uRimLinePos) / max(uRimLineWidth, 0.0001), 2.0)) * uRimLine);
      outA = smoothstep(1.0, 0.93, maskND);
      return col;
    }
    void main(){
      vec4 base = texture2D(uTex, vUv);
      float a = 0.0;
      vec3 c = discLens(uCenter, uAspect, a);
      gl_FragColor = vec4(mix(base.rgb, c, a), mix(base.a, gCov, a));
    }`);

  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const U = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
  const PU = U(panelProg, ["uRes", "uRect", "uTex"]);
  const LU = U(lensProg, ["uTex", "uRes", "uCenter", "uSizeX", "uSizeY", "uAspect", "uZoom", "uDispersion", "uGlow", "uWhiteGlow", "uNovaSize", "uBlueRing", "uRingRadius", "uRingWidth", "uShimmer", "uShimmerFreq", "uShimmerSpeed", "uShimmerDepth", "uTime", "uRimStart", "uRimTangential", "uRimInward", "uRimFreq1", "uRimFreq2", "uBlueColor", "uRimLine", "uRimLinePos", "uRimLineWidth", "uRotation", "uPageBg", "uRimScale"]);
  const panelA = gl.getAttribLocation(panelProg, "a"), lensA = gl.getAttribLocation(lensProg, "a");

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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  let panelH = CONFIG.PANEL_H, yOff = 0;
  function measure() {
    const r = strip.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    makeFbo(canvas.width, canvas.height);
    panelH = Math.round(Math.min(H * 0.37, W * 0.16)); // reference proportions: panels ~30% of the viewport tall, ~28% wide
    yOff = innerHeight * 0.038; // panels sit a little below the viewport centre, as in the reference
    // the demo mounts full-screen, so its lens is sized against the viewport height; our strip is shorter, so scale up to match
    LENS.k = innerHeight / H;
    LENS.sizeX = 0.565 * LENS.k; LENS.sizeY = 1 * LENS.k;
    // headline hugs the top edge of the panels; the label (below) hugs their bottom edge
    const hl = strip.querySelector(".headline"); if (hl) hl.style.bottom = (H / 2 - yOff + panelH / 2 + 22).toFixed(1) + "px";
    recomputeTotal();
  }

  // ---- row geometry ----
  const slotWidth = () => ASPECT * panelH + CONFIG.GAP;
  let totalWidth = 0;
  function recomputeTotal() { totalWidth = slotWidth() * N; }
  const centerForIndex = (idx) => { const loop = Math.floor(idx / N), s = ((idx % N) + N) % N; return s * slotWidth() + slotWidth() / 2 - CONFIG.GAP / 2 + loop * totalWidth; };
  function nearestIndex(value) {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < N; i++) { const c = i * slotWidth() + slotWidth() / 2 - CONFIG.GAP / 2; const k = Math.round((value - c) / totalWidth); const d = Math.abs(c + k * totalWidth - value); if (d < bestDist) { bestDist = d; best = i + k * N; } }
    return best;
  }
  const centerIndex = (v) => ((nearestIndex(v) % N) + N) % N;

  // ---- scroll state ----
  measure();
  let scroll = centerForIndex(0), target = scroll, velocity = 0, prevScroll = scroll, scrollEnergy = 0;
  let lastInput = performance.now(), snapped = true, userInteracted = false;

  // ---- entry state (rise then grow), lens bloom ----
  const REPEATS = 4;
  const pEntry = new Array(REPEATS * N).fill(ENTRY.enabled ? 0 : 1);
  const growArr = new Array(REPEATS * N).fill(ENTRY.enabled ? 0 : 1);
  let entryActive = ENTRY.enabled, entrySettled = false, lensFx = ENTRY.enabled ? 0 : 1;
  const tweens = [];
  const ease = { power3out: (t) => 1 - Math.pow(1 - t, 3), expoInOut: (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2, power2InOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 };
  const tween = (obj, key, to, at, dur, fn) => tweens.push({ obj, key, from: null, to, at, dur, fn });
  const call = (f, at) => tweens.push({ call: f, at, done: false });
  let timelineStart = 0;
  function runTweens(now) {
    const t = (now - timelineStart) / 1000;
    for (const tw of tweens) {
      if (tw.call) { if (!tw.done && t >= tw.at) { tw.done = true; tw.call(); } continue; }
      if (t < tw.at) continue;
      if (tw.from === null) tw.from = tw.obj[tw.key];
      const k = Math.min(1, (t - tw.at) / tw.dur);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * tw.fn(k);
    }
  }
  const lensState = { fx: lensFx };
  function playEntry() {
    tweens.length = 0;
    timelineStart = performance.now() + ENTRY.delay * 1000;
    const midRep = Math.floor(REPEATS / 2);
    const cSrc = centerIndex(scroll);
    const visible = [];
    const maxVisible = Math.ceil(W / slotWidth() / 2) + 1;
    for (let di = -maxVisible; di <= maxVisible; di++) visible.push({ idx: midRep * N + (((cSrc + di) % N) + N) % N, rank: Math.abs(di) });
    const spread = ENTRY.stagger * Math.max(visible.length - 1, 1);
    let lastRiseEnd = 0;
    visible.forEach((v) => { const at = Math.random() * spread; lastRiseEnd = Math.max(lastRiseEnd, at + ENTRY.riseDuration); tween(pEntry, v.idx, 1, at, ENTRY.riseDuration, ease.power3out); });
    call(() => { entryActive = false; entrySettled = true; }, lastRiseEnd);
    const growStart = lastRiseEnd + ENTRY.growDelay;
    const maxRank = Math.max(...visible.map((v) => v.rank));
    let growEnd = growStart;
    tween(lensState, "fx", 1, growStart, ENTRY.lensBloom, ease.power2InOut);
    visible.forEach((v) => { const at = growStart + (maxRank - v.rank) * ENTRY.growStagger; growEnd = Math.max(growEnd, at + ENTRY.growDuration); tween(growArr, v.idx, 1, at, ENTRY.growDuration, ease.expoInOut); });
    call(() => { entrySettled = false; growArr.fill(1); pEntry.fill(1); strip.classList.add("entered"); }, growEnd);
  }

  // ---- layout: panel rects for the current scroll (every frame) ----
  let panelRects = [], centeredPanel = null;
  function layout() {
    panelRects = []; centeredPanel = null;
    const half = W / 2, buffer = panelH, inEntry = entryActive || entrySettled;
    const shrink = 1 - 0.25 * scrollEnergy;
    const h = panelH * shrink, wPx = ASPECT * h;
    const midRep = Math.floor(REPEATS / 2);
    const cSrc = centerIndex(scroll);
    let centeredDist = Infinity;
    for (let rep = 0; rep < REPEATS; rep++) for (let i = 0; i < N; i++) {
      const poolIdx = rep * N + i;
      const slotCenterInLoop = i * slotWidth() + slotWidth() / 2 - CONFIG.GAP / 2;
      let x = slotCenterInLoop - scroll;
      x = ((x % totalWidth) + totalWidth) % totalWidth;
      x += (rep - midRep) * totalWidth;
      if (x > half + totalWidth) x -= totalWidth * REPEATS;
      if (!inEntry && (x < -half - buffer || x > half + buffer)) continue;
      let finalX = x, finalY = 0, finalW = wPx, finalH = h;
      if (inEntry) {
        if (rep !== midRep) continue;
        const g = growArr[poolIdx] || 0, pe = pEntry[poolIdx] || 0;
        finalH = ENTRY.startH + (h - ENTRY.startH) * g; finalW = finalH * ASPECT;
        let di = i - cSrc; if (di > N / 2) di -= N; if (di < -N / 2) di += N;
        const slotH = (s) => ENTRY.startH + (panelH - ENTRY.startH) * (growArr[midRep * N + s] || 0);
        let off = 0;
        const sgn = Math.sign(di);
        for (let k = 0; k < Math.abs(di); k++) { const sa = (((cSrc + sgn * k) % N) + N) % N, sb = (((cSrc + sgn * (k + 1)) % N) + N) % N; off += sgn * ((ASPECT * slotH(sa) + ASPECT * slotH(sb)) / 2 + CONFIG.GAP); }
        finalX = off;
        if (finalX < -half - buffer || finalX > half + buffer) continue;
        const below = H * ENTRY.fromBelow;
        finalY = below * (1 - pe);
      }
      const sx = finalX + half, sy = H / 2 + yOff + finalY;
      panelRects.push({ left: sx - finalW / 2, top: sy - finalH / 2, w: finalW, h: finalH, srcIndex: i, centerX: finalX });
      if (!inEntry && Math.abs(finalX) < centeredDist) { centeredDist = Math.abs(finalX); centeredPanel = { srcIndex: i, centerX: finalX }; }
    }
  }
  const panelAt = (px, py) => panelRects.find((r) => px >= r.left && px <= r.left + r.w && py >= r.top && py <= r.top + r.h) || null;

  // ---- input (wheel, drag, click) ----
  let hovering = false, hoverLabel = null;
  let dragging = false, dragPointerId = null, dragLastX = 0, dragDist = 0, dragVel = 0, dragMoveT = 0, suppressClick = false, dragType = "mouse";
  let lastPX = NaN, lastPY = NaN, pointerInside = false, frozen = false;
  const inputLocked = () => frozen || entryActive || entrySettled;
  canvas.style.touchAction = "pan-y";
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
  // hover: the strip pauses and the project name appears under the panel
  const label = document.createElement("div"); label.className = "strip-label"; strip.appendChild(label);
  function updateHover() {
    const hit = (pointerInside && !dragging && !inputLocked() && Number.isFinite(lastPX)) ? panelAt(lastPX, lastPY) : null;
    hovering = !!hit;
    if (hit) {
      const [title, cat] = sources[hit.srcIndex].a.getAttribute("aria-label").split(",").map((t) => t.trim());
      const html = `<b>${title}</b><span>${cat}</span>`;
      if (label.innerHTML !== html) label.innerHTML = html;
      label.style.top = (H / 2 + yOff + panelH / 2 + 14).toFixed(1) + "px"; // just under the (unshrunk) panels
      label.classList.add("show");
    } else label.classList.remove("show");
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
  canvas.addEventListener("click", (e) => {
    if (suppressClick) { suppressClick = false; return; }
    if (inputLocked()) return;
    const r = strip.getBoundingClientRect();
    const hit = panelAt(e.clientX - r.left, e.clientY - r.top);
    if (!hit) return;
    e.preventDefault();
    expand(sources[hit.srcIndex].a, { left: r.left + hit.left, top: r.top + hit.top, width: hit.w, height: hit.h });
  });
  // keyboard users reach the real anchors in the visually hidden list
  ring.addEventListener("click", (e) => { const a = e.target.closest(".card"); if (!a) return; e.preventDefault(); expand(a, frameRect()); });

  // ---- expand into the case-study frame ----
  // where the case page's hero frame will sit: directly under the (fixed-position) logos, which stay put between pages
  function frameRect() {
    // the gutter is a clamp() value, so read it resolved from the hero's padding rather than parsing the variable
    const gutter = parseFloat(getComputedStyle(document.querySelector(".hero") || document.body).paddingLeft) || 24;
    const lg = document.querySelector(".hero-logos");
    const top = lg ? lg.getBoundingClientRect().bottom + 24 : 84;
    const w = innerWidth - gutter * 2;
    return { left: gutter, top, width: w, height: Math.min(w * 9 / 16, innerHeight * 0.82) };
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
    return { title: doc.title, html: main ? rebase(main.outerHTML) : null };
  }
  function expand(card, r) {
    if (frozen) return;
    frozen = true; updateCursor();
    const href = abs(card.getAttribute("href"));
    const pagePromise = fetchPage(href).catch(() => null);
    const media = card.querySelector("img, video");
    const m = document.createElement("div"); m.className = "morph";
    let startImg;
    if (media.tagName === "VIDEO" && media.readyState >= 2 && media.videoWidth) {
      // start from the exact frame the strip is showing right now, not the poster
      startImg = document.createElement("canvas"); startImg.width = media.videoWidth; startImg.height = media.videoHeight;
      startImg.getContext("2d").drawImage(media, 0, 0);
    } else { startImg = new Image(); startImg.src = media.tagName === "VIDEO" ? media.poster : media.getAttribute("src"); }
    m.appendChild(startImg);
    Object.assign(m.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: "6px" });
    document.body.appendChild(m);
    document.body.classList.add("expanding");
    if (card.dataset.hero) {
      const hero = new Image(); hero.className = "morph-hero";
      hero.onload = () => { m.appendChild(hero); requestAnimationFrame(() => hero.classList.add("show")); };
      hero.src = abs(card.dataset.hero);
    }
    const t = frameRect();
    const anim = m.animate([
      { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" },
      { left: t.left + "px", top: t.top + "px", width: t.width + "px", height: t.height + "px" },
    ], { duration: prefersReduced ? 0 : 700, easing: "cubic-bezier(.65, 0, .25, 1)", fill: "forwards" });
    const done = new Promise((res) => { anim.onfinish = res; });
    Promise.all([done, pagePromise]).then(([, page]) => {
      if (!page || !page.html) { location.href = href; return; }
      openOverlay(page, href, true);
      // keep the expanded card on screen until the page's own hero is decoded and painted underneath it, then let go
      const heroImg = overlay && overlay.querySelector(".frame img, .frame video");
      const ready = heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve();
      ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => { m.style.transition = "opacity .25s ease"; m.style.opacity = "0"; setTimeout(() => { m.remove(); document.body.classList.remove("expanding"); }, 260); })));
    });
  }
  function openOverlay(page, href, push) {
    closeOverlay(false);
    overlay = document.createElement("div");
    overlay.className = "overlay anim-in";
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
    if (unfreeze) { frozen = false; lastInput = performance.now(); updateCursor(); }
  }
  const HOME_TITLE = document.title;
  addEventListener("popstate", (e) => {
    if (e.state && e.state.work) { frozen = true; fetchPage(abs(e.state.work)).then((page) => { if (page && page.html) openOverlay(page, e.state.work, false); else closeOverlay(true); }); }
    else closeOverlay(true);
  });
  // deep link reload: the standalone page handles itself; nothing to do here
  addEventListener("pageshow", (e) => { if (e.persisted) { frozen = false; document.body.classList.remove("expanding"); document.querySelectorAll(".morph").forEach((n) => n.remove()); } });

  // ---- render ----
  function drawPanels() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(PAGE_BG[0], PAGE_BG[1], PAGE_BG[2], 0); gl.clear(gl.COLOR_BUFFER_BIT); // white but transparent: the page shows through wherever there is no picture
    gl.useProgram(panelProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(panelA); gl.vertexAttribPointer(panelA, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(PU.uRes, canvas.width, canvas.height);
    gl.uniform1i(PU.uTex, 0); gl.activeTexture(gl.TEXTURE0);
    for (const r of panelRects) {
      gl.bindTexture(gl.TEXTURE_2D, sources[r.srcIndex].tex);
      gl.uniform4f(PU.uRect, r.left * dpr, r.top * dpr, r.w * dpr, r.h * dpr);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }
  function drawLens(now) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(lensProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(lensA); gl.vertexAttribPointer(lensA, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fboTex);
    const fx = lensState.fx;
    gl.uniform1i(LU.uTex, 0);
    gl.uniform2f(LU.uRes, canvas.width, canvas.height);
    gl.uniform2f(LU.uCenter, 0.5, 0.5);
    gl.uniform1f(LU.uSizeX, LENS.sizeX); gl.uniform1f(LU.uSizeY, LENS.sizeY); gl.uniform1f(LU.uAspect, W / H);
    gl.uniform1f(LU.uZoom, LENS.zoom * fx); gl.uniform1f(LU.uDispersion, LENS.dispersion * fx);
    gl.uniform1f(LU.uGlow, LENS.glow); gl.uniform1f(LU.uWhiteGlow, LENS.whiteGlow); gl.uniform1f(LU.uNovaSize, LENS.novaSize);
    gl.uniform1f(LU.uBlueRing, LENS.blueRing * fx); gl.uniform1f(LU.uRingRadius, LENS.ringRadius); gl.uniform1f(LU.uRingWidth, LENS.ringWidth);
    gl.uniform1f(LU.uShimmer, LENS.shimmer ? 1 : 0); gl.uniform1f(LU.uShimmerFreq, LENS.shimmerFreq); gl.uniform1f(LU.uShimmerSpeed, LENS.shimmerSpeed); gl.uniform1f(LU.uShimmerDepth, LENS.shimmerDepth);
    gl.uniform1f(LU.uTime, now * 0.001);
    gl.uniform1f(LU.uRimStart, LENS.rimStart); gl.uniform1f(LU.uRimTangential, LENS.rimTangential * fx); gl.uniform1f(LU.uRimInward, LENS.rimInward * fx);
    gl.uniform1f(LU.uRimFreq1, LENS.rimFreq1); gl.uniform1f(LU.uRimFreq2, LENS.rimFreq2);
    gl.uniform3f(LU.uBlueColor, LENS.blueColor[0], LENS.blueColor[1], LENS.blueColor[2]);
    gl.uniform1f(LU.uRimLine, LENS.rimLine * fx); gl.uniform1f(LU.uRimLinePos, LENS.rimLinePos); gl.uniform1f(LU.uRimLineWidth, LENS.rimLineWidth);
    gl.uniform1f(LU.uRotation, LENS.rotation * Math.PI / 180);
    gl.uniform3f(LU.uPageBg, PAGE_BG[0], PAGE_BG[1], PAGE_BG[2]);
    gl.uniform1f(LU.uRimScale, (LENS.sizeX + LENS.sizeY) * 0.5);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function tick(now) {
    runTweens(now);
    const dt = Math.min(0.05, (now - (tick.last || now)) / 1000); tick.last = now;
    const idle = now - lastInput > AUTO.resumeAfterMs;
    if (!dragging) {
      target += velocity; velocity *= CONFIG.FRICTION; if (Math.abs(velocity) < 0.05) velocity = 0;
      if (CONFIG.SNAP && !snapped && !frozen && !idle && now - lastInput > CONFIG.SNAP_IDLE_MS) { target = centerForIndex(nearestIndex(scroll)); snapped = true; }
      // slow automatic drift once the user has been idle; pauses while a panel is hovered
      if (idle && !hovering && !inputLocked() && !prefersReduced) target += AUTO.speed * dt;
    }
    const follow = dragging && dragType !== "mouse" ? INTERACT.TOUCH_EASE : (snapped && !idle) ? CONFIG.SNAP_EASE : CONFIG.EASE;
    scroll += (target - scroll) * follow;
    const rawSpeed = scroll - prevScroll; prevScroll = scroll;
    const norm = Math.min(1, Math.abs(rawSpeed) / Math.max(1, CONFIG.SHRINK_MAX));
    scrollEnergy += (norm - scrollEnergy) * (norm > scrollEnergy ? CONFIG.SHRINK_ATTACK : CONFIG.SHRINK_DECAY);
    layout();
    updateCursor();
    updateHover();
    refreshVideos();
    drawPanels();
    drawLens(now);
    requestAnimationFrame(tick);
  }

  addEventListener("resize", () => { const ci = centerIndex(scroll); measure(); if (!userInteracted) { scroll = target = centerForIndex(ci); } });
  if (ENTRY.enabled) playEntry(); else strip.classList.add("entered");
  requestAnimationFrame(tick);
  strip.classList.add("ready");
})();
