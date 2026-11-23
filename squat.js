// 스쿼트 같이 하기: 10회 × 4세트, 세트 사이 10초 휴식
// 화면 전체를 덮는 창을 띄우고, 그림 캐릭터·비트·목소리로 함께 운동한다.
// 사용: import { openSquat } from "./squat.js"; openSquat({ onDone: () => {...} })
// 이 파일은 버튼을 누를 때만 불러오므로 앱의 다른 기능과 섞이지 않는다.

const REPS = 10, SETS = 4, REST = 10, BPM = 120;
const REP_SEC = 2;                       // 1회 2초 (내려가기 1초 + 올라오기 1초) = 1마디
const STEP = 60 / BPM / 4;               // 16분음표 길이(초)
const KOR = ["하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

// ── 캐릭터 그림 (앞모습, p = 0 서 있음 ~ 1 가장 앉음) ──
// g = "f"(여성: 포니테일·민소매·레깅스) / "m"(남성: 짧은 머리·반팔·반바지)
const mix = (a, b, p) => a + (b - a) * p;
const pt = (a, b, p) => [mix(a[0], b[0], p), mix(a[1], b[1], p)];
const ANK_Y = 262;
function pose(p) {
  const hipY = mix(146, 198, p), hipW = mix(18, 21, p);
  const shY = hipY - mix(70, 60, p);                // 앉을수록 상체가 앞으로 숙어 짧아 보임
  const P = {
    ankL: [82, ANK_Y], ankR: [118, ANK_Y],
    kneL: pt([83, 206], [64, 220], p), kneR: pt([117, 206], [136, 220], p),
    hipL: [100 - hipW, hipY], hipR: [100 + hipW, hipY],
    shL: [100 - 27, shY], shR: [100 + 27, shY],
    head: [100, shY - 38],
  };
  // 팔: 서 있을 땐 옆으로 내림, 앉을 땐 앞으로 뻗어 가슴 앞에서 모임
  P.elbL = pt([P.shL[0] - 7, shY + 36], [P.shL[0] + 6, shY + 16], p);
  P.elbR = pt([P.shR[0] + 7, shY + 36], [P.shR[0] - 6, shY + 16], p);
  P.hanL = pt([P.shL[0] - 7, shY + 68], [93, shY + 24], p);
  P.hanR = pt([P.shR[0] + 7, shY + 68], [107, shY + 24], p);
  return P;
}
const f1 = n => n.toFixed(1);
const seg = (a, b) => `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`;
const half = (a, b, k = 0.5) => [mix(a[0], b[0], k), mix(a[1], b[1], k)];

const LOOK = {
  f: { skin: "#ffdcc2", hair: "#5a3a2a", top: "#ff7aa2", bottom: "#8a6ff0", shoe: "#ff5c8a", lace: "#fff", bg: "linear-gradient(180deg,#fff6f0,#ffe6ef)" },
  m: { skin: "#f6cfae", hair: "#2f2a28", top: "#4aa8ff", bottom: "#33415c", shoe: "#2ecc71", lace: "#fff", bg: "linear-gradient(180deg,#f2fbff,#e3f3ec)" },
};
function sneaker(x, rot, c, ink) {
  // 앞에서 본 운동화: 둥근 발등 + 흰 밑창 + 끈
  return `<g transform="translate(${x} ${ANK_Y + 2}) rotate(${rot})">
    <path d="M-15 6Q-15 -7 0 -8Q15 -7 15 6L16 13Q16 17 12 17H-12Q-16 17 -16 13Z" fill="${c}" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M-16 11.5H16V14Q16 18 12 18H-12Q-16 18 -16 14Z" fill="#fff" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M-5 -2H5M-6 2.5H6" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></g>`;
}
// 남성: 짧은 스포츠머리, 정수리가 위로 삐죽삐죽
function spikyHair(hx, hy, R, col, ink) {
  const at = (deg, r) => [hx + r * Math.cos(deg * Math.PI / 180), hy + r * Math.sin(deg * Math.PI / 180)];
  const pts = [at(-168, R + 1)];
  const n = 7, a0 = -158, a1 = -22;
  for (let i = 0; i <= n * 2; i++) {
    const a = a0 + (a1 - a0) * i / (n * 2);
    const peak = i % 2 === 1, mid = 1 - Math.abs(i / (n * 2) - 0.5) * 2;   // 가운데 가시가 더 높음
    pts.push(at(a, peak ? R + 9 + 6 * mid : R + 1));
  }
  pts.push(at(-12, R + 1));
  const d = "M" + pts.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("L") +
    `Q${hx + 14} ${hy - 20} ${hx} ${hy - 17}Q${hx - 14} ${hy - 20} ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}Z`;
  return `<path d="${d}" fill="${col}" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
}
function drawChar(p, g) {
  const P = pose(p), L = LOOK[g] || LOOK.f, ink = "#3b2f2f";
  const limb = (d, w, col) =>
    `<path d="${d}" stroke="${ink}" stroke-width="${w + 6}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<path d="${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  const hx = P.head[0], hy = P.head[1], R = 31;
  const blush = (0.35 + 0.5 * p).toFixed(2);
  const midY = (P.shL[1] + P.hipL[1]) / 2;
  // 몸통 (위는 어깨, 아래는 골반으로 살짝 둥글게)
  const torso = `M${f1(P.shL[0] - 3)} ${f1(P.shL[1])}Q100 ${f1(P.shL[1] - 7)} ${f1(P.shR[0] + 3)} ${f1(P.shR[1])}Q${f1(P.shR[0] - 3)} ${f1(midY)} ${f1(P.hipR[0] + 5)} ${f1(P.hipR[1] + 4)}Q100 ${f1(P.hipR[1] + 10)} ${f1(P.hipL[0] - 5)} ${f1(P.hipL[1] + 4)}Q${f1(P.shL[0] + 3)} ${f1(midY)} ${f1(P.shL[0] - 3)} ${f1(P.shL[1])}Z`;
  // 다리: 여성은 레깅스(발목까지), 남성은 반바지(무릎 위) + 맨다리
  const legs = g === "m"
    ? `${limb(seg(P.kneL, P.ankL), 15, L.skin)}${limb(seg(P.kneR, P.ankR), 15, L.skin)}
       ${limb(seg(P.hipL, half(P.hipL, P.kneL, 0.35)) + seg(half(P.hipL, P.kneL, 0.35), P.kneL), 16, L.skin)}${limb(seg(P.hipR, P.kneR), 16, L.skin)}
       ${limb(seg(P.hipL, half(P.hipL, P.kneL, 0.72)), 26, L.bottom)}${limb(seg(P.hipR, half(P.hipR, P.kneR, 0.72)), 26, L.bottom)}`
    : `${limb(seg(P.kneL, P.ankL), 15, L.bottom)}${limb(seg(P.kneR, P.ankR), 15, L.bottom)}
       ${limb(seg(P.hipL, P.kneL), 19, L.bottom)}${limb(seg(P.hipR, P.kneR), 19, L.bottom)}`;
  // 팔: 남성은 반팔 소매, 여성은 민소매
  const armL = seg(P.shL, P.elbL) + seg(P.elbL, P.hanL), armR = seg(P.shR, P.elbR) + seg(P.elbR, P.hanR);
  const sleeves = g === "m" ? `${limb(seg(P.shL, half(P.shL, P.elbL, 0.55)), 17, L.top)}${limb(seg(P.shR, half(P.shR, P.elbR, 0.55)), 17, L.top)}` : "";
  const hands = [P.hanL, P.hanR].map(h => `<circle cx="${f1(h[0])}" cy="${f1(h[1])}" r="7.5" fill="${L.skin}" stroke="${ink}" stroke-width="3"/>`).join("");
  // 머리카락
  const swing = Math.sin(p * Math.PI) * 6;           // 앉을 때 포니테일이 살짝 흔들림
  const hairBack = g === "f"
    ? `<path d="M${hx + 18} ${hy - 22}Q${hx + 52 + swing} ${hy - 18} ${hx + 44 + swing} ${hy + 22}Q${hx + 38 + swing} ${hy + 36} ${hx + 30 + swing * 0.5} ${hy + 30}Q${hx + 40} ${hy + 6} ${hx + 16} ${hy - 12}Z" fill="${L.hair}" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>`
    : "";
  const hairFront = g === "f"
    ? `<path d="M${hx - R} ${hy - 1}Q${hx - R + 2} ${hy - R - 6} ${hx} ${hy - R - 3}Q${hx + R - 2} ${hy - R - 6} ${hx + R} ${hy - 1}Q${hx + 18} ${hy - 16} ${hx + 4} ${hy - 12}Q${hx - 10} ${hy - 20} ${hx - R} ${hy - 1}Z" fill="${L.hair}" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
       <circle cx="${hx + 20}" cy="${hy - 24}" r="6" fill="${L.top}" stroke="${ink}" stroke-width="2.6"/>`
    : spikyHair(hx, hy, R, L.hair, ink);
  const brows = g === "m" && p > 0.4 ? `<path d="M${hx - 15} ${hy - 5}l9 3M${hx + 15} ${hy - 5}l-9 3" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>` : "";
  const lashes = g === "f" ? `<path d="M${hx - 15} ${hy + 1}l-3 -3M${hx + 15} ${hy + 1}l3 -3" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>` : "";
  const mouth = p > 0.6
    ? `<ellipse cx="${hx}" cy="${hy + 16}" rx="5" ry="${f1(mix(2, 5.5, (p - 0.6) / 0.4))}" fill="${ink}"/>`
    : `<path d="M${hx - 7} ${hy + 13}q7 7 14 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const sweat = p > 0.75 ? `<path d="M${hx - R - 6} ${hy - 12}q5 9 0 13q-5 -4 0 -13z" fill="#7cc8ff" stroke="${ink}" stroke-width="2"/>` : "";
  return `
    <ellipse cx="100" cy="${ANK_Y + 21}" rx="${f1(mix(46, 62, p))}" ry="6" fill="rgba(0,0,0,.08)"/>
    ${legs}
    ${sneaker(P.ankL[0] - 3, -6, L.shoe, ink)}${sneaker(P.ankR[0] + 3, 6, L.shoe, ink)}
    ${hairBack}
    <path d="M100 ${f1(P.shL[1] - 2)}V${f1(hy + R - 4)}" stroke="${ink}" stroke-width="15" stroke-linecap="round"/><path d="M100 ${f1(P.shL[1] - 2)}V${f1(hy + R - 4)}" stroke="${L.skin}" stroke-width="9" stroke-linecap="round"/>
    <path d="${torso}" fill="${L.top}" stroke="${ink}" stroke-width="3.6" stroke-linejoin="round"/>
    ${g === "f" ? `<path d="M${f1(P.shL[0] + 6)} ${f1(P.shL[1] - 3)}Q100 ${f1(P.shL[1] + 14)} ${f1(P.shR[0] - 6)} ${f1(P.shR[1] - 3)}" fill="none" stroke="${ink}" stroke-width="2.6"/>` : `<path d="M90 ${f1(P.shL[1] - 4)}Q100 ${f1(P.shL[1] + 4)} 110 ${f1(P.shL[1] - 4)}" fill="none" stroke="${ink}" stroke-width="2.6"/>`}
    ${limb(armL, 12, L.skin)}${limb(armR, 12, L.skin)}${sleeves}${hands}
    <circle cx="${hx}" cy="${hy}" r="${R}" fill="${L.skin}" stroke="${ink}" stroke-width="3.6"/>
    ${hairFront}
    <circle cx="${hx - 11}" cy="${hy + 3}" r="3.8" fill="${ink}"/><circle cx="${hx + 11}" cy="${hy + 3}" r="3.8" fill="${ink}"/>
    ${lashes}${brows}
    <circle cx="${hx - 20}" cy="${hy + 12}" r="6" fill="rgba(255,120,140,${blush})"/><circle cx="${hx + 20}" cy="${hy + 12}" r="6" fill="rgba(255,120,140,${blush})"/>
    ${mouth}${sweat}`;
}

// ── 비트 (앱이 직접 만드는 소리, 세트마다 다른 스타일) ──
function makeAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC(), out = ctx.createGain(), music = ctx.createGain();
  out.gain.value = 0.9; music.gain.value = 0.55;
  music.connect(out); out.connect(ctx.destination);
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const I = {
    kick(t, v = 1) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 0.003, 0.9 * v, 0.22); o.connect(g).connect(music); o.start(t); o.stop(t + 0.3); },
    noise(t, f, q, type, peak, d) { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q; env(g, t, 0.002, peak, d); s.connect(fl).connect(g).connect(music); s.start(t); s.stop(t + d + 0.05); },
    snare(t) { I.noise(t, 1800, 0.8, "bandpass", 0.5, 0.15); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 190; env(g, t, 0.002, 0.25, 0.08); o.connect(g).connect(music); o.start(t); o.stop(t + 0.12); },
    clap(t) { [0, 0.012, 0.024].forEach(x => I.noise(t + x, 1500, 1.2, "bandpass", 0.35, 0.09)); },
    hat(t, open) { I.noise(t, 8000, 0.7, "highpass", open ? 0.16 : 0.12, open ? 0.14 : 0.035); },
    rim(t) { I.tone(t, 1700, "square", 0.08, 0.03); },
    tone(t, f, type, peak, d, dest = music) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; env(g, t, 0.004, peak, d); o.connect(g).connect(dest); o.start(t); o.stop(t + d + 0.05); },
    bass(t, f, d) { const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.value = 520; fl.Q.value = 6; env(g, t, 0.005, 0.32, d); o.connect(fl).connect(g).connect(music); o.start(t); o.stop(t + d + 0.05); },
    beep(t, f) { I.tone(t, f, "sine", 0.35, 0.18, out); },
  };
  return { ctx, out, music, I };
}
const hz = semis => 440 * Math.pow(2, semis / 12);   // A4 기준 반음
// 스타일: 16칸(1마디) 패턴. bass/lead는 [칸, 근음 기준 반음, 길이(칸)]
const STYLES = [
  { name: "파워 하우스", kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], open: true,
    bass: [[2, 0, 1], [6, 12, 1], [10, 0, 1], [14, 12, 1]], lead: [[0, 12, 1], [3, 15, 1], [6, 19, 1], [9, 15, 1], [12, 24, 2]], leadType: "square" },
  { name: "힙합 그루브", kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], swing: true,
    bass: [[0, 0, 6], [7, -2, 3], [10, 3, 5]], lead: [[2, 15, 2], [14, 12, 2]], leadType: "triangle" },
  { name: "신스 런", kick: [0, 4, 8, 12], snare: [4, 12], hat: [...Array(16).keys()],
    bass: [...Array(8).keys()].map(i => [i * 2, i % 4 === 3 ? 7 : 0, 1]), lead: [...Array(16).keys()].map(i => [i, [0, 3, 7, 12, 15, 12, 7, 3][i % 8] + 12, 1]), leadType: "sawtooth" },
  { name: "라틴 리듬", kick: [0, 6, 8, 14], rim: [0, 3, 6, 10, 12], hat: [2, 6, 10, 14],
    bass: [[3, 0, 2], [6, 7, 2], [11, 0, 2], [14, 7, 2]], lead: [[0, 19, 1], [2, 17, 1], [4, 15, 2], [8, 12, 1], [10, 15, 2]], leadType: "triangle", conga: [1, 5, 7, 9, 13, 15] },
];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ── 목소리 ──
// 폰 내장 음성(무료). 아이폰은 버튼을 누를 때 한 번 말을 해야 이후에도 말할 수 있다.
// 앞의 말을 끊고(cancel) 바로 말하면 일부 폰에서 아예 안 나와서, 끊지 않고 이어서 말한다.
let koVoice = null;
function loadVoices() {
  try { koVoice = speechSynthesis.getVoices().find(x => /^ko/i.test(x.lang)) || koVoice; } catch {}
}
if ("speechSynthesis" in window) { loadVoices(); try { speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch {} }
function say(text, on) {
  if (!on || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR"; u.rate = 1.2; u.pitch = 1.05; u.volume = 1;
    if (koVoice) u.voice = koVoice;
    if (speechSynthesis.paused) speechSynthesis.resume();
    speechSynthesis.speak(u);
  } catch {}
}

// ── 화면 ──
const CSS = `
.sqt{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;font-family:inherit;color:#3b2f2f;padding:calc(env(safe-area-inset-top) + 12px) 16px calc(env(safe-area-inset-bottom) + 16px)}
.sqt .top{width:100%;max-width:480px;display:flex;justify-content:space-between;align-items:center}
.sqt .x{font-size:15px;font-weight:800;padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.06);color:inherit;border:0}
.sqt .setlbl{font-size:15px;font-weight:800;opacity:.85}
.sqt .stage{flex:1;width:100%;max-width:480px;display:flex;align-items:center;justify-content:center;position:relative;min-height:0}
.sqt svg{height:min(56vh,440px);width:auto;overflow:visible}
.sqt .big{position:absolute;top:2%;right:4%;font-size:min(18vw,88px);font-weight:900;line-height:1}
.sqt .msg{position:absolute;left:0;right:0;top:38%;text-align:center;font-size:min(22vw,110px);font-weight:900;text-shadow:0 4px 18px rgba(255,255,255,.9)}
.sqt .sub{font-size:15px;font-weight:700;opacity:.8;text-align:center;min-height:22px}
.sqt .dots{display:flex;gap:7px;justify-content:center;margin:10px 0}
.sqt .dots i{width:14px;height:14px;border-radius:50%;background:rgba(0,0,0,.1)}
.sqt .dots i.on{background:#2ecc71}
.sqt .sets{display:flex;gap:6px;justify-content:center;margin-bottom:12px}
.sqt .sets i{width:40px;height:6px;border-radius:3px;background:rgba(0,0,0,.1)}
.sqt .sets i.on{background:#2ecc71}.sqt .sets i.now{background:#ffc83d}
.sqt .btns{display:flex;gap:10px;width:100%;max-width:480px}
.sqt .btn{flex:1;padding:15px;border-radius:16px;font-size:17px;font-weight:900;border:0;background:#2ecc71;color:#fff}
.sqt .btn.g2{background:rgba(0,0,0,.07);color:inherit}
.sqt .pick{display:flex;gap:10px;justify-content:center;margin:6px 0 12px}
.sqt .pick button{padding:10px 20px;border-radius:999px;font-weight:800;font-size:15px;border:2px solid rgba(0,0,0,.18);background:#fff;color:inherit}
.sqt .pick button.on{background:#2ecc71;border-color:#2ecc71;color:#fff}
.sqt .tip{font-size:12.5px;opacity:.7;text-align:center;line-height:1.5;margin-bottom:12px}
.sqt .tg{font-size:13px;font-weight:800;opacity:.85;background:none;border:0;color:inherit}
`;

export function openSquat({ onDone } = {}) {
  if (!document.getElementById("sq-css")) { const st = document.createElement("style"); st.id = "sq-css"; st.textContent = CSS; document.head.append(st); }
  let look = (() => { try { const v = localStorage.getItem("hr-sq-g"); return v === "m" ? "m" : "f"; } catch { return "f"; } })();
  let soundOn = true, voiceOn = true;
  const el = document.createElement("div");
  el.className = "sqt";
  const paint = () => { el.style.background = LOOK[look].bg; };
  paint();
  document.body.append(el);
  const draw = p => `<svg viewBox="0 -12 200 310" aria-hidden="true">${drawChar(p, look)}</svg>`;

  let A = null, raf = 0, wake = null, state = null, done = false;
  const now = () => (A ? A.ctx.currentTime : performance.now() / 1000);
  const close = () => { cancelAnimationFrame(raf); clearInterval(state && state.sched); try { speechSynthesis.cancel(); } catch {} if (A) A.ctx.close().catch(() => {}); if (wake) wake.release().catch(() => {}); el.remove(); };

  // 시작 화면
  function intro() {
    el.innerHTML = `<div class="top"><span class="setlbl">🏋️ 스쿼트 같이 하기</span><button class="x" data-q="close">닫기</button></div>
      <div class="stage">${draw(0)}</div>
      <div class="sub" style="font-size:17px;opacity:1;font-weight:900">10회 × 4세트 · 세트 사이 10초 휴식</div>
      <div class="pick"><button data-q="look" data-v="f" class="${look === "f" ? "on" : ""}">여성</button><button data-q="look" data-v="m" class="${look === "m" ? "on" : ""}">남성</button></div>
      <div class="tip">🔊 소리를 켜 주세요${/iPhone|iPad/.test(navigator.userAgent) ? " (아이폰은 옆 무음 스위치도 꺼 주세요)" : ""}<br>운동하는 동안 화면이 꺼지지 않아요</div>
      <div class="btns"><button class="btn" data-q="start">시작하기</button></div>`;
  }
  intro();

  function startAll() {
    A = makeAudio();
    if (A) A.ctx.resume();
    say("준비", voiceOn);                      // 버튼을 누르는 순간 실제로 한 번 말해서 목소리를 깨워 둔다
    try { navigator.wakeLock && navigator.wakeLock.request("screen").then(w => { wake = w; }).catch(() => {}); } catch {}
    const styles = shuffle([...STYLES]);
    const roots = shuffle([-5, -3, 0, 2, 3]);  // E·F#·A·B·C 근처에서 세트마다 다른 조
    state = { phase: "count", t0: now(), set: 0, styles, roots, said: -1, paused: false, sched: 0, nextStep: 0 };
    renderRun();
    loop();
  }

  // 음악 예약: 세트 시작 시각부터 16분음표 단위로 0.15초 앞까지 미리 예약
  function scheduleMusic() {
    if (!A || state.phase !== "set") return;
    const S = state.styles[state.set], root = state.roots[state.set] - 12, t0 = state.t0;
    const ahead = A.ctx.currentTime + 0.15, total = REPS * 16;
    while (state.nextStep < total && t0 + state.nextStep * STEP < ahead) {
      const n = state.nextStep, s = n % 16, swing = S.swing && s % 2 ? STEP * 0.18 : 0, t = t0 + n * STEP + swing;
      if (soundOn) {
        if (S.kick.includes(s)) A.I.kick(t);
        if (S.snare && S.snare.includes(s)) A.I.snare(t);
        if (S.clap && S.clap.includes(s)) A.I.clap(t);
        if (S.rim && S.rim.includes(s)) A.I.rim(t);
        if (S.hat.includes(s)) A.I.hat(t, S.open && s % 4 === 2);
        if (S.conga && S.conga.includes(s)) A.I.tone(t, hz(root + (s % 4 === 1 ? 7 : 3)), "sine", 0.18, 0.12);
        S.bass.forEach(([p, semi, len]) => { if (p === s) A.I.bass(t, hz(root - 12 + semi), len * STEP * 0.95); });
        const bar = Math.floor(n / 16);
        if (bar % 2 === 1 || S.name === "신스 런") S.lead.forEach(([p, semi, len]) => { if (p === s) A.I.tone(t, hz(root + 12 + semi), S.leadType, 0.07, len * STEP * 0.9); });
      }
      state.nextStep++;
    }
  }

  function renderRun() {
    const s = state;
    el.innerHTML = `<div class="top"><span class="setlbl" id="sq-set"></span><button class="x" data-q="stop">그만하기</button></div>
      <div class="stage"><div id="sq-fig"></div><div class="big" id="sq-big"></div><div class="msg" id="sq-msg"></div></div>
      <div class="sub" id="sq-sub"></div>
      <div class="dots" id="sq-dots">${Array.from({ length: REPS }, () => "<i></i>").join("")}</div>
      <div class="sets" id="sq-sets">${Array.from({ length: SETS }, () => "<i></i>").join("")}</div>
      <div class="btns"><button class="btn g2" data-q="pause" id="sq-pause">일시정지</button></div>
      <div class="row" style="display:flex;gap:16px;justify-content:center;margin-top:10px"><button class="tg" data-q="snd" id="sq-snd"></button><button class="tg" data-q="vc" id="sq-vc"></button></div>`;
    syncToggles();
  }
  function syncToggles() {
    const a = el.querySelector("#sq-snd"), b = el.querySelector("#sq-vc");
    if (a) a.textContent = soundOn ? "🎵 음악 켬" : "🔇 음악 끔";
    if (b) b.textContent = voiceOn ? "🗣️ 목소리 켬" : "🤐 목소리 끔";
  }
  const $ = id => el.querySelector(id);

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!state || state.paused) return;
    const s = state, e = now() - s.t0;
    let p = 0, big = "", msg = "", sub = "", reps = 0;
    if (s.phase === "count") {                           // 쓰리 · 투 · 원
      const k = Math.floor(e);
      if (k !== s.said && k < 3) { s.said = k; say(["쓰리", "투", "원"][k], voiceOn); if (A && soundOn) A.I.beep(A.ctx.currentTime, 660); }
      msg = ["3", "2", "1"][Math.min(k, 2)]; sub = "준비하세요!";
      if (e >= 3) { s.phase = "set"; s.t0 = s.t0 + 3; s.said = -1; s.nextStep = 0; say("시작!", voiceOn); if (A && soundOn) A.I.beep(s.t0, 990); }
    } else if (s.phase === "set") {
      scheduleMusic();
      const rep = Math.floor(e / REP_SEC), f = (e % REP_SEC) / REP_SEC;
      p = (1 - Math.cos(2 * Math.PI * f)) / 2;           // 부드럽게 내려갔다 올라오기
      if (f >= 0.5 && rep !== s.said && rep < REPS) { s.said = rep; say(KOR[rep], voiceOn); if (A && soundOn) A.I.beep(A.ctx.currentTime, rep === REPS - 1 ? 1320 : 880); }   // 가장 앉았을 때 세기 + 띵
      reps = Math.min(REPS, rep + (f >= 0.5 ? 1 : 0));
      big = reps ? String(reps) : ""; sub = s.styles[s.set].name;
      if (e >= REPS * REP_SEC) {
        s.set++;
        if (s.set >= SETS) { finish(); return; }
        s.phase = "rest"; s.t0 = s.t0 + REPS * REP_SEC; s.said = -1; say("휴식", voiceOn);
      }
    } else if (s.phase === "rest") {
      const left = Math.ceil(REST - e);
      msg = String(Math.max(left, 0)); sub = `잘했어요! 다음은 ${s.set + 1}세트`; reps = REPS;
      if (left <= 3 && left >= 1 && left !== s.said) { s.said = left; say(["원", "투", "쓰리"][left - 1], voiceOn); if (A && soundOn) A.I.beep(A.ctx.currentTime, 660); }
      if (e >= REST) { s.phase = "set"; s.t0 = s.t0 + REST; s.said = -1; s.nextStep = 0; say("시작!", voiceOn); if (A && soundOn) A.I.beep(s.t0, 990); }
    }
    const fig = $("#sq-fig"); if (!fig) return;
    fig.innerHTML = draw(p);
    $("#sq-big").textContent = big; $("#sq-msg").textContent = msg; $("#sq-sub").textContent = sub;
    $("#sq-set").textContent = `${Math.min(s.set + 1, SETS)}세트 / ${SETS}`;
    el.querySelectorAll("#sq-dots i").forEach((d, i) => d.classList.toggle("on", i < reps));
    el.querySelectorAll("#sq-sets i").forEach((d, i) => { d.classList.toggle("on", i < s.set); d.classList.toggle("now", i === s.set); });
  }

  function finish() {
    done = true; cancelAnimationFrame(raf); state.phase = "done";
    say("완료! 수고하셨어요", voiceOn);
    if (A && soundOn) { const t = A.ctx.currentTime; [0, 4, 7, 12].forEach((x, i) => A.I.tone(t + i * 0.12, hz(x), "triangle", 0.25, 0.4)); }
    if (wake) wake.release().catch(() => {});
    el.innerHTML = `<div class="top"><span class="setlbl">🏋️ 스쿼트 같이 하기</span><span></span></div>
      <div class="stage">${draw(0)}<div class="msg" style="top:8%;font-size:min(14vw,64px)">완료! 🎉</div></div>
      <div class="sub" style="font-size:17px;opacity:1;font-weight:900">스쿼트 40회를 해냈어요!</div>
      <div class="sub">오늘의 운동이 자동으로 체크돼요 ✓</div>
      <div class="btns" style="margin-top:12px"><button class="btn" data-q="close">닫기</button></div>`;
    try { onDone && onDone(); } catch (e) { console.error(e); }
  }

  el.addEventListener("click", e => {
    const b = e.target.closest("[data-q]"); if (!b) return;
    const q = b.dataset.q;
    if (q === "close") close();
    else if (q === "look") { look = b.dataset.v; try { localStorage.setItem("hr-sq-g", look); } catch {} paint(); intro(); }
    else if (q === "start") startAll();
    else if (q === "stop") { state.paused = true; if (A) A.ctx.suspend(); if (confirmStop()) close(); }
    else if (q === "pause") {
      state.paused = !state.paused;
      if (A) state.paused ? A.ctx.suspend() : A.ctx.resume();
      try { state.paused ? speechSynthesis.cancel() : 0; } catch {}
      b.textContent = state.paused ? "계속하기" : "일시정지";
    }
    else if (q === "snd") { soundOn = !soundOn; if (A) A.music.gain.value = soundOn ? 0.55 : 0; syncToggles(); }
    else if (q === "vc") { voiceOn = !voiceOn; syncToggles(); }
  });
  function confirmStop() {
    // 브라우저 기본 확인창 대신 간단히 다시 누르게 한다
    const b = el.querySelector('[data-q="stop"]');
    if (b.dataset.sure) return true;
    b.dataset.sure = "1"; b.textContent = "한 번 더 누르면 종료";
    setTimeout(() => { if (!b.isConnected) return; delete b.dataset.sure; b.textContent = "그만하기"; state.paused = false; if (A) A.ctx.resume(); }, 2500);
    return false;
  }
  if (!("wakeLock" in navigator)) {} // 화면 꺼짐 방지는 지원하는 폰에서만
}
