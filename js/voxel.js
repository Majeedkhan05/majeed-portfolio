import * as THREE from 'three';

/* ────────────────────────────────────────────────────────────────────────
   BLOCK WORLD — six voxel landmarks, one per chapter of the story.
   Orbit with drag, click a build to open it. Each is authored as a stack of
   layers: a string grid per Y level, characters mapping to block colours.
   ──────────────────────────────────────────────────────────────────────── */

const C = {
  g:0x6aa84f, d:0x8b6239, s:0x9aa0a8, w:0xdfe3e8, k:0x2b2f36,
  b:0x4285f4, r:0xea4335, y:0xfbbc04, e:0x34a853,           // Google palette
  t:0x0a8f7d, o:0xa8621a, p:0x6b4fbb, c:0x5fc9e8, n:0xf2f2f0,
};

// layers are listed bottom-up; '.' is empty
const BUILDS = [
  {
    id:'campus', at:[-9,0,-4], accent:0x6aa84f,
    title:'Mahindra University', kicker:'Hyderabad · 2023 → 2028',
    body:'Integrated M.Tech in Computer Science. Currently year four of five. Academic Merit Scholarship. This is where all of it starts.',
    layers:[
      ['sssss','sssss','sssss'],
      ['w.w.w','w...w','wwwww'],
      ['w.w.w','w...w','wwwww'],
      ['.www.','.....','.www.'],
      ['..k..','.....','..k..'],
    ],
  },
  {
    id:'aihub', at:[-3,0,-6], accent:0x0a8f7d,
    title:'AI Hub', kicker:'Founder & President · 2025 →',
    body:'Founded the campus AI organisation and grew it to 100+ active members. Directed a flagship hackathon for 1,000+ participants. Ran the code reviews and the architecture arguments.',
    layers:[
      ['ttt','ttt','ttt'],
      ['t.t','...','t.t'],
      ['t.t','...','t.t'],
      ['ttt','ttt','ttt'],
      ['.c.','ccc','.c.'],
      ['...','.c.','...'],
    ],
  },
  {
    id:'io', at:[3,0,-7], accent:0x4285f4,
    title:'Google I/O 2026', kicker:'Mountain View · 1 of 9',
    body:'Chosen as one of nine student ambassadors from every campus in India and flown to Google HQ. Delivered Vertex AI and multimodal RAG workshops to 1,000+ developers.',
    layers:[
      ['sssss','sssss','sssss'],
      ['b...r','.....','y...e'],
      ['b...r','.....','y...e'],
      ['bryeb','.....','bryeb'],
      ['..n..','.n.n.','..n..'],
      ['.....','..n..','.....'],
    ],
  },
  {
    id:'robby', at:[9,0,-4], accent:0xea4335,
    title:'The Robby Stein interview', kicker:'VP of Product, Google Search',
    body:'One of two people from India selected to interview him, on how Gemini changes what a search interface even is. It ran across Google Official, Google for Developers, and Google India.',
    layers:[
      ['sss','sss','sss'],
      ['k.k','.w.','k.k'],
      ['n.n','.w.','n.n'],
      ['..w','...','w..'],
    ],
  },
  {
    id:'truenorth', at:[-6,0,3], accent:0xa8621a,
    title:'True North', kicker:'Bilingual AI back-office · Canada',
    body:'Insurance documents in, validated bilingual drafts out. 98.4% extraction accuracy, 58/58 end-to-end checks passing, zero PII leakage. Multi-tenant, billed, audited.',
    layers:[
      ['ooo','ooo','ooo'],
      ['o.o','...','o.o'],
      ['ooo','o.o','ooo'],
      ['.n.','nnn','.n.'],
      ['...','.r.','...'],
    ],
  },
  {
    id:'indus', at:[1,0,4], accent:0x6b4fbb,
    title:'Indus Valley AI', kicker:'Private multimodal RAG',
    body:'A research assistant for a 4,000-year-old undeciphered script, running entirely offline. 1,500+ chunks in FAISS, CLIP artifact matching, Phi-3 Mini at under 200ms. Ships with the IVA-80 benchmark.',
    layers:[
      ['ddddd','ddddd','ddddd'],
      ['.ppp.','.p.p.','.ppp.'],
      ['..p..','.p.p.','..p..'],
      ['.....','..p..','.....'],
    ],
  },
];

