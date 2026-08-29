import { initSpace } from './space.js';
import { initVoxel } from './voxel.js';
import { initGallery } from './gallery.js';

/* ── boot sequence ─────────────────────────────────────────────────────── */
const BOOT = [
  'majeed@archive:~$ ./init --profile',
  '',
  '[ ok ] loading identity ......... Mohammed Majeed Khan',
  '[ ok ] location ................. Hyderabad, IN (17.3850 N, 78.4867 E)',
  '[ ok ] mounting /projects ....... 3 systems, 2 public repos',
  '[ ok ] verifying claims ......... 58/58 checks passed',
  '[ ok ] retrieval index .......... 1,500 chunks, FAISS + BGE',
  '[ ok ] edge inference ........... 187ms  (target <200ms)',
  '[ ok ] cloud egress ............. 0 bytes',
  '',
  '> ready.',
];

function boot() {
  const el   = document.getElementById('bootLog');
  const fill = document.getElementById('bootFill');
  const box  = document.getElementById('boot');
  if (!el) return finish();

  let line = 0, char = 0, killed = false;
  const skip = () => { if (!killed) { killed = true; finish(); } };
  box.addEventListener('click', skip);
  addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === ' ') skip(); }, { once:true });

  (function type() {
    if (killed) return;
    if (line >= BOOT.length) { setTimeout(skip, 480); return; }
    const txt = BOOT[line];
    if (char <= txt.length) {
      el.textContent = BOOT.slice(0, line).join('\n') + (line ? '\n' : '') + txt.slice(0, char);
      char++;
      fill.style.width = ((line + char / Math.max(txt.length,1)) / BOOT.length * 100) + '%';
      setTimeout(type, txt === '' ? 40 : 11);
    } else { line++; char = 0; setTimeout(type, 78); }
  })();

  function finish() {
    box.classList.add('done');
    document.body.style.overflow = '';
    setTimeout(reveal, 120);
  }
  document.body.style.overflow = 'hidden';
}

/* ── scroll reveals + hero lines ───────────────────────────────────────── */
function reveal() {
  document.querySelectorAll('.hero .reveal').forEach((el, i) =>
    setTimeout(() => el.classList.add('in'), i * 110));
  document.querySelectorAll('.hero-title .line').forEach((el, i) =>
    setTimeout(() => el.classList.add('in'), 120 + i * 110));
  countUp();
}

const io = new IntersectionObserver(es => {
  for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal:not(.hero .reveal)').forEach(el => io.observe(el));

/* ── animated counters ─────────────────────────────────────────────────── */
function countUp() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const t0 = performance.now(), dur = 1500;
    (function step(now) {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.innerHTML = pre + Math.round(to * eased).toLocaleString('en-US') + suf;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  });
}

/* ── cursor ────────────────────────────────────────────────────────────── */
(function cursor() {
  const c = document.getElementById('cursor');
  if (!c || matchMedia('(hover:none)').matches) return;
  const dot = c.querySelector('.cursor-dot'), ring = c.querySelector('.cursor-ring');
  let x = 0, y = 0, rx = 0, ry = 0;
  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
  }, { passive:true });
  (function tick() {
    rx += (x - rx) * .16; ry += (y - ry) * .16;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(tick);
  })();
  document.addEventListener('pointerover', e => {
    c.classList.toggle('hot', !!e.target.closest('a,button,.project,.skill-tags span,canvas'));
  });
})();

/* ── project spotlight follows the pointer ─────────────────────────────── */
document.querySelectorAll('.project').forEach(p => {
  p.addEventListener('pointermove', e => {
    const r = p.getBoundingClientRect();
    p.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    p.style.setProperty('--my', (e.clientY - r.top)  + 'px');
  });
});

/* ── nav + clock + marquee ─────────────────────────────────────────────── */
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('stuck', scrollY > 40), { passive:true });

