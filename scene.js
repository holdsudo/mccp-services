/* MCCPS hero scene — three.js (vendored). Floating payment card + orbit rings + particle field. */
import * as THREE from './assets/vendor/three.module.min.js';

const host = document.querySelector('[data-scene]');
// defer until after first paint so hero copy animates in immediately
if (host) { if ('requestIdleCallback' in window) requestIdleCallback(() => init(host), { timeout: 400 }); else setTimeout(() => init(host), 60); }

function init(host) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const small = window.innerWidth < 760;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.75 : 2));
  renderer.setSize(host.clientWidth, host.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04070f, 0.045);

  const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 100);
  camera.position.set(0, 0.4, 9.5);

  // ---------- environment (cheap PMREM from a synthetic room) ----------
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(buildEnvScene(), 0.04).texture;
  pmrem.dispose();

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x8fb8ff, 0x050a18, 0.55));
  const key = new THREE.PointLight(0x3c98ff, 60, 30, 2); key.position.set(-5, 4, 5); scene.add(key);
  const fill = new THREE.PointLight(0x3fc96a, 40, 30, 2); fill.position.set(5, -2, 4); scene.add(fill);
  const rim = new THREE.PointLight(0xffffff, 25, 30, 2); rim.position.set(0, 5, -5); scene.add(rim);

  // ---------- groups ----------
  const world = new THREE.Group(); scene.add(world);
  const cardGroup = new THREE.Group(); world.add(cardGroup);

  // ---------- card ----------
  const CW = 3.4, CH = 2.15, CD = 0.07, CR = 0.18;
  const shape = roundedRect(CW, CH, CR);
  const extrude = new THREE.ExtrudeGeometry(shape, { depth: CD, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 24 });
  extrude.center();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d3f8f, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12,
    envMapIntensity: 1.2
  });
  const body = new THREE.Mesh(extrude, bodyMat);
  cardGroup.add(body);

  const frontTex = makeCardTexture('front');
  const backTex = makeCardTexture('back');
  const faceMatFront = new THREE.MeshPhysicalMaterial({ map: frontTex, emissive: 0xffffff, emissiveMap: frontTex, emissiveIntensity: 0.42, metalness: 0.3, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.4, transparent: true });
  const faceMatBack = new THREE.MeshPhysicalMaterial({ map: backTex, emissive: 0xffffff, emissiveMap: backTex, emissiveIntensity: 0.3, metalness: 0.3, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 1.1, transparent: true });
  const faceGeo = new THREE.PlaneGeometry(CW - 0.02, CH - 0.02);
  const front = new THREE.Mesh(faceGeo, faceMatFront); front.position.z = CD / 2 + 0.013 + 0.002; cardGroup.add(front);
  const back = new THREE.Mesh(faceGeo, faceMatBack); back.position.z = -(CD / 2 + 0.013 + 0.002); back.rotation.y = Math.PI; cardGroup.add(back);

  // soft glow plane behind card
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(CW * 2.2, CH * 2.2),
    new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  glow.position.z = -0.8; world.add(glow);

  // ---------- orbit rings ----------
  const rings = [];
  const ringDefs = [
    { r: 2.9, tube: 0.012, color: 0x3c98ff, tilt: [Math.PI / 2.3, 0.3, 0], speed: 0.12 },
    { r: 3.6, tube: 0.008, color: 0x62e58a, tilt: [Math.PI / 1.8, -0.5, 0.2], speed: -0.08 },
    { r: 4.4, tube: 0.006, color: 0x9fc5ff, tilt: [Math.PI / 2.6, 0.9, -0.3], speed: 0.05 }
  ];
  for (const d of ringDefs) {
    const geo = new THREE.TorusGeometry(d.r, d.tube, 8, 160);
    const mat = new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(geo, mat); m.rotation.set(...d.tilt); m.userData.speed = d.speed; world.add(m); rings.push(m);
    // travelling spark on ring
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: d.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    spark.scale.setScalar(0.28); m.add(spark); m.userData.spark = spark; m.userData.phase = Math.random() * Math.PI * 2;
  }

  // ---------- particles ----------
  const COUNT = reduceMotion ? 250 : (small ? 420 : 900);
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3), seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const r = 4 + Math.random() * 9, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = (r * Math.sin(ph) * Math.sin(th)) * 0.6;
    pos[i * 3 + 2] = r * Math.cos(ph) - 3;
    seeds[i] = Math.random();
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uTex: { value: dotTexture() } },
    vertexShader: `
      attribute float seed; uniform float uTime; uniform float uPR; varying float vA; varying float vSeed;
      void main(){
        vec3 p = position;
        p.y += sin(uTime*0.35 + seed*6.283)*0.35;
        p.x += cos(uTime*0.25 + seed*6.283)*0.25;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        float s = (0.6 + seed*1.2);
        gl_PointSize = s * uPR * (34.0 / -mv.z);
        vA = 0.25 + 0.75*abs(sin(uTime*0.6 + seed*20.0)); vSeed = seed;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; varying float vA; varying float vSeed;
      void main(){
        vec4 t = texture2D(uTex, gl_PointCoord);
        vec3 c = mix(vec3(0.35,0.62,1.0), vec3(0.45,0.9,0.6), step(0.7, vSeed));
        gl_FragColor = vec4(c, t.a * vA * 0.55);
      }`
  });
  const points = new THREE.Points(pGeo, pMat); scene.add(points);

  // ---------- grid floor ----------
  const grid = new THREE.GridHelper(60, 60, 0x1e7df0, 0x1e7df0);
  grid.material.transparent = true; grid.material.opacity = 0.08; grid.material.depthWrite = false;
  grid.position.y = -3.2; grid.position.z = -4; scene.add(grid);

  // ---------- interaction ----------
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  let scrollT = 0;
  if (!isTouch) {
    window.addEventListener('pointermove', (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  window.addEventListener('scroll', () => { scrollT = Math.min(window.scrollY / Math.max(1, window.innerHeight), 1.5); }, { passive: true });

  // layout: on wide screens shift card toward the right column
  function layout() {
    const w = host.clientWidth, h = host.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    pMat.uniforms.uPR.value = renderer.getPixelRatio();
    const wide = w >= 960;
    // visible half-width of the view plane at z=0 (camera at z=9.5, fov 38)
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 9.5 * camera.aspect;
    const s = wide ? 0.92 * Math.min(1, h / 900, w / 1300) : Math.min(1, w / 620) * 0.95;
    world.scale.setScalar(s);
    // keep the card's right edge (half card width ~1.8 * s + ring) inside the viewport
    world.position.x = wide ? Math.min(2.7, halfW - 2.1 * s - 0.2) : 0;
    // phone: card centred ~27% from the top of the first viewport (above the headline)
    world.position.y = wide ? 1.35 : 1.55;
  }
  layout();
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(layout, 120); });

  // ---------- visibility gating ----------
  let running = true, inView = true;
  const io = new IntersectionObserver((en) => { inView = en[0].isIntersecting; }, { threshold: 0.02 });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let frames = 0;
  function tick() {
    requestAnimationFrame(tick);
    if (!running || !inView) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05) || 0.016;

    cur.x += (target.x - cur.x) * 0.06;
    cur.y += (target.y - cur.y) * 0.06;

    const auto = reduceMotion ? 0 : t;
    cardGroup.rotation.y = Math.sin(auto * 0.45) * 0.55 + cur.x * 0.45 + scrollT * 0.9;
    cardGroup.rotation.x = Math.sin(auto * 0.3) * 0.12 - cur.y * 0.25 + scrollT * 0.25;
    cardGroup.rotation.z = Math.sin(auto * 0.2) * 0.05;
    cardGroup.position.y = Math.sin(auto * 0.8) * 0.12 - scrollT * 1.1;

    glow.position.x = cardGroup.position.x; glow.position.y = cardGroup.position.y;
    glow.material.opacity = 0.45 + Math.sin(t * 1.2) * 0.08;

    for (const r of rings) {
      r.rotation.z += r.userData.speed * 0.01 * (reduceMotion ? 0 : 1);
      const a = t * 0.9 + r.userData.phase, rr = r.geometry.parameters.radius;
      r.userData.spark.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0);
    }
    world.rotation.y = cur.x * 0.12; world.rotation.x = -cur.y * 0.08;
    points.rotation.y = t * 0.015;
    pMat.uniforms.uTime.value = t;
    camera.position.y = 0.4 - scrollT * 0.6;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    frames++;
    if (frames === 2) host.classList.add('is-ready');
  }
  const start = () => { if (reduceMotion) { renderer.render(scene, camera); host.classList.add('is-ready'); } tick(); };
  // compile shaders off the critical path where supported (KHR_parallel_shader_compile)
  if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(start, start); else start();
}