export function initVoxel(canvas, onSelect) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 16/9, .1, 300);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa4b0, 1.25));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.45);
  sun.position.set(14, 22, 10); scene.add(sun);

  const world = new THREE.Group();
  scene.add(world);

  // ground plate
  const gm = new THREE.Mesh(
    new THREE.BoxGeometry(30, 1, 22),
    new THREE.MeshLambertMaterial({ color:0xbfc6bd })
  );
  gm.position.y = -0.5; world.add(gm);
  const gt = new THREE.Mesh(
    new THREE.BoxGeometry(30.02, .18, 22.02),
    new THREE.MeshLambertMaterial({ color:0x7fae5e })
  );
  gt.position.y = 0.04; world.add(gt);

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const picks = [];

  for (const b of BUILDS) {
    const g = new THREE.Group();
    g.position.set(b.at[0], 0, b.at[2]);

    // bucket voxels by colour so each build is a handful of InstancedMeshes
    const byColour = new Map();
    b.layers.forEach((rows, y) => {
      rows.forEach((row, z) => {
        [...row].forEach((ch, x) => {
          if (ch === '.') return;
          const col = C[ch]; if (col === undefined) return;
          if (!byColour.has(col)) byColour.set(col, []);
          byColour.get(col).push([x - (row.length-1)/2, y + .6, z - (rows.length-1)/2]);
        });
      });
    });

    let maxY = 0;
    for (const [col, list] of byColour) {
      const im = new THREE.InstancedMesh(
        cube, new THREE.MeshLambertMaterial({ color:col }), list.length);
      const m = new THREE.Matrix4();
      list.forEach(([x,y,z], i) => { m.makeTranslation(x,y,z); im.setMatrixAt(i, m); maxY = Math.max(maxY, y); });
      im.instanceMatrix.needsUpdate = true;
      g.add(im);
    }

    // invisible click volume covering the build
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, maxY + 2, 5.4),
      new THREE.MeshBasicMaterial({ visible:false })
    );
    hit.position.y = (maxY + 2) / 2;
    g.add(hit);

    // marker beacon so it reads as clickable
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(.07, .07, 2.4, 6),
      new THREE.MeshBasicMaterial({ color:b.accent, transparent:true, opacity:.5 })
    );
    beam.position.y = maxY + 2.1; g.add(beam);

    g.userData = { build:b, beam, base:maxY + 2.1 };
    world.add(g); picks.push({ hit, group:g });
  }

  /* ── orbit ─────────────────────────────────────────────────────────── */
  let rot = -0.5, vel = 0.0012, dragging = false, lastX = 0, moved = 0, pitch = 0.62;
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', e => { dragging = true; moved = 0; lastX = e.clientX; canvas.style.cursor='grabbing'; });
  addEventListener('pointermove', e => {
    if (!dragging) return;
    const d = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(d);
    rot += d * .006; vel = d * .0012;
  });
  addEventListener('pointerup', () => { dragging = false; canvas.style.cursor='grab'; });

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null;

  function pickAt(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((cx - r.left)/r.width)*2 - 1;
    ptr.y = -((cy - r.top)/r.height)*2 + 1;
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(picks.map(p => p.hit), false)[0];
    return hit ? picks.find(p => p.hit === hit.object) : null;
  }

  canvas.addEventListener('click', e => {
    if (moved > 6) return;
    const p = pickAt(e.clientX, e.clientY);
    if (p) onSelect(p.group.userData.build);
  });
  canvas.addEventListener('pointermove', e => {
    if (dragging) return;
    const p = pickAt(e.clientX, e.clientY);
    hovered = p ? p.group : null;
    canvas.style.cursor = p ? 'pointer' : 'grab';
  });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf, t = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    t += .016;
    if (!dragging) { rot += vel; vel += (.0012 - vel) * .02; }

    const R = 26;
    camera.position.set(Math.sin(rot)*R, 13 + pitch*4, Math.cos(rot)*R);
    camera.lookAt(0, 1.5, 0);

    for (const p of picks) {
      const u = p.group.userData;
      u.beam.position.y = u.base + Math.sin(t*1.6 + u.build.at[0]) * .22;
      u.beam.material.opacity = p.group === hovered ? .95 : .45;
      p.group.scale.setScalar(p.group === hovered ? 1.06 : 1);
    }
    renderer.render(scene, camera);
  }
  resize();
  if (!reduced) frame(); else renderer.render(scene, camera);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else if (!reduced) frame();
  });

  return { builds: BUILDS, focus: id => { const i = BUILDS.findIndex(b=>b.id===id); if (i>=0) onSelect(BUILDS[i]); } };
}