setInterval(() => {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-GB',
    { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', second:'2-digit' });
}, 1000);

(function marquee() {
  const items = ['Agentic systems','<b>·</b>','Retrieval-augmented generation','<b>·</b>','On-device inference',
    '<b>·</b>','Google I/O 2026 delegate','<b>·</b>','Rank #1 in India — GenAI Exchange','<b>·</b>',
    'Multimodal RAG','<b>·</b>','LLM orchestration','<b>·</b>','Vector search','<b>·</b>','LoRA fine-tuning','<b>·</b>'];
  const track = document.getElementById('marqueeTrack');
  if (track) track.innerHTML = [...items, ...items].map(t => `<span>${t}</span>`).join('');
})();

/* ── command palette ───────────────────────────────────────────────────── */
(function palette() {
  const box = document.getElementById('palette');
  const input = document.getElementById('paletteInput');
  const results = document.getElementById('paletteResults');
  const toast = document.getElementById('toast');
  let sel = 0, shown = [];

  const say = m => { toast.textContent = m; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); };
  const go  = id => document.querySelector(id)?.scrollIntoView({ behavior:'smooth' });

  const CMDS = [
    { label:'Go to work',            hint:'01',     run:() => go('#work') },
    { label:'Explore Block World',   hint:'02',     run:() => go('#play') },
    { label:'Google I/O 2026',       hint:'03',     run:() => go('#io') },
    { label:'Watch the Robby Stein interview', hint:'04', run:() => { go('#interview'); setTimeout(()=>document.getElementById('interviewVideo')?.play().catch(()=>{}), 900); } },
    { label:'About me',              hint:'05',     run:() => go('#about') },
    { label:'Contact',               hint:'04',     run:() => go('#contact') },
    { label:'Email me',              hint:'mailto', run:() => location.href = 'mailto:majeedkhan2005.cc@gmail.com' },
    { label:'Copy email address',    hint:'copy',   run:() => navigator.clipboard?.writeText('majeedkhan2005.cc@gmail.com').then(() => say('Email copied ✓')) },
    { label:'GitHub — Majeedkhan05', hint:'↗',      run:() => open('https://github.com/Majeedkhan05','_blank') },
    { label:'LinkedIn',              hint:'↗',      run:() => open('https://linkedin.com/in/majeed-khan','_blank') },
    { label:'True North repo',       hint:'↗',      run:() => open('https://github.com/Majeedkhan05/true-north','_blank') },
    { label:'Indus Valley AI repo',  hint:'↗',      run:() => open('https://github.com/Majeedkhan05/indus-valley-ai','_blank') },
    { label:'Replay boot sequence',  hint:'sudo',   run:() => location.reload() },
  ];

  function render(q = '') {
    shown = CMDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()));
    sel = 0;
    results.innerHTML = shown.length
      ? shown.map((c, i) => `<div class="p-item${i===0?' sel':''}" data-i="${i}">${c.label}<small>${c.hint}</small></div>`).join('')
      : `<div class="p-item">No match. Try "email", "repo", "play".</div>`;
  }
  function move(d) {
    if (!shown.length) return;
    sel = (sel + d + shown.length) % shown.length;
    [...results.children].forEach((c, i) => c.classList.toggle('sel', i === sel));
  }
  const open_ = () => { box.classList.add('open'); input.value = ''; render(); input.focus(); };
  const close = () => box.classList.remove('open');

  document.getElementById('cmdBtn').addEventListener('click', open_);
  input.addEventListener('input', () => render(input.value));
  results.addEventListener('click', e => {
    const it = e.target.closest('.p-item'); if (!it || !shown.length) return;
    close(); shown[+it.dataset.i]?.run();
  });
  box.addEventListener('click', e => { if (e.target === box) close(); });

  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box.classList.contains('open') ? close() : open_(); return; }
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter')     { close(); shown[sel]?.run(); }
  });

  // Konami
  const K = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let ki = 0;
  addEventListener('keydown', e => {
    ki = (e.key === K[ki] || e.key?.toLowerCase() === K[ki]) ? ki + 1 : 0;
    if (ki === K.length) { ki = 0; document.body.style.filter = 'hue-rotate(180deg)';
      say('↑↑↓↓←→←→BA — you found it.'); setTimeout(() => document.body.style.filter = '', 4000); }
  });
})();

