import * as THREE from 'three';
import { GLYPHS, drawGlyph } from './glyphs.js';

const DURATION = 30;
const LIVE = 7;           // glyphs on screen at once

export function initGame(root) {
  const canvas  = root.querySelector('#gameCanvas');
  const overlay = root.querySelector('#gameOverlay');
  const elScore = root.querySelector('#gScore');
  const elCombo = root.querySelector('#gCombo');
  const elTime  = root.querySelector('#gTime');
  const elBest  = root.querySelector('#gBest');
  const elTitle = root.querySelector('#gTitle');
  const elMsg   = root.querySelector('#gMsg');
  const btn     = root.querySelector('#gStart');
  const hud     = root.querySelector('#hudGlyph');
  const hudCtx  = hud.getContext('2d');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 16/10, 0.1, 100);
  camera.position.z = 13;

  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();

  let entities = [], running = false, score = 0, combo = 1, timeLeft = DURATION, target = null, raf, last = 0;

  let best = 0;
  try { best = +(localStorage.getItem('glyphhunter.best') || 0); } catch {}
  elBest.textContent = best;

  // Build a glyph as line segments plus an invisible hit-plane (thin lines are
  // near-impossible to raycast reliably, so the plane does the catching).
  function makeGlyph(glyph, color) {
    const g = new THREE.Group();
    const pts = [];
    for (const [a, b] of glyph.strokes) pts.push(a[0], a[1], 0, b[0], b[1], 0);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color, transparent:true, opacity:.95, blending:THREE.AdditiveBlending, depthWrite:false,
    }));
    g.add(line);
    const hit = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ visible:false })
    );
    g.add(hit);
    g.userData = { glyph, line, hit };
    return g;
  }

  function spawn(forceTarget = false) {
    // ~1 in 3 spawns is the target: sparse enough to hunt, dense enough to stay fun
    const glyph = forceTarget || Math.random() < 0.33
      ? target
      : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    const isTarget = glyph.name === target.name;
    const g = makeGlyph(glyph, isTarget ? 0x38e8c8 : 0x98a3bd);
    g.position.set((Math.random() - .5) * 15, (Math.random() - .5) * 8.5, (Math.random() - .5) * 5);
    g.scale.setScalar(0.85 + Math.random() * 0.35);
    g.userData.drift = new THREE.Vector3((Math.random()-.5)*.014, (Math.random()-.5)*.011, 0);
    g.userData.spin  = (Math.random() - .5) * .012;
    g.userData.born  = performance.now();
    scene.add(g); entities.push(g);
    return g;
  }

  function clearAll() {
    for (const e of entities) scene.remove(e);
    entities = [];
  }

  function pickTarget() {
    target = GLYPHS[(Math.random() * GLYPHS.length) | 0];
    drawGlyph(hudCtx, target, '#38e8c8', 5);
  }

  function refill() {
    // guarantee at least one match is always reachable
    while (entities.length < LIVE) spawn();
    if (!entities.some(e => e.userData.glyph.name === target.name)) spawn(true);
  }

  function pop(text, clientX, clientY, color) {
    const el = document.createElement('div');
    el.className = 'hit-pop'; el.textContent = text; el.style.color = color;
    const r = root.getBoundingClientRect();
    el.style.left = (clientX - r.left) + 'px';
    el.style.top  = (clientY - r.top)  + 'px';
    root.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }

  canvas.addEventListener('pointerdown', e => {
    if (!running) return;
    const r = canvas.getBoundingClientRect();
    ptr.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
    ptr.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects(entities.map(g => g.userData.hit), false);
    if (!hits.length) { combo = 1; elCombo.textContent = '×1'; return; }

    const g = hits[0].object.parent;
    if (g.userData.glyph.name === target.name) {
      const gained = 10 * combo;
      score += gained; combo = Math.min(combo + 1, 9);
      pop('+' + gained, e.clientX, e.clientY, '#38e8c8');
      scene.remove(g); entities = entities.filter(x => x !== g);
      pickTarget(); 
      // recolour survivors against the new target
      for (const x of entities) {
        x.userData.line.material.color.setHex(
          x.userData.glyph.name === target.name ? 0x38e8c8 : 0x98a3bd);
      }
      refill();
    } else {
      score = Math.max(0, score - 3); combo = 1;
      pop('−3', e.clientX, e.clientY, '#f0a848');
    }
    elScore.textContent = score;
    elCombo.textContent = '×' + combo;
  });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, .1); last = now;

    if (running) {
      timeLeft -= dt;
      elTime.textContent = Math.max(0, Math.ceil(timeLeft));
      if (timeLeft <= 0) return end();
    }

    for (const g of entities) {
      g.position.add(g.userData.drift);
      g.rotation.z += g.userData.spin;
      // wrap at the edges so the field never empties visually
      if (Math.abs(g.position.x) > 9)   g.userData.drift.x *= -1;
      if (Math.abs(g.position.y) > 5.2) g.userData.drift.y *= -1;
      const age = (performance.now() - g.userData.born) / 1000;
      g.userData.line.material.opacity = Math.min(1, age * 2.4) * (.86 + .14 * Math.sin(age * 1.6 + g.position.x));
    }
    renderer.render(scene, camera);
  }

  function start() {
    clearAll();
    score = 0; combo = 1; timeLeft = DURATION; running = true;
    elScore.textContent = '0'; elCombo.textContent = '×1'; elTime.textContent = DURATION;
    overlay.classList.add('hidden');
    pickTarget(); refill();
    last = performance.now();
  }

  function end() {
    running = false;
    clearAll();
    if (score > best) {
      best = score;
      try { localStorage.setItem('glyphhunter.best', String(best)); } catch {}
      elTitle.textContent = 'NEW BEST';
      elMsg.textContent = `${score} points. The script is still undeciphered, but you're getting closer than most.`;
    } else {
      elTitle.textContent = 'TIME';
      elMsg.textContent = `${score} points. Chain matches without missing to build the combo multiplier.`;
    }
    elBest.textContent = best;
    btn.textContent = 'Play again';
    overlay.classList.remove('hidden');
  }

  btn.addEventListener('click', start);
  resize();
  loop(performance.now());

  return { start };
}
