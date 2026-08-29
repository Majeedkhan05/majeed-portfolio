import * as THREE from 'three';

/* Orbital hero: a planet limb seen from low orbit, sun rising over the
   terminator, a satellite constellation crossing overhead, and a deep star
   field. Everything is procedural — no textures, no video file, 60fps. */

const PLANET_VERT = /* glsl */`
  varying vec3 vN; varying vec3 vP; varying vec2 vUv;
  void main(){
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vP = mv.xyz; vUv = uv;
    gl_Position = projectionMatrix * mv;
  }
`;

const PLANET_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vN; varying vec3 vP; varying vec2 vUv;
  uniform vec3 uSun; uniform float uTime;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.1; a*=0.5; } return v; }

  void main(){
    vec3 N = normalize(vN);
    float lambert = max(dot(N, normalize(uSun)), 0.0);

    // continents / cloud banding
    float land  = fbm(vUv * vec2(9.0, 5.0) + vec2(uTime*0.006, 0.0));
    float cloud = fbm(vUv * vec2(14.0, 7.0) - vec2(uTime*0.013, 0.0));

    vec3 ocean = vec3(0.020, 0.075, 0.170);
    vec3 earth = vec3(0.075, 0.150, 0.110);
    vec3 col   = mix(ocean, earth, smoothstep(0.52, 0.62, land));
    col = mix(col, vec3(0.80, 0.83, 0.87), smoothstep(0.60, 0.80, cloud) * 0.55);

    // city lights on the night side
    float night = smoothstep(0.22, 0.0, lambert);
    float cities = smoothstep(0.66, 0.78, land) * step(0.55, hash(floor(vUv * 220.0)));
    col += vec3(1.0, 0.72, 0.35) * cities * night * 0.85;

    col *= 0.06 + 1.25 * lambert;

    // fresnel atmosphere on the limb
    float fres = pow(1.0 - max(dot(N, normalize(-vP)), 0.0), 3.0);
    col += vec3(0.25, 0.55, 1.0) * fres * (0.30 + 0.85 * lambert);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const GLOW_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vN; varying vec3 vP;
  uniform vec3 uSun;
  void main(){
    vec3 N = normalize(vN);
    float fres = pow(1.0 - max(dot(N, normalize(-vP)), 0.0), 2.4);
    float lit  = max(dot(N, normalize(uSun)), 0.0);
    float a = fres * (0.12 + 0.88 * lit);
    gl_FragColor = vec4(vec3(0.32, 0.62, 1.0), a * 0.9);
  }
`;

export function initSpace(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x03040a, 1);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 4000);
  camera.position.set(0, 1.4, 15);

  const sun = new THREE.Vector3(-0.55, 0.28, 0.78).normalize();

  /* ── planet ──────────────────────────────────────────────────────────── */
  const R = 26;
  const planetMat = new THREE.ShaderMaterial({
    vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
    uniforms: { uSun:{value:sun}, uTime:{value:0} },
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), planetMat);
  planet.position.set(0, -R - 5.2, 0);
  scene.add(planet);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.045, 64, 40),
    new THREE.ShaderMaterial({
      vertexShader: PLANET_VERT, fragmentShader: GLOW_FRAG,
      uniforms:{ uSun:{value:sun} },
      transparent:true, blending:THREE.AdditiveBlending, side:THREE.BackSide, depthWrite:false,
    })
  );
  glow.position.copy(planet.position); scene.add(glow);

  /* ── stars ───────────────────────────────────────────────────────────── */
  const SN = 4200;
  const sp = new Float32Array(SN*3), sc = new Float32Array(SN*3), ss = new Float32Array(SN);
  for (let i=0;i<SN;i++){
    const r = 600 + Math.random()*900;
    const th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1);
    sp[i*3]=r*Math.sin(ph)*Math.cos(th); sp[i*3+1]=r*Math.cos(ph); sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    const w = 0.72 + Math.random()*0.28;
    const tint = Math.random();
    sc[i*3]   = w * (tint>0.85 ? 1.0 : 0.88);
    sc[i*3+1] = w * 0.93;
    sc[i*3+2] = w * (tint<0.2 ? 1.0 : 0.92);
    ss[i] = Math.random()*Math.PI*2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp,3));
  starGeo.setAttribute('color',    new THREE.BufferAttribute(sc,3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size:2.4, vertexColors:true, sizeAttenuation:false,
    transparent:true, opacity:.95, blending:THREE.AdditiveBlending, depthWrite:false }));
  scene.add(stars);

  /* ── satellite constellation ─────────────────────────────────────────── */
  const SAT = 34;
  const satGeo = new THREE.BoxGeometry(.10, .10, .34);
  const satMat = new THREE.MeshBasicMaterial({ color:0xbfe4ff });
  const sats = new THREE.InstancedMesh(satGeo, satMat, SAT);
  scene.add(sats);
  const orbits = [];
  for (let i=0;i<SAT;i++){
    orbits.push({
      r: R + 7 + Math.random()*9,
      a: Math.random()*Math.PI*2,
      sp: 0.045 + Math.random()*0.055,
      tilt: (Math.random()-.5)*0.7,
      off: (Math.random()-.5)*10,
    });
  }
  // faint orbital traces
  const traceMat = new THREE.LineBasicMaterial({ color:0x3d6ea8, transparent:true, opacity:.16, blending:THREE.AdditiveBlending, depthWrite:false });
  for (let k=0;k<5;k++){
    const pts=[], rr = R+8+k*2.6, tl=(k-2)*0.16;
    for (let a=0;a<=Math.PI*2+0.01;a+=0.06){
      pts.push(new THREE.Vector3(Math.cos(a)*rr, Math.sin(a)*rr*Math.sin(tl) + planet.position.y + R, Math.sin(a)*rr*Math.cos(tl)));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), traceMat));
  }

  /* ── interaction ─────────────────────────────────────────────────────── */
  const m = {x:0,y:0}, tgt = {x:0,y:0};
  addEventListener('pointermove', e => {
    tgt.x = (e.clientX/innerWidth - .5)*2;
    tgt.y = (e.clientY/innerHeight - .5)*2;
  }, {passive:true});
  let sy = 0;
  addEventListener('scroll', () => { sy = window.scrollY; }, {passive:true});

  function resize(){
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0,1,0);
  let raf;

  function frame(){
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    m.x += (tgt.x - m.x)*.04; m.y += (tgt.y - m.y)*.04;

    planetMat.uniforms.uTime.value = t;
    planet.rotation.y = t * 0.012;
    stars.rotation.y  = t * 0.0035;

    for (let i=0;i<SAT;i++){
      const o = orbits[i];
      const a = o.a + t*o.sp;
      const x = Math.cos(a)*o.r;
      const z = Math.sin(a)*o.r*Math.cos(o.tilt);
      const y = Math.sin(a)*o.r*Math.sin(o.tilt) + planet.position.y + R + o.off*0.1;
      const pos = new THREE.Vector3(x,y,z);
      q.setFromUnitVectors(up, pos.clone().normalize());
      mtx.compose(pos, q, new THREE.Vector3(1,1,1));
      sats.setMatrixAt(i, mtx);
    }
    sats.instanceMatrix.needsUpdate = true;

    // slow dolly + parallax; climb away as the reader scrolls into the page
    const p = Math.min(sy / innerHeight, 1);
    camera.position.x = m.x*1.9 + Math.sin(t*0.07)*0.7;
    camera.position.y = 1.4 - m.y*1.1 + p*7;
    camera.position.z = 15 + p*11;
    camera.lookAt(0, -1.2 + p*4, -6);

    renderer.render(scene, camera);
  }
  if (!reduced) frame(); else renderer.render(scene, camera);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else if (!reduced) frame();
  });
}
