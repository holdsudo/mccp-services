/* ==========================================================================
   MCCPS — cinematic scroll-driven 3D experience
   One persistent three.js world; the camera flies between "stages" as you
   scroll through pinned chapters. Everything is procedural (no model files).
   ========================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const damp = (k, dt) => 1 - Math.exp(-k * dt);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
let portrait = window.innerWidth < 960;

const stageEl = $('#stage'), canvas = $('#gl'), labelsEl = $('#labels');
const preloader = $('#preloader'), loadPct = $('[data-load-pct]'), loadBar = $('.preloader__bar i');
let loadProgress = 0.35;
const setLoad = (p) => { loadProgress = Math.max(loadProgress, p); if (loadPct) loadPct.textContent = Math.round(loadProgress * 100); if (loadBar) loadBar.style.width = (loadProgress * 100) + '%'; };
setLoad(0.35);

/* ------------------------------------------------------------------ WebGL guard */
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!webglOK()) {
  $$('.copy').forEach(c => { c.style.opacity = 1; c.style.transform = 'none'; c.classList.add('is-live'); });
  stageEl.style.display = 'none'; preloader.classList.add('is-done');
  throw new Error('WebGL unavailable — static fallback');
}

/* ================================================================== RENDERER */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
const DPR = Math.min(window.devicePixelRatio || 1, portrait ? 1.6 : 1.8);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const BG = new THREE.Color(0x02050c);
renderer.setClearColor(BG, 1);

const scene = new THREE.Scene();
scene.background = BG;
scene.fog = new THREE.FogExp2(0x02050c, 0.04);

const camera = new THREE.PerspectiveCamera(portrait ? 62 : 40, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 0.2, 8.6);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(DPR);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* environment for reflections */
{
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12), new THREE.MeshBasicMaterial({ color: 0x081126, side: THREE.BackSide })));
  const mk = (w, h, c, p, r) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(...p); m.rotation.set(...r); env.add(m); };
  mk(18, 5, 0xa9d0ff, [0, 9, -8], [Math.PI / 3, 0, 0]);
  mk(8, 14, 0x3c98ff, [-15, 0, 0], [0, Math.PI / 2, 0]);
  mk(8, 14, 0x62e58a, [15, 0, 0], [0, -Math.PI / 2, 0]);
  mk(22, 4, 0xffffff, [0, -9, 6], [-Math.PI / 2.4, 0, 0]);
  scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose();
}

scene.add(new THREE.HemisphereLight(0x8fb8ff, 0x04070f, 0.5));
const key = new THREE.PointLight(0x3c98ff, 50, 40, 2); scene.add(key);
const fill = new THREE.PointLight(0x3fc96a, 35, 40, 2); scene.add(fill);
const rim = new THREE.PointLight(0xffffff, 22, 40, 2); scene.add(rim);

/* ================================================================== TEXTURES */
function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
function stripeTex() { const c = document.createElement('canvas'); c.width = 256; c.height = 8; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 8); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.x = 3; return t; }
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const DOT = dotTex();

