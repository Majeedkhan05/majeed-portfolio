import * as THREE from 'three';

// A carousel of photo planes arranged on a cylinder. Drags with the pointer,
// drifts on its own, and lifts whichever card faces the camera.
export function initGallery(canvas, shots, onPick) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 16/9, .1, 100);
  camera.position.set(0, .6, 11.5);

  const RADIUS = 6.4;
  const group  = new THREE.Group();
  scene.add(group);

  const loader = new THREE.TextureLoader();
  const cards  = [];

  shots.forEach((shot, i) => {
    const a = (i / shots.length) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.position.set(Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS);
    holder.rotation.y = a;

    // placeholder until the texture lands, so layout never jumps
    const mat = new THREE.MeshBasicMaterial({ color:0x151a26, transparent:true, opacity:.9, side:THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), mat);
    holder.add(mesh);

    loader.load(shot.src, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const ar = tex.image.width / tex.image.height;
      const H = 3.5, W = H * ar;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(Math.min(W, 4.4), Math.min(W, 4.4) / ar);
      mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
    });

    // frame glow
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(4.7, 4.0),
      new THREE.MeshBasicMaterial({ color:0x38e8c8, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false })
    );
    frame.position.z = -.03; holder.add(frame);

    holder.userData = { mesh, frame, shot, i };
    group.add(holder); cards.push(holder);
  });

  /* ── drag + inertia ───────────────────────────────────────────────────── */
  let rot = 0, vel = .0016, dragging = false, lastX = 0, moved = 0;

  const down = e => { dragging = true; moved = 0; lastX = (e.touches?e.touches[0]:e).clientX; canvas.style.cursor='grabbing'; };
  const move = e => {
    if (!dragging) return;
    const x = (e.touches?e.touches[0]:e).clientX;
    const d = x - lastX; lastX = x; moved += Math.abs(d);
    rot += d * .0055; vel = d * .0016;
  };
  const up = () => { dragging = false; canvas.style.cursor='grab'; };

  canvas.addEventListener('pointerdown', down);
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  canvas.style.cursor = 'grab';

  // click (not drag) opens the lightbox
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  canvas.addEventListener('click', e => {
    if (moved > 6) return;
    const r = canvas.getBoundingClientRect();
    ptr.x = ((e.clientX-r.left)/r.width)*2-1;
    ptr.y = -((e.clientY-r.top)/r.height)*2+1;
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(cards.map(c=>c.userData.mesh), false)[0];
    if (hit) onPick(hit.object.parent.userData.shot);
  });

  function resize(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w||!h) return;
    renderer.setSize(w,h,false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
    camera.position.z = w < 700 ? 14.5 : 11.5;
  }
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf, t = 0;
  function frame(){
    raf = requestAnimationFrame(frame);
    t += .016;
    if (!dragging) { rot += vel; vel += (.0016 - vel) * .02; }
    group.rotation.y = rot;

    for (const c of cards) {
      // world-space angle between the card's normal and the camera
      const a = (c.userData.i / cards.length) * Math.PI*2 + rot;
      const facing = Math.cos(a);                 // 1 = square to camera
      const lift = Math.max(0, facing);
      c.position.y = Math.sin(t*.9 + c.userData.i) * .13 + lift * .35;
      c.userData.mesh.material.opacity = .42 + lift * .58;
      c.userData.frame.material.opacity = Math.pow(lift, 3) * .17;
      c.scale.setScalar(.9 + lift * .16);
    }
    renderer.render(scene, camera);
  }
  resize();
  if (!reduced) frame(); else { group.rotation.y = 0; renderer.render(scene, camera); }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else if (!reduced) frame();
  });

  return { spin: d => { rot += d; } };
}
