// 스쿼트 같이 하기: 10회 × 4세트, 세트 사이 10초 휴식
// 화면 전체를 덮는 창을 띄우고, 그림 캐릭터·비트·목소리로 함께 운동한다.
// 사용: import { openSquat } from "./squat.js"; openSquat({ onDone: () => {...} })
// 이 파일은 버튼을 누를 때만 불러오므로 앱의 다른 기능과 섞이지 않는다.

const REPS = 10, SETS = 4, REST = 10, BPM = 120;
const REP_SEC = 2;                       // 1회 2초 (내려가기 1초 + 올라오기 1초) = 1마디
const STEP = 60 / BPM / 4;               // 16분음표 길이(초)
const KOR = ["하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

// ── 캐릭터 그림 (앞모습, p = 0 서 있음 ~ 1 가장 앉음) ──
const mix = (a, b, p) => a + (b - a) * p;
const pt = (a, b, p) => [mix(a[0], b[0], p), mix(a[1], b[1], p)];
function pose(p) {
  const hipY = mix(140, 200, p), hipW = mix(21, 24, p);
  const shY = hipY - mix(72, 60, p);                // 앉을수록 상체가 앞으로 숙어 짧아 보임
  const P = {
    ankL: [80, 272], ankR: [120, 272],
    kneL: pt([81, 206], [62, 222], p), kneR: pt([119, 206], [138, 222], p),
    hipL: [100 - hipW, hipY], hipR: [100 + hipW, hipY],
    shL: [100 - 30, shY], shR: [100 + 30, shY],
    head: [100, shY - 30],
  };
  // 팔: 서 있을 땐 옆으로 내림, 앉을 땐 앞으로 뻗어 가슴 앞에서 모임
  P.elbL = pt([P.shL[0] - 6, shY + 40], [P.shL[0] + 8, shY + 14], p);
  P.elbR = pt([P.shR[0] + 6, shY + 40], [P.shR[0] - 8, shY + 14], p);
  P.hanL = pt([P.shL[0] - 8, shY + 78], [92, shY + 22], p);
  P.hanR = pt([P.shR[0] + 8, shY + 78], [108, shY + 22], p);
  return P;
}
const seg = (a, b) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
const path = (...pts) => "M" + pts.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("L");

function drawClean(p) {
  const P = pose(p), red = `rgba(230,70,80,${(0.35 + 0.6 * p).toFixed(2)})`;
  const limb = (d, w, inner = "#000") =>
    `<path d="${d}" stroke="#fff" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<path d="${d}" stroke="${inner}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  const midY = (P.shL[1] + P.hipL[1]) / 2;
  const torso = `M${P.shL[0]} ${P.shL[1]}Q100 ${P.shL[1] - 6} ${P.shR[0]} ${P.shR[1]}Q${P.shR[0] - 4} ${midY} ${P.hipR[0] + 2} ${P.hipR[1]}L${P.hipL[0] - 2} ${P.hipL[1]}Q${P.shL[0] + 4} ${midY} ${P.shL[0]} ${P.shL[1]}Z`;
  return `
    ${limb(seg(P.kneL, P.ankL), 13)}${limb(seg(P.kneR, P.ankR), 13)}
    ${limb(seg(P.hipL, P.kneL), 18, red)}${limb(seg(P.hipR, P.kneR), 18, red)}
    <path d="${torso}" fill="#000" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
    <path d="${path(P.hipL, [100, P.hipL[1] + 10], P.hipR)}" fill="none" stroke="#fff" stroke-width="3"/>
    ${limb(seg(P.shL, P.elbL) + seg(P.elbL, P.hanL), 9)}
    ${limb(seg(P.shR, P.elbR) + seg(P.elbR, P.hanR), 9)}
    <path d="M100 ${P.shL[1] - 4}V${P.head[1] + 18}" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M100 ${P.shL[1] - 4}V${P.head[1] + 18}" stroke="#000" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${P.head[0]}" cy="${P.head[1]}" r="20" fill="#000" stroke="#fff" stroke-width="3"/>
    <path d="M${P.ankL[0] - 12} 276h18M${P.ankR[0] - 6} 276h18" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
}

function drawCute(p) {
  const P = pose(p), ink = "#3b2f2f";
  const limb = (d, w, col) =>
    `<path d="${d}" stroke="${ink}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `<path d="${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  const skin = "#ffd8b8", shirt = "#6fd3a0", pants = "#5b8def";
  const hx = P.head[0], hy = P.head[1] - 4;
  const blush = (0.35 + 0.5 * p).toFixed(2);
  return `
    <ellipse cx="100" cy="280" rx="${mix(52, 64, p)}" ry="7" fill="rgba(0,0,0,.08)"/>
    ${limb(seg(P.kneL, P.ankL), 16, skin)}${limb(seg(P.kneR, P.ankR), 16, skin)}
    ${limb(seg(P.hipL, P.kneL), 22, pants)}${limb(seg(P.hipR, P.kneR), 22, pants)}
    <path d="M${P.ankL[0] - 14} 274q10 -9 22 0zM${P.ankR[0] - 8} 274q10 -9 22 0z" fill="#ff8a65" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="${path([P.shL[0] - 4, P.shL[1] - 2], [P.shR[0] + 4, P.shR[1] - 2], [P.hipR[0] + 6, P.hipR[1] + 6], [P.hipL[0] - 6, P.hipL[1] + 6])}Z" fill="${shirt}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
    ${limb(seg(P.shL, P.elbL) + seg(P.elbL, P.hanL), 12, skin)}
    ${limb(seg(P.shR, P.elbR) + seg(P.elbR, P.hanR), 12, skin)}
    <circle cx="${hx}" cy="${hy}" r="30" fill="${skin}" stroke="${ink}" stroke-width="4"/>
    <path d="M${hx - 30} ${hy - 4}q4 -30 30 -32q26 2 30 32q-12 -14 -30 -14q-18 0 -30 14z" fill="#4a3428"/>
    <circle cx="${hx - 10}" cy="${hy + 4}" r="3.6" fill="${ink}"/><circle cx="${hx + 10}" cy="${hy + 4}" r="3.6" fill="${ink}"/>
    <circle cx="${hx - 19}" cy="${hy + 13}" r="6" fill="rgba(255,120,140,${blush})"/><circle cx="${hx + 19}" cy="${hy + 13}" r="6" fill="rgba(255,120,140,${blush})"/>
    ${p > 0.6 ? `<ellipse cx="${hx}" cy="${hy + 17}" rx="5" ry="${mix(2, 5, (p - 0.6) / 0.4).toFixed(1)}" fill="${ink}"/>` : `<path d="M${hx - 7} ${hy + 15}q7 7 14 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`}
    ${p > 0.75 ? `<path d="M${hx + 34} ${hy - 14}q5 9 0 13q-5 -4 0 -13z" fill="#7cc8ff" stroke="${ink}" stroke-width="2"/>` : ""}`;
}

// ── 비트 (앱이 직접 만드는 소리, 세트마다 다른 스타일) ──
function makeAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC(), out = ctx.createGain(), music = ctx.createGain();
  out.gain.value = 0.9; music.gain.value = 0.8;
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
function say(text, on) {
  if (!on || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR"; u.rate = 1.15; u.pitch = 1.05; u.volume = 1;
    const v = speechSynthesis.getVoices().find(x => /ko/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch {}
}

// ── 화면 ──
const CSS = `
.sqt{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;font-family:inherit;color:#fff;background:#000;padding:calc(env(safe-area-inset-top) + 12px) 16px calc(env(safe-area-inset-bottom) + 16px)}
.sqt.cute{background:linear-gradient(180deg,#fff7ef,#ffe9f0);color:#3b2f2f}
.sqt .top{width:100%;max-width:480px;display:flex;justify-content:space-between;align-items:center}
.sqt .x{font-size:15px;font-weight:800;padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.14);color:inherit;border:0}
.sqt.cute .x{background:rgba(0,0,0,.06)}
.sqt .setlbl{font-size:15px;font-weight:800;opacity:.85}
.sqt .stage{flex:1;width:100%;max-width:480px;display:flex;align-items:center;justify-content:center;position:relative;min-height:0}
.sqt svg{height:min(56vh,420px);width:auto}
.sqt .big{position:absolute;top:2%;right:4%;font-size:min(18vw,88px);font-weight:900;line-height:1}
.sqt .msg{position:absolute;left:0;right:0;top:40%;text-align:center;font-size:min(22vw,110px);font-weight:900;text-shadow:0 4px 18px rgba(0,0,0,.35)}
.sqt.cute .msg{text-shadow:0 4px 18px rgba(255,255,255,.8)}
.sqt .sub{font-size:15px;font-weight:700;opacity:.8;text-align:center;min-height:22px}
.sqt .dots{display:flex;gap:7px;justify-content:center;margin:10px 0}
.sqt .dots i{width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.2)}
.sqt.cute .dots i{background:rgba(0,0,0,.1)}
.sqt .dots i.on{background:#2ecc71}
.sqt .sets{display:flex;gap:6px;justify-content:center;margin-bottom:12px}
.sqt .sets i{width:40px;height:6px;border-radius:3px;background:rgba(255,255,255,.2)}.sqt.cute .sets i{background:rgba(0,0,0,.1)}
.sqt .sets i.on{background:#2ecc71}.sqt .sets i.now{background:#ffd54a}
.sqt .btns{display:flex;gap:10px;width:100%;max-width:480px}
.sqt .btn{flex:1;padding:15px;border-radius:16px;font-size:17px;font-weight:900;border:0;background:#2ecc71;color:#fff}
.sqt .btn.g2{background:rgba(255,255,255,.16);color:inherit}.sqt.cute .btn.g2{background:rgba(0,0,0,.07)}
.sqt .pick{display:flex;gap:10px;justify-content:center;margin:6px 0 12px}
.sqt .pick button{padding:10px 18px;border-radius:999px;font-weight:800;font-size:15px;border:2px solid rgba(255,255,255,.4);background:transparent;color:inherit}
.sqt.cute .pick button{border-color:rgba(0,0,0,.2)}
.sqt .pick button.on{background:#2ecc71;border-color:#2ecc71;color:#fff}
.sqt .tip{font-size:12.5px;opacity:.7;text-align:center;line-height:1.5;margin-bottom:12px}
.sqt .tg{font-size:13px;font-weight:800;opacity:.85;background:none;border:0;color:inherit}
`;

export function openSquat({ onDone } = {}) {
  if (!document.getElementById("sq-css")) { const st = document.createElement("style"); st.id = "sq-css"; st.textContent = CSS; document.head.append(st); }
  let look = (() => { try { return localStorage.getItem("hr-sq-look") || "clean"; } catch { return "clean"; } })();
  let soundOn = true, voiceOn = true;
  const el = document.createElement("div");
  el.className = "sqt" + (look === "cute" ? " cute" : "");
  document.body.append(el);
  const draw = p => `<svg viewBox="0 0 200 300" aria-hidden="true">${look === "cute" ? drawCute(p) : drawClean(p)}</svg>`;

  let A = null, raf = 0, wake = null, state = null, done = false;
  const now = () => (A ? A.ctx.currentTime : performance.now() / 1000);
  const close = () => { cancelAnimationFrame(raf); clearInterval(state && state.sched); try { speechSynthesis.cancel(); } catch {} if (A) A.ctx.close().catch(() => {}); if (wake) wake.release().catch(() => {}); el.remove(); };

  // 시작 화면
  function intro() {
    el.innerHTML = `<div class="top"><span class="setlbl">🏋️ 스쿼트 같이 하기</span><button class="x" data-q="close">닫기</button></div>
      <div class="stage">${draw(0)}</div>
      <div class="sub" style="font-size:17px;opacity:1;font-weight:900">10회 × 4세트 · 세트 사이 10초 휴식</div>
      <div class="pick"><button data-q="look" data-v="clean" class="${look === "clean" ? "on" : ""}">깔끔한</button><button data-q="look" data-v="cute" class="${look === "cute" ? "on" : ""}">귀여운</button></div>
      <div class="tip">🔊 소리를 켜 주세요${/iPhone|iPad/.test(navigator.userAgent) ? " (아이폰은 옆 무음 스위치도 꺼 주세요)" : ""}<br>운동하는 동안 화면이 꺼지지 않아요</div>
      <div class="btns"><button class="btn" data-q="start">시작하기</button></div>`;
  }
  intro();

  function startAll() {
    A = makeAudio();
    if (A) A.ctx.resume();
    say(" ", voiceOn);                         // 아이폰: 버튼을 누를 때 목소리를 한 번 깨워 둔다
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
      if (f >= 0.5 && rep !== s.said && rep < REPS) { s.said = rep; say(KOR[rep], voiceOn); }   // 가장 앉았을 때 세기
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
    else if (q === "look") { look = b.dataset.v; try { localStorage.setItem("hr-sq-look", look); } catch {} el.className = "sqt" + (look === "cute" ? " cute" : ""); intro(); }
    else if (q === "start") startAll();
    else if (q === "stop") { state.paused = true; if (A) A.ctx.suspend(); if (confirmStop()) close(); }
    else if (q === "pause") {
      state.paused = !state.paused;
      if (A) state.paused ? A.ctx.suspend() : A.ctx.resume();
      try { state.paused ? speechSynthesis.cancel() : 0; } catch {}
      b.textContent = state.paused ? "계속하기" : "일시정지";
    }
    else if (q === "snd") { soundOn = !soundOn; if (A) A.music.gain.value = soundOn ? 0.8 : 0; syncToggles(); }
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
