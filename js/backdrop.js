import * as THREE from 'three';

// Full-screen liquid-chrome field. Domain-warped fbm drives a silver ramp, and
// the three colour channels are sampled at slightly different warp offsets —
// that split is what reads as prismatic dispersion across the flow.
const VERT = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;
  uniform vec2  uMouse;
  uniform float uIntensity;

  vec2 hash(vec2 p){
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(hash(i + vec2(0,0)), f - vec2(0,0)),
                   dot(hash(i + vec2(1,0)), f - vec2(1,0)), u.x),
               mix(dot(hash(i + vec2(0,1)), f - vec2(0,1)),
                   dot(hash(i + vec2(1,1)), f - vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }
  float flow(vec2 p, float t, float o){
    vec2 q = vec2(fbm(p + vec2(0.0, t * 0.09)), fbm(p + vec2(4.3, -t * 0.07)));
    vec2 r = vec2(fbm(p + 3.4 * q + vec2(1.7, 9.2) + t * 0.055 + o),
                  fbm(p + 3.4 * q + vec2(8.3, 2.8) - t * 0.045 + o));
    return fbm(p + 3.2 * r);
  }

  // silver base, oil-slick iridescence only in the crests
  vec3 ramp(float x){
    vec3 shade = vec3(0.620, 0.640, 0.665);
    vec3 base  = vec3(0.868, 0.868, 0.852);
    vec3 teal  = vec3(0.180, 0.720, 0.660);
    vec3 viol  = vec3(0.520, 0.400, 0.880);
    vec3 amber = vec3(0.980, 0.700, 0.300);
    vec3 col = mix(shade, base, smoothstep(0.20, 0.62, x));
    col = mix(col, teal,  smoothstep(0.60, 0.79, x) * 0.55);
    col = mix(col, viol,  smoothstep(0.77, 0.91, x) * 0.50);
    col = mix(col, amber, smoothstep(0.90, 0.99, x) * 0.45);
    return col;
  }

  void main(){
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.4;
    p += uMouse * 0.28;
    float t = uTime;

    float r = flow(p, t,  0.070);
    float g = flow(p, t,  0.0);
    float b = flow(p, t, -0.070);

    vec3 col = vec3(ramp(r * 0.5 + 0.5).r,
                    ramp(g * 0.5 + 0.5).g,
                    ramp(b * 0.5 + 0.5).b);

    float spec = pow(clamp(g * 0.5 + 0.5, 0.0, 1.0), 9.0);
    col = mix(col, vec3(1.0), spec * 0.30);

    // lift the edges rather than darkening them — keeps the page airy
    float vig = smoothstep(1.30, 0.30, length(uv - 0.5) * 1.55);
    vec3 paper = vec3(0.870, 0.870, 0.855);
    col = mix(paper, col, 0.34 + 0.66 * vig);
    col = mix(paper, col, uIntensity);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function makeBackdrop() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false, depthWrite: false,
    uniforms: {
      uTime:      { value: 0 },
      uRes:       { value: new THREE.Vector2(1, 1) },
      uMouse:     { value: new THREE.Vector2(0, 0) },
      uIntensity: { value: 1.0 },
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, mat };
}