function makeCardTexture(side) {
  const W = 1024, H = 648; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, W, H);
  if (side === 'front') { grad.addColorStop(0, '#0a3d8f'); grad.addColorStop(0.45, '#1e7df0'); grad.addColorStop(1, '#2fb35c'); } else { grad.addColorStop(0, '#0b1a3a'); grad.addColorStop(1, '#123f7a'); }
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = .22; g.strokeStyle = '#fff'; g.lineWidth = 160; g.lineCap = 'round'; g.beginPath(); g.moveTo(-100, H * .85); g.quadraticCurveTo(W * .5, H * .1, W + 120, H * .55); g.stroke(); g.restore();
  g.save(); g.globalAlpha = .12; g.strokeStyle = '#9ff7c0'; g.lineWidth = 60; g.beginPath(); g.moveTo(-100, H * .95); g.quadraticCurveTo(W * .55, H * .25, W + 120, H * .7); g.stroke(); g.restore();
  g.save(); g.globalAlpha = .08; g.fillStyle = '#fff'; for (let y = 20; y < H; y += 28) for (let x = 20; x < W; x += 28) { g.beginPath(); g.arc(x, y, 1.4, 0, 7); g.fill(); } g.restore();
  if (side === 'front') {
    g.fillStyle = '#fff'; g.font = '700 92px Outfit, Inter, system-ui, sans-serif'; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; g.fillText('MCCPS', 88, 150); g.shadowBlur = 0;
    g.font = '600 22px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.letterSpacing = '4px'; g.fillText('MERCHANT CREDIT CARD PROCESSING SERVICES', 92, 186);
    g.font = '500 54px "Courier New", ui-monospace, monospace'; g.fillStyle = 'rgba(255,255,255,.95)'; g.letterSpacing = '6px'; g.fillText('••••  ••••  ••••  6227', 92, 450);
    g.font = '600 22px Inter, system-ui, sans-serif'; g.letterSpacing = '2px'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('ZERO PROCESSING FEES', 92, 540); g.fillText('NEXT DAY FUNDING', 92, 575);
    g.textAlign = 'right'; g.font = '700 30px Outfit, Inter, system-ui, sans-serif'; g.fillStyle = '#fff'; g.letterSpacing = '1px'; g.fillText('PCI', W - 92, 560); g.font = '500 18px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('COMPLIANT', W - 92, 585);
  } else {
    g.fillStyle = 'rgba(255,255,255,.9)'; roundRect(g, 92, 250, 620, 70, 8); g.fill();
    g.fillStyle = '#0b1a3a'; g.font = '500 34px "Courier New", ui-monospace, monospace'; g.textBaseline = 'middle'; g.letterSpacing = '4px'; g.fillText('844 826 6227', 110, 285);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '500 20px Inter, system-ui, sans-serif'; g.textBaseline = 'alphabetic'; g.letterSpacing = '2px'; g.fillText('SECURE • ENCRYPTED • 24/7 SUPPORT', 92, 400);
    g.font = '700 40px Outfit, Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.9)'; g.letterSpacing = '0px'; g.fillText('MCCPS', 92, 560);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function roundedRectShape(w, h, r) { const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }

/* ================================================================== STAGES */
const STAGE_Z = 18;
const stagePos = (k) => new THREE.Vector3(0, 0, -k * STAGE_Z);
const world = new THREE.Group(); scene.add(world);

/* ---------- ambient: particles + floor grid ---------- */
{
  const N = portrait ? 600 : 1300; const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 30; pos[i * 3 + 1] = (Math.random() - .5) * 14; pos[i * 3 + 2] = 8 - Math.random() * (STAGE_Z * 8 + 20); seed[i] = Math.random(); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: DPR }, uTex: { value: DOT }, fogColor: { value: scene.fog.color }, fogDensity: { value: scene.fog.density } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uPR; varying float vA; varying float vS; varying float vFog;
      void main(){ vec3 p = position; p.y += sin(uTime*.3 + seed*6.283)*.4; p.x += cos(uTime*.2 + seed*6.283)*.3;
        vec4 mv = modelViewMatrix * vec4(p,1.); float d = -mv.z; gl_PointSize = (.7 + seed*1.3) * uPR * (30. / d);
        vA = .25 + .75*abs(sin(uTime*.5 + seed*20.)); vS = seed; vFog = d; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 fogColor; uniform float fogDensity; varying float vA; varying float vS; varying float vFog;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); vec3 c = mix(vec3(.35,.62,1.), vec3(.45,.9,.6), step(.7, vS));
        float f = 1. - exp(-fogDensity*fogDensity*vFog*vFog); gl_FragColor = vec4(mix(c, fogColor, f), t.a * vA * .5 * (1.-f)); }`
  });
  const pts = new THREE.Points(geo, mat); scene.add(pts); scene.userData.particles = mat;
  const grid = new THREE.GridHelper(220, 110, 0x1e7df0, 0x1e7df0); grid.material.transparent = true; grid.material.opacity = .07; grid.material.depthWrite = false; grid.position.set(0, -4.2, -STAGE_Z * 4); scene.add(grid);
}

/* ---------- THE CARD ---------- */
const CW = 3.4, CH = 2.15, CD = 0.07;
const card = new THREE.Group(); world.add(card);
const cardParts = {};
{
  const ex = new THREE.ExtrudeGeometry(roundedRectShape(CW, CH, .18), { depth: CD, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 3, curveSegments: 24 }); ex.center();
  cardParts.body = new THREE.Mesh(ex, new THREE.MeshPhysicalMaterial({ color: 0x0d3f8f, metalness: .55, roughness: .28, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.2 }));
  const fTex = makeCardTexture('front'), bTex = makeCardTexture('back');
  const faceGeo = new THREE.PlaneGeometry(CW - .02, CH - .02);
  cardParts.front = new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({ map: fTex, emissive: 0xffffff, emissiveMap: fTex, emissiveIntensity: .38, metalness: .3, roughness: .22, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: 1.4 }));
  cardParts.back = new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({ map: bTex, emissive: 0xffffff, emissiveMap: bTex, emissiveIntensity: .28, metalness: .3, roughness: .3, clearcoat: .8, clearcoatRoughness: .2, envMapIntensity: 1.1 }));
  cardParts.back.rotation.y = Math.PI;
  // chip
  cardParts.chip = new THREE.Mesh(new RoundedBoxGeometry(.44, .34, .035, 3, .05), new THREE.MeshPhysicalMaterial({ color: 0xe8c25c, metalness: .8, roughness: .3, envMapIntensity: 1.2, emissive: 0x8a5d14, emissiveIntensity: .5 }));
  // contactless rings
  cardParts.tap = new THREE.Group();
  for (let i = 1; i <= 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.07 * i, .012, 8, 24, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff })); r.rotation.z = -.7; cardParts.tap.add(r); }
  // holographic security layer (exploded only)
  const holoC = document.createElement('canvas'); holoC.width = 512; holoC.height = 324; { const g = holoC.getContext('2d'); const gr = g.createLinearGradient(0, 0, 512, 324); gr.addColorStop(0, 'rgba(120,200,255,.0)'); gr.addColorStop(.5, 'rgba(140,240,190,.55)'); gr.addColorStop(1, 'rgba(120,200,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 324); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(i * 40, 0); g.lineTo(i * 40 + 120, 324); g.stroke(); } }
  const holoT = new THREE.CanvasTexture(holoC);
  cardParts.holo = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: holoT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  // magnetic stripe (exploded, behind)
  cardParts.stripe = new THREE.Mesh(new THREE.BoxGeometry(CW - .3, .42, .015), new THREE.MeshStandardMaterial({ color: 0x0a0f1e, metalness: .7, roughness: .4, transparent: true, opacity: 0 }));
  [cardParts.body, cardParts.front, cardParts.back, cardParts.chip, cardParts.tap, cardParts.holo, cardParts.stripe].forEach(m => card.add(m));
  // anchors for hotspots
  cardParts.anchors = {
    chip: new THREE.Object3D(), tap: new THREE.Object3D(), holo: new THREE.Object3D(), stripe: new THREE.Object3D()
  };
  cardParts.chip.add(cardParts.anchors.chip); cardParts.tap.add(cardParts.anchors.tap); cardParts.holo.add(cardParts.anchors.holo); cardParts.stripe.add(cardParts.anchors.stripe);
  cardParts.anchors.holo.position.set(.9, .55, 0); cardParts.anchors.stripe.position.set(-.6, 0, 0);
  // glow halo behind card
  const glowT = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d'); const gr = g.createRadialGradient(256, 160, 10, 256, 160, 256); gr.addColorStop(0, 'rgba(60,152,255,.7)'); gr.addColorStop(.5, 'rgba(63,201,106,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 320); return new THREE.CanvasTexture(c); })();
  cardParts.glow = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2.4, CH * 2.4), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending }));
  cardParts.glow.position.z = -.9; card.add(cardParts.glow);
}
function layoutCard(explode) {
  const e = easeInOut(explode);
  const zf = CD / 2 + .015;
  cardParts.front.position.z = zf + 1.0 * e;
  cardParts.holo.position.z = zf + .5 * e; cardParts.holo.material.opacity = .9 * smooth(.15, .6, e);
  cardParts.chip.position.set(-1.05, .02, zf + .02 + 1.6 * e);
  cardParts.tap.position.set(-.5, .02, zf + .005 + 1.3 * e);
  cardParts.back.position.z = -zf - 1.0 * e;
  cardParts.stripe.position.set(0, .55, -zf - 1.5 * e); cardParts.stripe.material.opacity = smooth(.1, .5, e);
  cardParts.glow.material.opacity = .45 * (1 - .6 * e);
}
layoutCard(0);

/* ---------- TERMINAL (tap chapter) ---------- */
const terminal = new THREE.Group(); world.add(terminal);
let screenCtx, screenTex, screenState = '';
{
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.1, 3.3, .6, 5, .18), new THREE.MeshPhysicalMaterial({ color: 0x1b2b4e, metalness: .5, roughness: .3, clearcoat: .7, clearcoatRoughness: .25, envMapIntensity: 1.4 }));
  terminal.add(body);
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 420; screenCtx = sc.getContext('2d');
  screenTex = new THREE.CanvasTexture(sc); screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.4), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.set(0, .72, .335); terminal.add(screen); terminal.userData.screen = screen;
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.84, 1.54, .04, 3, .06), new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: .6, metalness: .3 })); bezel.position.set(0, .72, .29); terminal.add(bezel);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x2a3b63, roughness: .45, metalness: .35, emissive: 0x0c1a38, emissiveIntensity: .6 });
  const keyGeo = new RoundedBoxGeometry(.42, .28, .08, 2, .05);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const k = new THREE.Mesh(keyGeo, r === 3 && c === 2 ? new THREE.MeshStandardMaterial({ color: 0x3fc96a, emissive: 0x3fc96a, emissiveIntensity: .6 }) : keyMat); k.position.set(-.55 + c * .55, -.42 - r * .36, .31); terminal.add(k); }
  const led = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 12), new THREE.MeshBasicMaterial({ color: 0x3fc96a })); led.position.set(.85, 1.5, .3); terminal.add(led); terminal.userData.led = led;
  // tap ring (ripple) + burst particles
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.9, .02, 8, 64), new THREE.MeshBasicMaterial({ color: 0x62e58a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.set(0, .72, .36); terminal.add(ring); terminal.userData.ring = ring;
  const N = 140; const g = new THREE.BufferGeometry(); const p = new Float32Array(N * 3), v = new Float32Array(N * 3), s = new Float32Array(N);
  for (let i = 0; i < N; i++) { p[i * 3] = 0; p[i * 3 + 1] = .72; p[i * 3 + 2] = .4; const a = Math.random() * Math.PI * 2, r = .6 + Math.random() * 1.6; v[i * 3] = Math.cos(a) * r; v[i * 3 + 1] = 1.2 + Math.random() * 2.4; v[i * 3 + 2] = Math.sin(a) * r * .5 + .5; s[i] = Math.random(); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('vel', new THREE.BufferAttribute(v, 3)); g.setAttribute('seed', new THREE.BufferAttribute(s, 1));
  const burstMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uP: { value: 0 }, uTex: { value: DOT }, uPR: { value: DPR } },
    vertexShader: `attribute vec3 vel; attribute float seed; uniform float uP; uniform float uPR; varying float vA;
      void main(){ float p = clamp(uP*(0.7+0.6*seed),0.,1.); vec3 pos = position + vel*p - vec3(0., 1.6*p*p, 0.); vec4 mv = modelViewMatrix*vec4(pos,1.);
        gl_PointSize = (1.2+seed*1.4)*uPR*(40./-mv.z)*(1.-p*.5); vA = (1.-p)*step(0.001,uP); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D uTex; varying float vA; void main(){ vec4 t=texture2D(uTex,gl_PointCoord); gl_FragColor=vec4(.55,.95,.65,t.a*vA); }` });
  const burst = new THREE.Points(g, burstMat); terminal.add(burst); terminal.userData.burst = burstMat;
  terminal.rotation.x = -.32;
  terminal.position.copy(stagePos(2)).add(new THREE.Vector3(-1.25, -1.05, 0));
}
function drawScreen(state, amount = '$128.40') {
  if (state === screenState) return; screenState = state;
  const g = screenCtx, W = 512, H = 420; g.clearRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1a3a'); bg.addColorStop(1, '#06101f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '600 20px Inter, system-ui'; g.letterSpacing = '3px'; g.textAlign = 'left'; g.fillText('MCCPS  •  TERMINAL', 32, 44);
  g.textAlign = 'right'; g.fillText('12:04', W - 32, 44); g.textAlign = 'center';
  if (state === 'idle') {
    g.fillStyle = '#fff'; g.font = '700 64px Outfit, Inter, system-ui'; g.letterSpacing = '0px'; g.fillText(amount, W / 2, 170);
    g.strokeStyle = '#62e58a'; g.lineWidth = 8; g.lineCap = 'round'; for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(W / 2, 265, 16 * i, -0.75, 0.75); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '600 24px Inter, system-ui'; g.letterSpacing = '4px'; g.fillText('TAP, INSERT OR SWIPE', W / 2, 360);
  } else if (state === 'reading') {
    g.fillStyle = '#fff'; g.font = '700 64px Outfit, Inter, system-ui'; g.fillText(amount, W / 2, 170);
    g.fillStyle = '#3c98ff'; g.font = '600 28px Inter, system-ui'; g.letterSpacing = '4px'; g.fillText('READING…', W / 2, 300);
    g.fillStyle = 'rgba(60,152,255,.35)'; roundRect(g, 96, 330, 320, 10, 5); g.fill(); g.fillStyle = '#3c98ff'; roundRect(g, 96, 330, 210, 10, 5); g.fill();
  } else if (state === 'approved') {
    g.fillStyle = '#3fc96a'; g.beginPath(); g.arc(W / 2, 175, 62, 0, 7); g.fill();
    g.strokeStyle = '#04070f'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(W / 2 - 30, 178); g.lineTo(W / 2 - 8, 200); g.lineTo(W / 2 + 34, 150); g.stroke();
    g.fillStyle = '#fff'; g.font = '700 44px Outfit, Inter, system-ui'; g.letterSpacing = '2px'; g.fillText('APPROVED', W / 2, 290);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '600 24px Inter, system-ui'; g.letterSpacing = '3px'; g.fillText(amount + '  •  0.4s', W / 2, 340);
  } else if (state === 'funded') {
    g.fillStyle = '#fff'; g.font = '700 52px Outfit, Inter, system-ui'; g.letterSpacing = '0px'; g.fillText('FUNDED', W / 2, 170);
    g.fillStyle = '#62e58a'; g.font = '600 26px Inter, system-ui'; g.letterSpacing = '4px'; g.fillText('NEXT BUSINESS DAY', W / 2, 220);
    g.fillStyle = 'rgba(255,255,255,.12)'; roundRect(g, 56, 270, 400, 90, 18); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 22px Inter, system-ui'; g.letterSpacing = '1px'; g.textAlign = 'left'; g.fillText('Deposit', 84, 305); g.fillText('Batch 0419', 84, 338);
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '700 26px Outfit, Inter, system-ui'; g.fillText(amount, W - 84, 306); g.fillStyle = '#62e58a'; g.font = '600 20px Inter, system-ui'; g.fillText('SETTLED', W - 84, 338);
  }
  screenTex.needsUpdate = true;
}
drawScreen('idle');

/* ---------- FLOW (network) ---------- */
const flow = new THREE.Group(); world.add(flow); flow.position.copy(stagePos(3));
const flowNodes = [], flowLabels = [], flowTubes = [];
{
  const defs = [
    { p: [-4.6, -1.0, .4], c: 0x3c98ff, b: 'Terminal', s: 'card present' },
    { p: [-1.7, .5, -.6], c: 0x62e58a, b: 'Gateway', s: 'encrypted' },
    { p: [1.3, -.6, .2], c: 0xc8ffd9, b: 'MCCPS', s: 'processing', big: true },
    { p: [4.5, .7, -.4], c: 0x3c98ff, b: 'Issuing bank', s: 'authorized' }
  ];
  const mk = (d) => {
    const g = new THREE.Group(); g.position.set(...d.p);
    const core = new THREE.Mesh(new THREE.SphereGeometry(d.big ? .34 : .2, 24, 24), new THREE.MeshStandardMaterial({ color: d.c, emissive: d.c, emissiveIntensity: d.big ? 1.2 : .9, roughness: .3, metalness: .2 }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: d.big ? 0x8cf0ad : d.c, transparent: true, opacity: d.big ? .35 : .4, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(d.big ? 1.8 : 1.2);
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(d.big ? .6 : .38, .008, 6, 64), new THREE.MeshBasicMaterial({ color: d.c, transparent: true, opacity: .6 })); ringM.rotation.x = Math.PI / 2.6;
    g.add(core, halo, ringM); g.userData = { ring: ringM, def: d }; g.scale.setScalar(0.0001); flow.add(g); flowNodes.push(g);
    const el = document.createElement('div'); el.className = 'nlabel'; el.innerHTML = `<b>${d.b}</b><small>${d.s}</small>`; labelsEl.appendChild(el); flowLabels.push(el);
    return g;
  };
  defs.forEach(mk);
  const curve = new THREE.CatmullRomCurve3(defs.map(d => new THREE.Vector3(...d.p)), false, 'catmullrom', .4);
  const tubeGeo = new THREE.TubeGeometry(curve, 180, .035, 10, false);
  const tube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ map: stripeTex(), color: 0x8cc8ff, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
  tube.geometry.setDrawRange(0, 0); flow.add(tube); flowTubes.push(tube);
  const glowTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, .09, 8, false), new THREE.MeshBasicMaterial({ color: 0x1e7df0, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }));
  glowTube.geometry.setDrawRange(0, 0); flow.add(glowTube); flowTubes.push(glowTube);
  // bank fan-out
  const banks = ['Wells Fargo', 'WorldPay', 'Deutsche Bank', 'Merrick Bank', 'Harris N.A.', 'Fifth Third'];
  const bankGroup = new THREE.Group(); flow.add(bankGroup); flow.userData.bankGroup = bankGroup;
  banks.forEach((b, i) => {
    const a = Math.PI + (i / (banks.length - 1)) * Math.PI; const p = new THREE.Vector3(1.3 + Math.cos(a) * 3.4, -.6 + Math.sin(a) * 1.9 - .2, -.6 + Math.sin(a * 2) * .3);
    const m = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 16), new THREE.MeshStandardMaterial({ color: 0x9fc5ff, emissive: 0x9fc5ff, emissiveIntensity: .8 })); m.position.copy(p);
    const c2 = new THREE.LineCurve3(new THREE.Vector3(1.3, -.6, .2), p);
    const t2 = new THREE.Mesh(new THREE.TubeGeometry(c2, 2, .012, 6, false), new THREE.MeshBasicMaterial({ color: 0x62e58a, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
    const g = new THREE.Group(); g.add(m, t2); g.scale.setScalar(0.0001); g.userData.i = i; bankGroup.add(g);
    const el = document.createElement('div'); el.className = 'nlabel'; el.innerHTML = `<b>${b}</b>`; el.style.fontSize = '.8rem'; labelsEl.appendChild(el); g.userData.label = el; g.userData.pos = p;
  });
}

/* ---------- FEE STACK (zero chapter) ---------- */
const coins = new THREE.Group(); world.add(coins); coins.position.copy(stagePos(4)).add(new THREE.Vector3(1.9, -2.1, 0));
const COIN_N = 26, coinH = .1;
const coinMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.78, .78, coinH, 48), new THREE.MeshPhysicalMaterial({ color: 0xe8b64a, metalness: .7, roughness: .38, envMapIntensity: 1.0, emissive: 0x7a4f12, emissiveIntensity: .45, clearcoat: .5 }), COIN_N);
coins.add(coinMesh);
const coinTop = new THREE.Mesh(new THREE.RingGeometry(.5, .72, 48), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: .35, side: THREE.DoubleSide })); coinTop.rotation.x = -Math.PI / 2; coins.add(coinTop);
const coinGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xffc060, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false })); coinGlow.scale.setScalar(2.4); coinGlow.position.y = 1.2; coins.add(coinGlow);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function layoutCoins(visibleN, collapse, time) {
  for (let i = 0; i < COIN_N; i++) {
    const inStack = i < visibleN;
    const r = clamp(collapse * visibleN - (visibleN - 1 - i), 0, 1); // top coins go first
    const sc = inStack ? (1 - easeInOut(r)) : 0;
    const wob = Math.sin(time * 1.2 + i * .6) * .02;
    _p.set(wob, i * (coinH + .02) + r * 1.4, Math.cos(time + i) * .01);
    _q.setFromEuler(new THREE.Euler(0, i * .3 + r * 2.5, r * .8));
    _s.set(Math.max(sc, .0001), Math.max(sc, .0001), Math.max(sc, .0001));
    _m.compose(_p, _q, _s); coinMesh.setMatrixAt(i, _m);
  }
  coinMesh.instanceMatrix.needsUpdate = true;
  const topY = Math.max(0, (visibleN * (1 - collapse))) * (coinH + .02);
  coinTop.position.y = topY + .02; coinTop.material.opacity = .35 * (1 - collapse);
  coinGlow.position.y = topY * .5 + .3; coinGlow.material.opacity = .14 * (1 - collapse); coinGlow.scale.setScalar(2.4 * (1 - collapse * .8) + .001); coinTop.visible = collapse < .97;
}

/* ---------- 3D ANALYTICS (insights) ---------- */
const bars = new THREE.Group(); world.add(bars); bars.position.copy(stagePos(5)).add(new THREE.Vector3(-1.4, -1.7, 0));
const BC = 12, BR = 5, BSP = .58;
const barMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(.42, 1, .42, 2, .06), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .4, roughness: .3, clearcoat: .6, envMapIntensity: 1.2 }), BC * BR);
barMesh.geometry.translate(0, .5, 0); bars.add(barMesh);
const barVals = []; const cBlue = new THREE.Color(0x1e7df0), cGreen = new THREE.Color(0x3fc96a), cWhite = new THREE.Color(0xffffff), _c = new THREE.Color();
for (let r = 0; r < BR; r++) for (let c = 0; c < BC; c++) { barVals.push(.35 + .65 * Math.abs(Math.sin(c * .55 + r * .9) * .6 + Math.cos(c * .21 - r) * .4)); }
let hoverBar = -1;
function layoutBars(grow, time) {
  for (let r = 0; r < BR; r++) for (let c = 0; c < BC; c++) {
    const i = r * BC + c; const g = smooth(0, 1, grow * 1.3 - c * .025);
    const h = barVals[i] * 2.6 * g * (1 + Math.sin(time * 1.4 + c * .5 + r) * .03) + .02;
    const hv = hoverBar === i ? 1.12 : 1;
    _p.set((c - (BC - 1) / 2) * BSP, 0, (r - (BR - 1) / 2) * BSP); _q.identity(); _s.set(hv, h, hv); _m.compose(_p, _q, _s); barMesh.setMatrixAt(i, _m);
    _c.copy(cBlue).lerp(cGreen, barVals[i]); if (hoverBar === i) _c.lerp(cWhite, .6); barMesh.setColorAt(i, _c);
  }
  barMesh.instanceMatrix.needsUpdate = true; if (barMesh.instanceColor) barMesh.instanceColor.needsUpdate = true;
}
layoutBars(0, 0);
const barFloor = new THREE.Mesh(new THREE.PlaneGeometry(BC * BSP + 1.2, BR * BSP + 1.2), new THREE.MeshStandardMaterial({ color: 0x0a1430, roughness: .2, metalness: .8, transparent: true, opacity: .8 })); barFloor.rotation.x = -Math.PI / 2; barFloor.position.y = -.01; bars.add(barFloor);

/* ---------- SECURITY SHELL ---------- */
const shell = new THREE.Group(); world.add(shell); shell.position.copy(stagePos(6)).add(new THREE.Vector3(1.6, 0, 0));
{
  const ico = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.55, 1)), new THREE.LineBasicMaterial({ color: 0x3c98ff, transparent: true, opacity: .55 }));
  const ico2 = new THREE.Mesh(new THREE.IcosahedronGeometry(2.55, 1), new THREE.MeshBasicMaterial({ color: 0x1e7df0, transparent: true, opacity: .05, side: THREE.BackSide }));
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(3.0, .012, 8, 120), new THREE.MeshBasicMaterial({ color: 0x62e58a, transparent: true, opacity: .7, blending: THREE.AdditiveBlending }));
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(3.35, .008, 8, 120), new THREE.MeshBasicMaterial({ color: 0x9fc5ff, transparent: true, opacity: .5, blending: THREE.AdditiveBlending })); r2.rotation.x = Math.PI / 2.2;
  const pts = new THREE.Points(new THREE.IcosahedronGeometry(2.55, 1), new THREE.PointsMaterial({ map: DOT, color: 0xffffff, size: .16, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
  shell.add(ico, ico2, r1, r2, pts); shell.userData = { ico, r1, r2, pts }; shell.scale.setScalar(0.0001);
}

/* ---------- AGENT NETWORK ---------- */
const net = new THREE.Group(); world.add(net); net.position.copy(stagePos(7)).add(new THREE.Vector3(-1.4, 0, 0));
const netNodes = []; let netLines;
{
  const N = 46, P = [];
  for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, b = (Math.random() - .5) * Math.PI; const r = 1.3 + Math.random() * 2.1; P.push(new THREE.Vector3(Math.cos(a) * Math.cos(b) * r * 1.05, Math.sin(b) * r * .8, Math.sin(a) * Math.cos(b) * r * .9)); }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(.36, 24, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x62e58a, emissiveIntensity: 1.1, roughness: .3 })); net.add(hub); net.userData.hub = hub;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0x62e58a, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(2.6); net.add(halo);
  const nodeGeo = new THREE.SphereGeometry(.11, 12, 12); const nm = new THREE.MeshStandardMaterial({ color: 0x9fc5ff, emissive: 0x3c98ff, emissiveIntensity: .9 });
  const segs = [];
  P.forEach((p, i) => { const m = new THREE.Mesh(nodeGeo, nm); m.position.copy(p); m.scale.setScalar(0.0001); net.add(m); netNodes.push(m);
    // connect to hub (some) and 2 nearest
    if (i % 3 === 0) segs.push(0, 0, 0, p.x, p.y, p.z);
    const near = P.map((q, j) => ({ j, d: q.distanceTo(p) })).filter(o => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
    near.forEach(o => segs.push(p.x, p.y, p.z, P[o.j].x, P[o.j].y, P[o.j].z));
  });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3));
  netLines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x3c98ff, transparent: true, opacity: .35 })); netLines.geometry.setDrawRange(0, 0); net.add(netLines);
  net.userData.total = segs.length / 3;
}

/* ================================================================== HOTSPOTS (exploded card) */
const HOTSPOTS = [
  { key: 'chip', title: 'EMV chip', text: 'Chip & PIN / chip & signature. Dynamic cryptograms make every transaction unique.' },
  { key: 'tap', title: 'Contactless (NFC)', text: 'Tap to pay, Apple Pay, Google Pay and wearables — no contact, no friction.' },
  { key: 'holo', title: 'Security layer', text: 'Tokenization and end-to-end encryption. PCI compliance handled.', flip: true },
  { key: 'stripe', title: 'Magnetic stripe', text: 'Swipe support for legacy terminals — keep the hardware you own.', flip: true }
];
const hotspotEls = HOTSPOTS.map(h => {
  const el = document.createElement('div'); el.className = 'hotspot' + (h.flip ? ' flip' : ''); el.dataset.key = h.key;
  el.innerHTML = `<div class="hotspot__dot" data-cursor="link" role="button" tabindex="0" aria-label="${h.title}"></div><div class="hotspot__card"><b>${h.title}</b>${h.text}</div>`;
  el.querySelector('.hotspot__dot').addEventListener('click', (e) => { e.stopPropagation(); const on = el.classList.contains('is-open'); hotspotEls.forEach(o => o.classList.remove('is-open')); if (!on) el.classList.add('is-open'); });
  labelsEl.appendChild(el); return el;
});

/* ================================================================== SCROLL MODEL */
const chapterEls = $$('.ch');
chapterEls.forEach(el => { const h = parseFloat(el.dataset.h || 0); if (h > 0) el.style.height = h + 'svh'; });
const chapters = chapterEls.map((el, i) => ({ el, i, key: el.dataset.ch, top: 0, pin: 0, t: 0, copies: $$('.copy', el).map(c => ({ el: c, in: parseFloat(c.dataset.in ?? .06), out: parseFloat(c.dataset.out ?? .94), op: -1 })) }));
function measure() {
  portrait = innerWidth < 960;
  chapters.forEach(c => { const r = c.el.getBoundingClientRect(); c.top = r.top + scrollY; c.pin = Math.max(1, c.el.offsetHeight - innerHeight); });
}
measure();
const state = { scroll: scrollY, smooth: scrollY, active: 0, time: 0 };

/* ---------- tap mode (phones): tap-to-advance story instead of scrolling ---------- */
chapters.forEach(c => { c.beats = c.copies.map(cp => ({ in: Math.max(0, cp.in), hold: Math.min(1, cp.out - .1) })); if (!c.beats.length) c.beats.push({ in: 0, hold: 1 }); });
const TAP_SPEED = 1 / 5.5;                       // chapter-units per second while auto-playing a beat
const tap = { on: false, cur: 0, beat: 0, t: 0, hold: 0 };
const tapnav = $('#tapnav'), tapBar = $('[data-tap-bar]'), tapNextBtn = $('[data-tap-next]'), tapBackBtn = $('[data-tap-back]'), tapHint = $('[data-tap-hint]');
if (tapBar) tapBar.innerHTML = chapters.map(() => '<i></i>').join('');
const tapSegs = tapBar ? Array.from(tapBar.children) : [];
const footerEl = $('.footer'), footerHome = footerEl && footerEl.parentNode, contactEl = chapters[chapters.length - 1].el;
let hintTimer = 0;
function goChapter(k) {
  k = clamp(k, 0, chapters.length - 1);
  const prev = chapters[tap.cur].el;
  tap.cur = k; tap.beat = 0; tap.t = chapters[k].beats[0].in; tap.hold = chapters[k].beats[0].hold;
  if (k === chapters.length - 1) { tap.t = 1; tap.hold = 1; }
  chapterEls.forEach((el, i) => { el.classList.toggle('is-cur', i === k); });
  if (prev !== chapters[k].el) { prev.classList.add('is-leaving'); setTimeout(() => prev.classList.remove('is-leaving'), 900); }
  if (k === chapters.length - 1) contactEl.scrollTop = 0;
  drag.flipped = 0; tapReplay = -1; hotspotEls.forEach(o => o.classList.remove('is-open'));
}
function tapNext() {
  const c = chapters[tap.cur];
  if (tap.t < tap.hold - .03) { tap.t = tap.hold; return; }               // skip to the hold point
  if (tap.beat < c.beats.length - 1) { tap.beat++; tap.hold = c.beats[tap.beat].hold; return; }
  goChapter(tap.cur + 1);
}
function tapBack() {
  const c = chapters[tap.cur];
  if (tap.beat > 0) { tap.beat--; tap.t = c.beats[tap.beat].in; tap.hold = c.beats[tap.beat].hold; return; }
  goChapter(tap.cur - 1);
}
function setTapMode(on) {
  if (on === tap.on) return; tap.on = on;
  document.body.classList.toggle('is-tap', on);
  if (on) {
    document.documentElement.style.overflow = 'hidden'; window.scrollTo(0, 0);
    if (footerEl && contactEl && footerEl.parentNode !== contactEl) contactEl.appendChild(footerEl);
    goChapter(0); clearTimeout(hintTimer); hintTimer = setTimeout(() => tapHint && tapHint.classList.add('is-on'), 1800); setTimeout(() => tapHint && tapHint.classList.remove('is-on'), 7000);
  } else {
    document.documentElement.style.overflow = '';
    if (footerEl && footerHome && footerEl.parentNode !== footerHome) footerHome.appendChild(footerEl);
    chapterEls.forEach(el => el.classList.remove('is-cur', 'is-leaving')); measure();
  }
}
const wantsTap = () => window.matchMedia('(pointer: coarse)').matches || innerWidth < 960;
if (tapNextBtn) tapNextBtn.addEventListener('click', (e) => { e.stopPropagation(); tapNext(); });
if (tapBackBtn) tapBackBtn.addEventListener('click', (e) => { e.stopPropagation(); tapBack(); });
let tp = null;
document.addEventListener('pointerdown', (e) => { tp = { x: e.clientX, y: e.clientY }; }, { passive: true });
document.addEventListener('pointerup', (e) => {
  if (!tap.on || !tp) return; const dx = e.clientX - tp.x, dy = e.clientY - tp.y, moved = Math.hypot(dx, dy); tp = null;
  const ignore = e.target.closest && e.target.closest('a, button, input, select, textarea, label, .hotspot, .calc, .nav, .mobile-menu, .tapnav, form, .ch--flow, .preloader');
  if (moved > 48 && Math.abs(dx) > Math.abs(dy) * 1.3 && tap.cur !== 0) { dx < 0 ? tapNext() : tapBack(); return; }   // swipe (not in hero where drag spins the card)
  if (ignore || moved > 12) return;
  if (e.clientX < innerWidth * .18) tapBack(); else tapNext();
}, { passive: true });
document.addEventListener('keydown', (e) => { if (!tap.on) return; if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); tapNext(); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); tapBack(); } });
window.addEventListener('scroll', () => { state.scroll = scrollY; document.body.classList.toggle('is-scrolled', scrollY > 40); }, { passive: true });

function updateChapters() {
  const s = state.smooth; let active = 0;
  if (tap.on) {
    chapters.forEach((c, i) => { c.t = i < tap.cur ? 1 : i > tap.cur ? 0 : tap.t; });
    active = tap.cur;
    const last = tap.cur === chapters.length - 1, ready = tap.t >= tap.hold - .03;
    tapSegs.forEach((seg, i) => seg.style.setProperty('--p', (i < tap.cur ? 100 : i > tap.cur ? 0 : tap.t * 100).toFixed(1) + '%'));
    if (tapNextBtn) { tapNextBtn.classList.toggle('is-hidden', last); tapNextBtn.classList.toggle('is-ready', ready); tapNextBtn.innerHTML = ready ? 'Continue &#8250;' : 'Skip &#8250;'; }
    if (tapBackBtn) tapBackBtn.classList.toggle('is-hidden', tap.cur === 0 && tap.beat === 0);
    const navEl = $('.nav'); if (navEl) navEl.classList.toggle('is-scrolled', last || tap.cur > 0);
  } else {
    chapters.forEach((c, i) => {
      c.t = c.pin > 1 ? clamp((s - c.top) / c.pin) : clamp((s - c.top + innerHeight * .6) / innerHeight);
      if (s >= c.top - innerHeight * .12) active = i;
    });
  }
  state.active = active;
  // HTML copy opacity driven by local t
  chapters.forEach(c => c.copies.forEach(cp => {
    const t = c.t; const op = (cp.in <= 0 ? 1 : smooth(cp.in, cp.in + .1, t)) * (1 - smooth(cp.out - .1, cp.out, t));
    if (Math.abs(op - cp.op) > .004 || (op === 0 && cp.op !== 0) || (op === 1 && cp.op !== 1)) {
      cp.op = op; const dir = t < (cp.in + cp.out) / 2 ? 1 : -1;
      cp.el.style.opacity = op.toFixed(3); cp.el.style.transform = `translate3d(0, ${((1 - op) * 28 * dir).toFixed(1)}px, 0)`;
      cp.el.classList.toggle('is-live', op > .5);
    }
  }));
  // chapter nav
  chnavLinks.forEach((a, i) => a.classList.toggle('is-active', i === active));
}

/* chapter nav */
const chnavLinks = $$('#chnav a');
chnavLinks.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); if (tap.on) { goChapter(i); return; } const c = chapters[i]; const y = c.pin > 1 ? c.top + c.pin * .08 : c.top - 40; window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }));

/* ================================================================== POINTER / INTERACTION */
const pointer = { x: 0, y: 0, nx: 0, ny: 0, down: false };
const drag = { on: false, x0: 0, y0: 0, moved: 0, vel: 0, rotY: 0, rotX: 0, flipped: 0 };
let tapReplay = -1;
stageEl.style.pointerEvents = 'auto'; stageEl.style.touchAction = 'pan-y';
window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.nx = (e.clientX / innerWidth - .5) * 2; pointer.ny = (e.clientY / innerHeight - .5) * 2; if (drag.on) { const dx = e.clientX - drag.x0; drag.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); drag.vel = (e.movementX || 0) * .012; drag.rotY += drag.vel; drag.rotX += (e.movementY || 0) * .004; drag.rotX = clamp(drag.rotX, -.6, .6); } }, { passive: true });
stageEl.addEventListener('pointerdown', (e) => { if (state.active !== 0) return; drag.on = true; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.moved = 0; drag.vel = 0; pointer.down = true; stageEl.setPointerCapture && stageEl.setPointerCapture(e.pointerId); });
window.addEventListener('pointerup', () => { if (drag.on && drag.moved < 6) { drag.flipped = drag.flipped ? 0 : 1; } drag.on = false; pointer.down = false; });
window.addEventListener('pointercancel', () => { drag.on = false; pointer.down = false; });
$$('[data-replay]').forEach(b => b.addEventListener('click', () => { tapReplay = state.time; }));

/* savings calculator */
const volInput = $('[data-vol]'); let volume = 25000;
const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
function updateCalc() {
  volume = parseFloat(volInput.value); const p = (volume - 5000) / (250000 - 5000) * 100; volInput.style.setProperty('--p', p + '%');
  $('[data-vol-out]').textContent = fmt(volume); $('[data-fee-now]').textContent = fmt(volume * .032); $('[data-fee-year]').textContent = fmt(volume * .032 * 12);
}
if (volInput) { volInput.addEventListener('input', updateCalc); updateCalc(); }
const zeroCounter = $('[data-zero-counter]'), zeroPct = $('[data-zero-pct]');

/* bar hover (raycast) */
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); const barTip = $('[data-bar-tip]');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']; const SERIES = ['Card present', 'Online', 'Mobile', 'Recurring', 'B2B'];

/* custom cursor */
let cur;
if (fine) {
  cur = document.createElement('div'); cur.className = 'cur'; cur.innerHTML = '<div class="cur__ring"></div><div class="cur__dot"></div>'; document.body.appendChild(cur);
  let cx = innerWidth / 2, cy = innerHeight / 2;
  document.addEventListener('pointerover', (e) => { const t = e.target.closest && e.target.closest('a, button, [data-cursor], input, label, summary'); cur.classList.toggle('is-link', !!t); });
  (function loop() { cx += (pointer.x - cx) * .22; cy += (pointer.y - cy) * .22; cur.style.transform = `translate(${cx}px, ${cy}px)`; const dot = cur.firstElementChild.nextElementSibling; dot.style.transform = `translate(${pointer.x - cx - 3}px, ${pointer.y - cy - 3}px)`; cur.classList.toggle('is-down', pointer.down); requestAnimationFrame(loop); })();
}

/* ================================================================== CAMERA / CARD TARGETS */
const camTarget = { pos: new THREE.Vector3(0, .2, 8.6), look: new THREE.Vector3(0, 0, 0) };
const camLook = new THREE.Vector3(0, 0, 0);
const cardTarget = { pos: new THREE.Vector3(), rot: new THREE.Euler(), scale: 1, explode: 0, autoFloat: 1 };
let cardScale = 1, cardExplode = 0;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* per-chapter camera + card logic. t = local progress, tm = time */
/* world-x offset (from the look point) that lands at screen fraction `frac` for a camera `dist` away */
const offAt = (frac, dist) => (frac - .5) * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist * camera.aspect;
function stageTargets(k, t, tm) {
  const S = stagePos(k); const P = portrait;
  const camFrom = V(0, .2, 8.6), camTo = V(0, .2, 8.6), look = V(0, 0, 0);
  let cpos = V(0, 0, 0), crot = new THREE.Euler(0, 0, 0), cscale = 1, cexp = 0, auto = 1;
  switch (k) {
    case 0: // hero — card right (desktop) / top (phone)
      camFrom.set(0, .15, 8.8); camTo.set(0, .1, 8.2); look.set(0, P ? -.3 : -.1, 0);
      cpos.set(P ? 0 : offAt(.78, 8.5), P ? 2.15 : .1, 0); crot.set(.12 + drag.rotX, -.35 + drag.rotY + drag.flipped * Math.PI, 0); cscale = P ? .82 : 1; auto = 1;
      break;
    case 1: // exploded view
      camFrom.set(0, .3, 7.6); camTo.set(.2, .2, 6.8); look.set(0, P ? -.4 : 0, 0);
      cpos.set(P ? 0 : offAt(.72, 7.2), P ? 1.1 : 0, 0); crot.set(.28, .62 + Math.sin(tm * .3) * .05, -.08); cscale = P ? .76 : .82; cexp = smooth(.12, .5, t) * (1 - smooth(.78, .96, t)); auto = 0;
      break;
    case 2: { // tap on terminal
      const tx = terminal.position.x, ty = terminal.position.y;
      camFrom.set(-.4, 1.7, 10.2); camTo.set(-.7, 1.3, 9.2); look.set(P ? 0 : tx - offAt(.32, 9.7), P ? ty - .1 : -.1, 0);
      const tt = tapReplay >= 0 ? easeOut((tm - tapReplay) / 2.4) : t; // replay overrides scroll
      const scr = terminal.userData.screen.getWorldPosition(new THREE.Vector3()).sub(S);
      const n = V(0, Math.sin(.32), Math.cos(.32)), up = V(0, Math.cos(.32), -Math.sin(.32));
      const A = V(tx - 2.8, ty + 4.2, 2.4), B = scr.clone().addScaledVector(n, 1.4).addScaledVector(up, .5), C = scr.clone().addScaledVector(n, .4).addScaledVector(up, .22), D = V(tx - 2.4, ty + 4.4, 1.4);
      const RX = -.32 - .55;
      if (tt < .3) { const u = easeInOut(tt / .3); cpos.lerpVectors(A, B, u); crot.set(lerp(.1, RX, u), lerp(-.55, .06, u), lerp(.1, 0, u)); }
      else if (tt < .45) { const u = easeInOut((tt - .3) / .15); cpos.lerpVectors(B, C, u); crot.set(lerp(RX, -.32 - .2, u), .06, 0); }
      else if (tt < .8) { cpos.copy(C).add(V(0, Math.sin(tm * 2) * .012, 0)); crot.set(-.32 - .2, .06, 0); }
      else { const u = easeInOut((tt - .8) / .2); cpos.lerpVectors(C, D, u); crot.set(lerp(-.52, -.2, u), lerp(.06, .5, u), 0); }
      cscale = P ? .74 : .72; auto = 0;
      // terminal feedback
      drawScreen(tt < .3 ? 'idle' : tt < .45 ? 'reading' : tt < .75 ? 'approved' : 'funded');
      const rp = smooth(.45, .75, tt); terminal.userData.ring.scale.setScalar(.2 + rp * 1.6); terminal.userData.ring.material.opacity = (1 - rp) * .9 * (tt > .45 ? 1 : 0);
      terminal.userData.burst.uniforms.uP.value = smooth(.47, .95, tt);
      terminal.userData.led.material.color.set(tt < .45 ? 0x3c98ff : 0x3fc96a);
      if (tapReplay >= 0 && tm - tapReplay > 2.6) tapReplay = -1;
      break; }
    case 3: // flow network
      camFrom.set(0, .6, 10.8); camTo.set(0, .2, 9.8); look.set(0, P ? -1.9 : -2.0, 0);
      cpos.set(0, -6, -4); cscale = .0001; auto = 0;
      break;
    case 4: // zero fees
      camFrom.set(1.0, .6, 8.8); camTo.set(1.4, .3, 8.0); look.set(P ? 0 : coins.position.x - offAt(.66, 8.4), P ? -2.2 : -.5, 0);
      cpos.set(0, -6, -4); cscale = .0001;
      break;
    case 5: // insights
      camFrom.set(-3.0, 3.0, 8.6); camTo.set(-2.4, 2.5, 7.8); look.set(P ? 0 : bars.position.x - offAt(.3, 8.2), P ? -1.9 : -.9, 0);
      cpos.set(0, -6, -4); cscale = .0001;
      break;
    case 6: // security shell around card
      camFrom.set(.2, .3, 8.2); camTo.set(.4, .2, 7.4); look.set(P ? 0 : shell.position.x - offAt(.73, 7.8), P ? -.5 : 0, 0);
      cpos.set(P ? 0 : shell.position.x, P ? 1.0 : 0, 0); crot.set(.15, tm * .35, 0); cscale = P ? .68 : .58; auto = 0;
      break;
    case 7: // agents network
      camFrom.set(0, .4, 9.8); camTo.set(-.3, .2, 8.8); look.set(P ? 0 : net.position.x - offAt(.32, 9.3), P ? -1.4 : 0, 0);
      cpos.set(0, -6, -4); cscale = .0001;
      break;
    default: // contact — card dim behind
      camFrom.set(0, .1, 8.4); camTo.set(0, 0, 8); look.set(0, -.2, 0);
      cpos.set(P ? 0 : 1.8, -.2, -2.5); crot.set(.2, tm * .2, 0); cscale = .7; auto = 0;
  }
  if (P) { camFrom.z += 1.8; camTo.z += 1.8; camFrom.x = 0; camTo.x = 0; }
  const cp = camFrom.clone().lerp(camTo, t);
  camTarget.pos.copy(S).add(cp); camTarget.look.copy(S).add(look);
  cardTarget.pos.copy(S).add(cpos); cardTarget.rot.copy(crot); cardTarget.scale = cscale; cardTarget.explode = cexp; cardTarget.autoFloat = auto;
}

/* ================================================================== RESIZE */
function layoutStages() {
  const P = portrait, sx = P ? .88 : 1;
  terminal.position.copy(stagePos(2)).add(new THREE.Vector3(P ? 0 : -2.2, P ? .35 : -1.35, 0)); terminal.scale.setScalar(P ? .95 : .92);
  coins.position.copy(stagePos(4)).add(new THREE.Vector3(P ? 0 : 2.7, P ? -1.2 : -2.2, 0)); coins.scale.setScalar(sx);
  bars.position.copy(stagePos(5)).add(new THREE.Vector3(P ? 0 : -3.1, P ? -.9 : -1.6, 0)); bars.scale.setScalar(P ? .72 : .56);
  shell.position.copy(stagePos(6)).add(new THREE.Vector3(P ? 0 : 3.1, P ? 1.0 : 0, 0));
  net.position.copy(stagePos(7)).add(new THREE.Vector3(P ? 0 : -2.9, P ? .4 : 0, 0)); net.scale.setScalar(P ? .82 : .85);
  flow.scale.setScalar(P ? .62 : .95); flow.position.copy(stagePos(3)).add(new THREE.Vector3(0, P ? .4 : -2.7, 0));
}
function resize() {
  measure(); layoutStages(); setTapMode(wantsTap());
  camera.aspect = innerWidth / innerHeight; camera.fov = portrait ? 62 : 40; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth, innerHeight);
}
layoutStages(); setTapMode(wantsTap());
let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 100); });

/* ================================================================== PROJECT HELPERS */
const _v = new THREE.Vector3();
function project(obj, el, offset) {
  obj.getWorldPosition(_v); if (offset) _v.add(offset); _v.project(camera);
  const vis = _v.z < 1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.2;
  if (vis) el.style.transform = `translate(${((_v.x * .5 + .5) * innerWidth).toFixed(1)}px, ${((-_v.y * .5 + .5) * innerHeight).toFixed(1)}px) translate(-50%,-50%)`;
  return vis;
}

/* ================================================================== LOOP */
const clock = new THREE.Clock(); let frames = 0; let hidden = false;
document.addEventListener('visibilitychange', () => { hidden = document.hidden; });
const camPos = camera.position.clone();

function tick() {
  requestAnimationFrame(tick);
  if (hidden) return;
  const dt = Math.min(clock.getDelta(), .05); state.time += dt; const tm = state.time;
  state.smooth = reduce ? state.scroll : lerp(state.smooth, state.scroll, damp(9, dt));
  if (Math.abs(state.smooth - state.scroll) < .3) state.smooth = state.scroll;
  if (tap.on && tap.t < tap.hold) tap.t = Math.min(tap.hold, tap.t + dt * TAP_SPEED * (reduce ? 4 : 1));
  updateChapters();

  const k = state.active, c = chapters[k];
  stageTargets(k, c.t, tm);

  /* camera */
  const parX = pointer.nx * (portrait ? 0 : .25), parY = -pointer.ny * (portrait ? 0 : .15);
  camPos.lerp(camTarget.pos, damp(3.2, dt));
  camera.position.set(camPos.x + parX, camPos.y + parY, camPos.z);
  camLook.lerp(camTarget.look, damp(3.2, dt)); camera.lookAt(camLook);
  key.position.set(camera.position.x - 5, camera.position.y + 4, camera.position.z - 2);
  fill.position.set(camera.position.x + 5, camera.position.y - 2, camera.position.z - 3);
  rim.position.set(camera.position.x, camera.position.y + 5, camera.position.z - 12);

  /* card */
  card.position.lerp(cardTarget.pos, damp(4, dt));
  cardScale = lerp(cardScale, cardTarget.scale, damp(4, dt)); card.scale.setScalar(Math.max(cardScale, .0001)); card.visible = cardScale > .01;
  cardExplode = lerp(cardExplode, cardTarget.explode, damp(5, dt)); layoutCard(cardExplode);
  const fl = cardTarget.autoFloat && !reduce ? 1 : 0;
  const rx = cardTarget.rot.x + fl * Math.sin(tm * .6) * .06, ry = cardTarget.rot.y + fl * Math.sin(tm * .45) * .22, rz = cardTarget.rot.z + fl * Math.sin(tm * .3) * .03;
  card.rotation.x = lerp(card.rotation.x, rx, damp(5, dt)); card.rotation.y = lerp(card.rotation.y, ry, damp(5, dt)); card.rotation.z = lerp(card.rotation.z, rz, damp(5, dt));
  card.position.y += fl * Math.sin(tm * .8) * .003;
  if (!drag.on) { drag.rotY += drag.vel; drag.vel *= .94; }
  stageEl.classList.toggle('is-grab', k === 0 && fine);
  if (cur) cur.classList.toggle('is-grab', k === 0 && !cur.classList.contains('is-link') && pointer.y > 0);

  /* hotspots (explode chapter) */
  const hsOn = cardExplode > .55 && k === 1;
  hotspotEls.forEach(el => { const a = cardParts.anchors[el.dataset.key]; const vis = project(a, el); el.classList.toggle('is-on', hsOn && vis); if (!hsOn) el.classList.remove('is-open'); });

  /* terminal idle pulse */
  if (k !== 2) { terminal.userData.ring.material.opacity = 0; terminal.userData.burst.uniforms.uP.value = 0; drawScreen('idle'); }

  /* flow */
  { const t = chapters[3].t; const draw = smooth(.02, .5, t);
    flowTubes.forEach(tb => { const n = tb.geometry.index.count; tb.geometry.setDrawRange(0, Math.floor(n * draw)); tb.material.map && (tb.material.map.offset.x -= dt * .9); });
    flowNodes.forEach((n, i) => { const a = smooth(.02 + i * .12, .12 + i * .12, t); n.scale.setScalar(Math.max(a, .0001)); n.userData.ring.rotation.z += dt * .6; n.position.y = n.userData.def.p[1] + Math.sin(tm * .9 + i) * .06;
      const vis = project(n, flowLabels[i], V(0, -.75, 0)); flowLabels[i].classList.toggle('is-on', a > .8 && vis && k === 3); });
    const bg = flow.userData.bankGroup; const bt = smooth(.55, .8, t);
    bg.children.forEach(g => { const a = smooth(g.userData.i * .1, .4 + g.userData.i * .1, bt); g.scale.setScalar(Math.max(a, .0001)); const vis = project(g.children[0], g.userData.label, V(0, -.34, 0)); g.userData.label.classList.toggle('is-on', a > .9 && vis && k === 3 && !portrait); });
    bg.rotation.z = Math.sin(tm * .25) * .08; }

  /* coins */
  { const t = chapters[4].t; const base = Math.round(11 + 15 * (volume - 5000) / 245000); const collapse = smooth(.42, .82, t);
    layoutCoins(base, collapse, tm); coins.rotation.y = tm * .25 + pointer.nx * .2;
    const pct = 3.2 * (1 - easeInOut(collapse)); if (zeroPct) zeroPct.textContent = pct < .05 ? '0' : pct.toFixed(1);
    if (zeroCounter) zeroCounter.classList.toggle('is-on', k === 4 && t > .04 && t < .98); }

  /* bars */
  { const t = chapters[5].t; layoutBars(smooth(.03, .55, t), tm);
    if (k === 5 && fine) { ndc.set(pointer.nx, -pointer.ny); ray.setFromCamera(ndc, camera); const hit = ray.intersectObject(barMesh, false)[0];
      const id = hit ? hit.instanceId : -1; if (id !== hoverBar) { hoverBar = id; if (barTip) { if (id >= 0) { const r = Math.floor(id / BC), cc = id % BC; barTip.innerHTML = `<small>${SERIES[r]} · ${DAYS[cc]}</small>${fmt(barVals[id] * 4820)}`; barTip.classList.add('is-on'); } else barTip.classList.remove('is-on'); } }
      if (hit && barTip) barTip.style.transform = `translate(${pointer.x}px, ${pointer.y - 18}px) translate(-50%,-100%)`;
      stageEl.classList.toggle('is-hover', true); } else if (hoverBar !== -1) { hoverBar = -1; barTip && barTip.classList.remove('is-on'); } }

  /* shell */
  { const t = chapters[6].t; const a = smooth(.02, .4, t) * (1 - smooth(.9, 1, t)); shell.scale.setScalar(Math.max(a * (portrait ? .78 : .68), .0001)); shell.visible = a > .002;
    shell.userData.ico.rotation.y = tm * .15 + pointer.nx * .3; shell.userData.ico.rotation.x = pointer.ny * .2; shell.userData.pts.rotation.copy(shell.userData.ico.rotation);
    shell.userData.r1.rotation.x = tm * .3; shell.userData.r1.rotation.y = tm * .2; shell.userData.r2.rotation.z = tm * .25; }

  /* network */
  { const t = chapters[7].t; const g = smooth(.02, .6, t); netLines.geometry.setDrawRange(0, Math.floor(net.userData.total * g)); net.visible = g > .001 || k >= 6;
    netNodes.forEach((n, i) => { const a = smooth(i / netNodes.length * .6, i / netNodes.length * .6 + .25, g); n.scale.setScalar(Math.max(a, .0001)); });
    net.rotation.y = tm * .08 + pointer.nx * .25; net.userData.hub.scale.setScalar(1 + Math.sin(tm * 2) * .05); }

  /* ambient */
  scene.userData.particles.uniforms.uTime.value = tm;
  bloom.strength = .45 + .25 * (k === 2 || k === 6 ? 1 : 0);

  composer.render();
  frames++;
  if (frames === 2) { stageEl.classList.add('is-ready'); setLoad(1); finishLoad(); }
}

/* ================================================================== PRELOAD → START */
let loadStart = performance.now(); let finished = false;
function finishLoad() {
  if (finished) return; finished = true;
  const wait = Math.max(0, 900 - (performance.now() - loadStart));
  setTimeout(() => { preloader.classList.add('is-done'); document.body.classList.add('is-intro'); }, wait);
}
document.fonts && document.fonts.ready.then(() => setLoad(.7));
// fake progress while compiling
const fake = setInterval(() => { if (loadProgress < .9) setLoad(loadProgress + .04); else clearInterval(fake); }, 120);

if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(() => { setLoad(.95); tick(); }, () => tick()); else tick();