/* ---------------- helpers ---------------- */
function roundedRect(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function makeCardTexture(side) {
  const W = 1024, H = 648; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  // base gradient
  const grad = g.createLinearGradient(0, 0, W, H);
  if (side === 'front') { grad.addColorStop(0, '#0a3d8f'); grad.addColorStop(0.45, '#1e7df0'); grad.addColorStop(1, '#2fb35c'); }
  else { grad.addColorStop(0, '#0b1a3a'); grad.addColorStop(1, '#123f7a'); }
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // holographic swoosh
  g.save(); g.globalAlpha = 0.22; g.strokeStyle = '#ffffff'; g.lineWidth = 160; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-100, H * 0.85); g.quadraticCurveTo(W * 0.5, H * 0.1, W + 120, H * 0.55); g.stroke(); g.restore();
  g.save(); g.globalAlpha = 0.12; g.strokeStyle = '#9ff7c0'; g.lineWidth = 60; g.beginPath(); g.moveTo(-100, H * 0.95); g.quadraticCurveTo(W * 0.55, H * 0.25, W + 120, H * 0.7); g.stroke(); g.restore();
  // fine dot pattern
  g.save(); g.globalAlpha = 0.08; g.fillStyle = '#fff';
  for (let y = 20; y < H; y += 28) for (let x = 20; x < W; x += 28) { g.beginPath(); g.arc(x, y, 1.4, 0, 7); g.fill(); }
  g.restore();

  if (side === 'front') {
    // chip
    roundRect(g, 92, 230, 128, 96, 14); const cg = g.createLinearGradient(92, 230, 220, 326); cg.addColorStop(0, '#f4dd8d'); cg.addColorStop(1, '#b9892b'); g.fillStyle = cg; g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(92, 278); g.lineTo(220, 278); g.moveTo(135, 230); g.lineTo(135, 326); g.moveTo(178, 230); g.lineTo(178, 326); g.stroke();
    // contactless
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 6; g.lineCap = 'round';
    for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(262, 278, 14 * i, -0.7, 0.7); g.stroke(); }
    // wordmark
    g.fillStyle = '#fff'; g.font = '700 92px Outfit, Inter, system-ui, sans-serif'; g.textBaseline = 'alphabetic';
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; g.fillText('MCCPS', 88, 150); g.shadowBlur = 0;
    g.font = '600 22px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.letterSpacing = '4px';
    g.fillText('MERCHANT CREDIT CARD PROCESSING SERVICES', 92, 186);
    // number
    g.font = '500 54px "Courier New", ui-monospace, monospace'; g.fillStyle = 'rgba(255,255,255,.95)'; g.letterSpacing = '6px';
    g.fillText('••••  ••••  ••••  6227', 92, 450);
    g.font = '600 22px Inter, system-ui, sans-serif'; g.letterSpacing = '2px'; g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillText('ZERO PROCESSING FEES', 92, 540); g.fillText('NEXT DAY FUNDING', 92, 575);
    // lock / secure mark
    g.textAlign = 'right'; g.font = '700 30px Outfit, Inter, system-ui, sans-serif'; g.fillStyle = '#fff'; g.letterSpacing = '1px';
    g.fillText('PCI', W - 92, 560); g.font = '500 18px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('COMPLIANT', W - 92, 585);
  } else {
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 90, W, 96);
    g.fillStyle = 'rgba(255,255,255,.9)'; roundRect(g, 92, 250, 620, 70, 8); g.fill();
    g.fillStyle = '#0b1a3a'; g.font = '500 34px "Courier New", ui-monospace, monospace'; g.textBaseline = 'middle'; g.letterSpacing = '4px'; g.fillText('844 826 6227', 110, 285);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '500 20px Inter, system-ui, sans-serif'; g.textBaseline = 'alphabetic'; g.letterSpacing = '2px';
    g.fillText('SECURE • ENCRYPTED • 24/7 SUPPORT', 92, 400);
    g.font = '700 40px Outfit, Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.9)'; g.letterSpacing = '0px'; g.fillText('MCCPS', 92, 560);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 160, 10, 256, 160, 256); gr.addColorStop(0, 'rgba(60,152,255,.75)'); gr.addColorStop(.5, 'rgba(63,201,106,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 320); return new THREE.CanvasTexture(c);
}
function buildEnvScene() {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0a1430, side: THREE.BackSide }));
  s.add(room);
  const mk = (w, h, color, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); s.add(m); };
  mk(14, 4, 0x9fc8ff, [0, 8, -6], [Math.PI / 3, 0, 0]);
  mk(6, 10, 0x3c98ff, [-12, 0, 0], [0, Math.PI / 2, 0]);
  mk(6, 10, 0x62e58a, [12, 0, 0], [0, -Math.PI / 2, 0]);
  mk(16, 3, 0xffffff, [0, -7, 4], [-Math.PI / 2.5, 0, 0]);
  return s;
}
