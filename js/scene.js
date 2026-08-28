import * as THREE from 'three';
import { makeBackdrop } from './backdrop.js';

// Hero: a drifting point-cloud, plus the interview footage shattered across a
// bank of vertical slats. Each slat samples its own vertical slice of the video
// texture, then counter-rotates on a travelling wave — so the picture reads as
// whole when the wave is flat and fragments as it passes.
export function initScene(canvas, videoEl) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene  = new THREE.Scene();
  scene.fog    = new THREE.FogExp2(0xd9d9d6, 0.048);

  // iridescent fluid, drawn first into its own ortho pass
  const bgScene = new THREE.Scene();
  const bgCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const { mesh: bgMesh, mat: bgMat } = makeBackdrop();
  bgScene.add(bgMesh);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 15;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── point cloud ──────────────────────────────────────────────────────── */
  const COUNT = 2400;
  const pos = new Float32Array(COUNT*3), col = new Float32Array(COUNT*3), seed = new Float32Array(COUNT);
  const palette = [new THREE.Color(0x0a8f7d), new THREE.Color(0x3f43b5), new THREE.Color(0xa8621a)];
  for (let i=0;i<COUNT;i++){
    const r = 8+Math.random()*10, th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.sin(ph)*Math.sin(th)*.62; pos[i*3+2]=r*Math.cos(ph);
    const c = palette[(Math.random()*3)|0].clone().multiplyScalar(.5+Math.random()*.5);
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b; seed[i]=Math.random()*Math.PI*2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color', new THREE.BufferAttribute(col,3));
  const base = pos.slice();
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size:.062, vertexColors:true, transparent:true, opacity:.62,
    blending:THREE.NormalBlending, depthWrite:false, sizeAttenuation:true }));
  scene.add(points);

  /* ── video slats ──────────────────────────────────────────────────────── */
  const slatGroup = new THREE.Group();
  slatGroup.position.set(3.4, 0.4, -4.2);
  scene.add(slatGroup);

  const SLATS = 16, PANEL_W = 9.4, PANEL_H = 6.2;
  const slats = [];
  let videoTex = null;

  if (videoEl) {
    videoTex = new THREE.VideoTexture(videoEl);
    videoTex.colorSpace = THREE.SRGBColorSpace;
    videoTex.minFilter = THREE.LinearFilter;

    const sw = PANEL_W / SLATS;
    for (let i = 0; i < SLATS; i++) {
      // each slat gets its own texture clone so it can hold a distinct UV window
      const t = videoTex.clone();
      t.needsUpdate = true;
      t.repeat.set(1 / SLATS, 1);
      t.offset.set(i / SLATS, 0);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;

      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(sw * .93, PANEL_H),
        new THREE.MeshBasicMaterial({ map:t, transparent:true, opacity:.94, side:THREE.DoubleSide })
      );
      m.position.x = -PANEL_W/2 + sw*(i+.5);
      slatGroup.add(m);
      slats.push(m);

      // thin emissive edge so the slats read as physical objects
      const edge = new THREE.Mesh(
        new THREE.PlaneGeometry(.012, PANEL_H),
        new THREE.MeshBasicMaterial({ color:0x0a8f7d, transparent:true, opacity:.30, blending:THREE.NormalBlending, depthWrite:false })
      );
      edge.position.set(m.position.x - sw*.47, 0, .02);
      slatGroup.add(edge);
    }

    // soft glow behind the panel
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(PANEL_W*1.5, PANEL_H*1.45),
      new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.10, blending:THREE.NormalBlending, depthWrite:false })
    );
    glow.position.z = -.6; slatGroup.add(glow);
  }

  /* ── interaction ──────────────────────────────────────────────────────── */
  const mouse = {x:0,y:0}, target = {x:0,y:0};
  addEventListener('pointermove', e => {
    target.x = (e.clientX/innerWidth - .5)*2;
    target.y = (e.clientY/innerHeight - .5)*2;
  }, {passive:true});
  let sy = 0;
  addEventListener('scroll', () => { sy = window.scrollY; }, {passive:true});

  function resize(){
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
    bgMat.uniforms.uRes.value.set(innerWidth, innerHeight);
    // pull the panel in on narrow screens so it stays inside frame
    const s = Math.min(1, innerWidth/1100);
    slatGroup.scale.setScalar(.58 + s*.42);
    slatGroup.position.x = innerWidth < 820 ? 0 : 3.4;
    slatGroup.position.z = innerWidth < 820 ? -6.5 : -4.2;
  }
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  const arr = geo.attributes.position.array;
  let raf;

  function frame(){
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    mouse.x += (target.x-mouse.x)*.045;
    mouse.y += (target.y-mouse.y)*.045;

    for (let i=0;i<COUNT;i++){
      const s = seed[i], w = Math.sin(t*.5+s)*.32;
      arr[i*3]   = base[i*3]   + Math.cos(s)*w;
      arr[i*3+1] = base[i*3+1] + Math.sin(s*1.7+t*.4)*.28;
      arr[i*3+2] = base[i*3+2] + Math.sin(s)*w;
    }
    geo.attributes.position.needsUpdate = true;
    points.rotation.y = t*.04 + mouse.x*.3;
    points.rotation.x = mouse.y*.18;

    // travelling wave across the slats
    for (let i=0;i<slats.length;i++){
      const ph = t*1.15 - i*.28;
      slats[i].rotation.y = Math.sin(ph)*.42 + mouse.x*.16;
      slats[i].position.z = Math.cos(ph)*.32;
      slats[i].material.opacity = (.70 + .28*Math.abs(Math.cos(slats[i].rotation.y)));
    }
    slatGroup.rotation.y = mouse.x*.1;
    slatGroup.rotation.x = -mouse.y*.06;

    const p = Math.min(sy/innerHeight, 1.5);
    camera.position.z = 15 + p*8;
    camera.position.x += (mouse.x*1.4 - camera.position.x)*.045;
    camera.position.y += (-mouse.y*1.0 - camera.position.y)*.045;
    slatGroup.position.y = -p*3;
    camera.lookAt(0,0,0);

    bgMat.uniforms.uTime.value = t;
    bgMat.uniforms.uMouse.value.set(mouse.x, -mouse.y);
    // fade the fluid back as the reader leaves the hero so text sections stay calm
    bgMat.uniforms.uIntensity.value = 1.0 - Math.min(sy / (innerHeight * 1.6), 1) * 0.62;

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.clearDepth();
    renderer.render(scene, camera);
  }

  if (!reduced) frame();
  else { renderer.autoClear = false; renderer.clear(); renderer.render(bgScene, bgCam); renderer.clearDepth(); renderer.render(scene, camera); }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); videoEl?.pause(); }
    else if (!reduced) { videoEl?.play().catch(()=>{}); frame(); }
  });
}
