import * as THREE from 'three';

// Full-screen iridescent fluid. Domain-warped fbm drives a hue ramp, then the
// three colour channels are sampled at slightly different warp offsets — that
// channel split is what reads as chromatic dispersion / prismatic oil.
export const backdropVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const backdropFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;
  uniform vec2  uMouse;
  uniform float uIntensity;

  // -- value noise + fbm ---------------------------------------------------
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

  // domain warp — the swirl that makes it read as fluid rather than clouds
  float flow(vec2 p, float t, float o){
    vec2 q = vec2(fbm(p + vec2(0.0, t * 0.09)), fbm(p + vec2(4.3, -t * 0.07)));
    vec2 r = vec2(fbm(p + 3.4 * q + vec2(1.7, 9.2) + t * 0.055 + o),
                  fbm(p + 3.4 * q + vec2(8.3, 2.8) - t * 0.045 + o));
    return fbm(p + 3.2 * r);
  }

  // deep-space palette: teal -> indigo -> amber, never washing to white
  vec3 ramp(float x){
    vec3 a = vec3(0.012, 0.018, 0.038);
    vec3 b = vec3(0.030, 0.230, 0.208);
    vec3 c = vec3(0.130, 0.140, 0.360);
    vec3 d = vec3(0.400, 0.270, 0.115);
    vec3 col = mix(a, b, smoothstep(0.34, 0.64, x));
    col = mix(col, c, smoothstep(0.66, 0.88, x));
    col = mix(col, d, smoothstep(0.90, 0.995, x));
    return col;
  }

  void main(){
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.4;
    p += uMouse * 0.28;
    float t = uTime;

    // sample each channel at a different warp offset -> prismatic split
    float r = flow(p, t,  0.055);
    float g = flow(p, t,  0.0);
    float b = flow(p, t, -0.055);

    vec3 col = vec3(ramp(r * 0.5 + 0.5).r,
                    ramp(g * 0.5 + 0.5).g,
                    ramp(b * 0.5 + 0.5).b);

    // specular-ish sheen along the flow gradient
    float sheen = pow(clamp(g * 0.5 + 0.5, 0.0, 1.0), 6.0);
    col += vec3(0.18, 0.40, 0.38) * sheen * 0.62;

    // vignette so the type always has a dark bed to sit on
    float vig = smoothstep(1.15, 0.18, length(uv - 0.5) * 1.9);
    col *= 0.20 + 0.80 * vig;
    col *= 1.35;

    col *= uIntensity;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function makeBackdrop() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: backdropVert,
    fragmentShader: backdropFrag,
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