/* ── photo gallery + lightbox ──────────────────────────────────────────── */
const SHOTS = [
  { src:'assets/img/google-bridge-thumb.webp',      full:'assets/img/google-bridge.webp',      cap:'Google HQ, Mountain View — May 2026' },
  { src:'assets/img/gemini-nine-thumb.webp',        full:'assets/img/gemini-nine.webp',        cap:'Google Gemini — the nine ambassadors flown to I/O' },
  { src:'assets/img/interview-setup-thumb.webp',    full:'assets/img/interview-setup.webp',    cap:'Sitting down with Robby Stein, VP of Product, Google Search' },
  { src:'assets/img/badge-thumb.webp',              full:'assets/img/badge.webp',              cap:'I/O credential — Mahindra University' },
  { src:'assets/img/io-sandbox-thumb.webp',         full:'assets/img/io-sandbox.webp',         cap:'The AI Sandbox, Shoreline Amphitheatre' },
  { src:'assets/img/ambassadors-group-thumb.webp',  full:'assets/img/ambassadors-group.webp',  cap:'Student ambassadors, Google campus' },
  { src:'assets/img/io-booth-thumb.webp',           full:'assets/img/io-booth.webp',           cap:'On the floor at I/O 2026' },
  { src:'assets/img/feature-gfd-thumb.webp',        full:'assets/img/feature-gfd.webp',        cap:'Featured by Google for Developers' },
];

(function lightbox() {
  const box = document.getElementById('lightbox');
  const img = document.getElementById('lbImg');
  const cap = document.getElementById('lbCap');
  const close = () => { box.classList.remove('open'); document.body.style.overflow=''; };
  document.getElementById('lbClose').addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.__openShot = shot => {
    img.src = shot.full; img.alt = shot.cap; cap.textContent = shot.cap;
    box.classList.add('open'); document.body.style.overflow='hidden';
  };
})();

/* ── block world card ──────────────────────────────────────────────────── */
const opened = new Set();
function openBuild(b) {
  document.getElementById('wKicker').textContent = b.kicker;
  document.getElementById('wTitle').textContent  = b.title;
  document.getElementById('wBody').textContent   = b.body;
  document.getElementById('worldCard').classList.add('open');
  opened.add(b.id);
  document.getElementById('worldCount').textContent =
    `6 BUILDS \u00b7 ${opened.size} OPENED`;
  if (opened.size === 6) setTimeout(() => {
    const t = document.getElementById('toast');
    t.textContent = 'All six opened. Now you know the whole story.';
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3600);
  }, 500);
}
document.getElementById('worldClose').addEventListener('click',
  () => document.getElementById('worldCard').classList.remove('open'));

/* ── connect block ─────────────────────────────────────────────────────── */
(function connect(){
  const EMAIL = 'majeedkhan2005.cc@gmail.com';
  const toast = document.getElementById('toast');
  const say = m => { toast.textContent = m; toast.classList.add('show');
                     setTimeout(() => toast.classList.remove('show'), 2400); };

  document.getElementById('copyMail')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(EMAIL)
      .then(() => say('Email copied \u2713'))
      .catch(() => say(EMAIL));
  });

  // No backend, no third-party form service: compose a mailto the visitor sends
  // themselves. Nothing is transmitted anywhere until they hit send.
  document.getElementById('msgForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('mName').value.trim();
    const subj = document.getElementById('mSubject').value.trim() || 'Hello from your site';
    const body = document.getElementById('mBody').value.trim();
    const text = `${body}\n\n\u2014 ${name}`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(text)}`;
    say('Opening your mail app\u2026');
  });
})();

/* ── init ──────────────────────────────────────────────────────────────── */
const heroVideo = document.getElementById('heroVideo');
// Muted+inline autoplay is usually allowed, but some engines still gate it behind
// a gesture. Try immediately, then retry on the first interaction of any kind.
function kickVideo() { heroVideo.play().catch(() => {}); }
kickVideo();
['pointerdown','keydown','touchstart','click'].forEach(ev =>
  addEventListener(ev, kickVideo, { once:false, passive:true }));
heroVideo.addEventListener('canplay', kickVideo);

initSpace(document.getElementById('bg'));
initVoxel(document.getElementById('worldCanvas'), openBuild);
initGallery(document.getElementById('galleryCanvas'), SHOTS, s => window.__openShot(s));
boot();
