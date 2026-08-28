import * as THREE from 'three';

// Hero background: a drifting point-cloud "constellation" that reacts to the
// pointer and slowly rotates. Cheap enough to hold 60fps on integrated GPUs.
export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene  = new THREE.Scene();
  scene.fog    = new THREE.FogExp2(0x05060a, 0.055);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100);
  camera.position.z = 15;

  // ── point cloud ─────────────────────────────────────────────────────────
  const COUNT = 2600;
  const pos   = new Float32Array(COUNT * 3);
  const col   = new Float32Array(COUNT * 3);
  const seed  = new Float32Array(COUNT);
  const palette = [new THREE.Color(0x38e8c8), new THREE.Color(0x7c8cff), new THREE.Color(0xf0a848)];

  for (let i = 0; i < COUNT; i++) {
    // shell distribution -> hollow-ish sphere reads better than a solid blob
    const r = 7 + Math.random() * 9;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(ph) * Math.cos(th);
    pos[i*3+1] = r * Math.sin(ph) * Math.sin(th) * 0.62;
    pos[i*3+2] = r * Math.cos(ph);
    const c = palette[(Math.random() * palette.length) | 0].clone().multiplyScalar(0.55 + Math.random() * 0.45);
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    seed[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  const base = pos.slice();

  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.075, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(points);

  // ── connective filaments ────────────────────────────────────────────────
  const lineVerts = [];
  for (let i = 0; i < 190; i++) {
    const a = (Math.random() * COUNT) | 0;
    const b = (Math.random() * COUNT) | 0;
    const dx = base[a*3]-base[b*3], dy = base[a*3+1]-base[b*3+1], dz = base[a*3+2]-base[b*3+2];
    if (dx*dx + dy*dy + dz*dz < 22) {
      lineVerts.push(base[a*3],base[a*3+1],base[a*3+2], base[b*3],base[b*3+1],base[b*3+2]);
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    color: 0x38e8c8, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(lines);

  // ── interaction ─────────────────────────────────────────────────────────
  const mouse = { x:0, y:0 }, target = { x:0, y:0 };
  addEventListener('pointermove', e => {
    target.x = (e.clientX / innerWidth  - 0.5) * 2;
    target.y = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive:true });

  let scrollY = 0;
  addEventListener('scroll', () => { scrollY = scrollY = window.scrollY; }, { passive:true });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  const arr = geo.attributes.position.array;
  let raf;

  function frame() {
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();

    mouse.x += (target.x - mouse.x) * 0.045;
    mouse.y += (target.y - mouse.y) * 0.045;

    // breathe: displace each point along its own radial direction
    for (let i = 0; i < COUNT; i++) {
      const s = seed[i];
      const w = Math.sin(t * 0.55 + s) * 0.34;
      arr[i*3]   = base[i*3]   + Math.cos(s) * w;
      arr[i*3+1] = base[i*3+1] + Math.sin(s * 1.7 + t * 0.4) * 0.3;
      arr[i*3+2] = base[i*3+2] + Math.sin(s) * w;
    }
    geo.attributes.position.needsUpdate = true;

    points.rotation.y = t * 0.045 + mouse.x * 0.32;
    points.rotation.x = mouse.y * 0.2;
    lines.rotation.copy(points.rotation);

    // ease the camera back as the visitor scrolls past the hero
    camera.position.z = 15 + Math.min(scrollY / innerHeight, 1.4) * 7;
    camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.045;
    camera.position.y += (-mouse.y * 1.1 - camera.position.y) * 0.045;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) frame();
  else renderer.render(scene, camera);

  // pause when the tab is hidden — no point burning battery offscreen
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) frame();
  });
}
