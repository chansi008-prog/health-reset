// 건강 Reset 프로그램 — 화면과 동작
import { initStore, auth, get, set, update, remove, watch, now, TS, testMode } from "./store.js";

// ── 날짜: 하루 기준은 한국 시간 00:00, 날짜는 "일 번호"(1970-01-01부터 며칠째)로 다룬다 ──
const DAY = 864e5, KST = 9 * 3600e3;
const dayOf = ms => Math.floor((ms + KST) / DAY);
const dayStartMs = d => d * DAY - KST;
const today = () => dayOf(now());
const dDate = d => new Date(d * DAY);
const md = d => `${dDate(d).getUTCMonth() + 1}/${dDate(d).getUTCDate()}`;
const dow = d => dDate(d).getUTCDay();
const dayFromInput = s => { const [y, m, dd] = s.split("-").map(Number); return Date.UTC(y, m - 1, dd) / DAY; };
const inputFromDay = d => dDate(d).toISOString().slice(0, 10);
const hhmm = ms => { const t = new Date(ms + KST); return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`; };

const ITEMS = [["m", "🌅", "것모닝"], ["l", "🍱", "점심식사"], ["n", "🌙", "것나잇"], ["e", "🏃", "운동"]];
const MAX_ADMINS = 10;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hex = s => Array.from(new TextEncoder().encode(s)).map(b => b.toString(16).padStart(2, "0")).join("");
const acctKey = (name, tail) => `${hex(name)}_${tail}`;
const emailOf = (key, k) => `${key}.${k}@health-reset.app`;
const rnd = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const $ = sel => document.querySelector(sel);

// ── 상태 ──
const S = {
  ready: false, uid: null, pid: undefined, me: null, superPid: null,
  users: {}, cycles: {}, groups: {}, adminOf: {}, allAdmins: {},
  cid: null, nextCid: null, myGid: null, myNextGid: null, viewGid: null,
  members: {}, checks: {}, thumbsToday: {}, resets: {}, groupCodes: {},
  tab: "today", view: "login", gridMode: "grid", resetPid: null,
};
const subs = {};
function sub(key, path, cb) {
  if (subs[key] && subs[key].path === path) return;
  if (subs[key]) subs[key].off();
  if (!path) { delete subs[key]; return; }
  subs[key] = { path, off: watch(path, cb) };
}
function unsubAll() { Object.keys(subs).forEach(k => { subs[k].off(); delete subs[k]; }); }

const isSuper = () => !!S.pid && S.superPid === S.pid;
const myAdminGids = () => Object.keys(S.adminOf || {});
const isAdmin = () => isSuper() || myAdminGids().length > 0;
const canManage = gid => isSuper() || !!(S.adminOf || {})[gid];
const userName = pid => (S.users[pid] || {}).name || "(알 수 없음)";
function dispName(pid, list) {
  const u = S.users[pid] || {};
  const dup = (list || []).some(p => p !== pid && (S.users[p] || {}).name === u.name);
  return dup ? `${u.name}(${u.tail})` : (u.name || "(알 수 없음)");
}

// ── 회차 고르기: 진행 중 > 모집 중 > 예정 > 가장 최근 ──
function pickCycles() {
  const t = today(), list = Object.entries(S.cycles || {}).map(([id, c]) => ({ id, ...c })).sort((a, b) => a.s - b.s);
  const active = list.find(c => c.s <= t && t <= c.e);
  const recruiting = list.find(c => dayOf(c.rsMs) <= t && t < c.s);
  const upcoming = list.find(c => c.s > t);
  const cur = active || recruiting || upcoming || list.at(-1) || null;
  S.cid = cur ? cur.id : null;
  S.nextCid = active && recruiting ? recruiting.id : null;
}
const cyc = id => (id && S.cycles[id]) ? { id, ...S.cycles[id] } : null;
function cycleState(c) {
  if (!c) return "none";
  const t = today();
  if (t < dayOf(c.rsMs)) return "planned";
  if (t < c.s) return "recruit";
  if (t <= c.e) return "active";
  return "ended";
}

// ── 시작 ──
const toastEl = (() => { let t; return msg => { let el = $(".toast"); if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.append(el); } el.textContent = msg; el.hidden = false; clearTimeout(t); t = setTimeout(() => el.remove(), 2600); }; })();
const toast = toastEl;

async function boot() {
  await initStore();
  auth.onChange(uid => {
    S.uid = uid;
    unsubAll();
    S.pid = undefined; S.me = null; S.adminOf = {}; S.myGid = null;
    if (!uid) { S.ready = true; S.view = S.view === "signup" || S.view === "forgot" ? S.view : "login"; render(); return; }
    S.ready = false; render();
    sub("authmap", `auth/${uid}`, pid => {
      S.pid = pid || null;
      if (!pid) {
        // 비밀번호 재설정 승인을 기다리는 새 기기이거나, 다른 기기에서 재설정되어 연결이 끊긴 기기
        S.resetPid = localStorage.getItem("hr-reset-pid");
        S.view = S.resetPid ? "waiting" : "unlinked";
        if (S.resetPid) watchResetWait();
        S.ready = true; render(); return;
      }
      localStorage.removeItem("hr-reset-pid");
      S.view = "app";
      startData();
    });
  });
  setInterval(() => { const t = today(); if (t !== S._lastDay) { S._lastDay = t; if (S.pid) { pickCycles(); followCycle(); } render(); } }, 30e3);
  S._lastDay = today();
}

function startData() {
  sub("me", `users/${S.pid}`, v => { S.me = v; render(); });
  sub("users", "users", v => { S.users = v || {}; render(); });
  sub("super", "meta/super", v => { S.superPid = v || null; followAdmin(); render(); });
  sub("groups", "groups", v => { S.groups = v || {}; render(); });
  sub("cycles", "cycles", v => { S.cycles = v || {}; pickCycles(); followCycle(); S.ready = true; render(); });
  sub("adminOf", `adminOf/${S.pid}`, v => { S.adminOf = v || {}; followAdmin(); followCycle(); render(); });
}
function followCycle() {
  sub("memberOf", S.cid ? `memberOf/${S.cid}/${S.pid}` : null, v => { S.myGid = v || null; followGroup(); render(); });
  sub("memberOfNext", S.nextCid ? `memberOf/${S.nextCid}/${S.pid}` : null, v => { S.myNextGid = v || null; render(); });
  if (!S.nextCid) S.myNextGid = null;
  if (!S.cid) { S.myGid = null; followGroup(); }
}
function followGroup() {
  const gids = Object.keys(S.groups || {});
  if (!S.viewGid || (!isAdmin() && S.viewGid !== S.myGid)) S.viewGid = S.myGid || myAdminGids()[0] || (isSuper() ? gids[0] : null) || null;
  const g = S.viewGid, c = S.cid;
  sub("members", g && c ? `members/${c}/${g}` : null, v => { S.members = v || {}; render(); });
  sub("checks", g && c && (S.myGid === g || isAdmin()) ? `checks/${c}/${g}` : null, v => { S.checks = v || {}; render(); });
  sub("thumbsToday", g && c && (S.myGid === g || isAdmin()) ? `thumbs/${c}/${g}/${today()}` : null, v => { S.thumbsToday = v || {}; render(); });
  if (!g || !c) { S.members = {}; S.checks = {}; S.thumbsToday = {}; }
}
function followAdmin() {
  if (isAdmin()) {
    sub("resets", "resets", v => { S.resets = v || {}; render(); });
    const gids = isSuper() ? Object.keys(S.groups || {}) : myAdminGids();
    gids.forEach(g => sub(`code-${g}`, `groupCode/${g}`, v => { S.groupCodes[g] = v; render(); }));
    if (!S._memLoaded) { S._memLoaded = true; setTimeout(loadAllMemberOf, 500); }
  } else sub("resets", null);
}

// ── 기록 계산 ──
const validAt = (ts, d) => typeof ts === "number" && dayOf(ts) === d;
function dayCount(pid, d, checks = S.checks) {
  const r = ((checks[pid] || {})[d]) || {};
  return ITEMS.filter(([k]) => validAt(r[k], d)).length;
}
const hasPhoto = (pid, d, checks = S.checks) => validAt((((checks[pid] || {})[d]) || {}).p, d);
function personStats(pid, c, checks = S.checks, members = S.members) {
  if (!c) return { rate: 0, streak: 0, done: 0, days: 0 };
  const join = members[pid] && members[pid].at ? Math.max(c.s, dayOf(members[pid].at)) : c.s;
  const last = Math.min(today(), c.e);
  let total = 0, done = 0, days = 0;
  for (let d = join; d <= last; d++) { const n = dayCount(pid, d, checks); total += n; days++; if (n === 4) done++; }
  let streak = 0;
  for (let d = last; d >= join; d--) {
    const n = dayCount(pid, d, checks);
    if (n === 4) streak++; else if (d === today()) continue; else break;
  }
  return { rate: days ? Math.round(total / (days * 4) * 100) : 0, streak, done, days };
}

// ── 화면 ──
function render() {
  const app = $("#app");
  if (!S.ready) { app.innerHTML = header() + `<main><div class="card center note">불러오는 중…</div></main>`; return; }
  if (!S.uid) { app.innerHTML = header() + `<main>${S.view === "signup" ? vSignup() : S.view === "forgot" ? vForgot() : vLogin()}</main>`; return; }
  if (S.view === "waiting") { app.innerHTML = header() + `<main>${vWaiting()}</main>`; return; }
  if (S.view === "unlinked") { app.innerHTML = header() + `<main>${vUnlinked()}</main>`; return; }
  const tabs = [["today", "✅", "오늘"], ["group", "👥", "우리 그룹"], ["grid", "📊", "전체 표"], ["mine", "📅", "내 기록"]];
  if (isAdmin()) tabs.push(["admin", "⚙️", "관리"]);
  if (!tabs.some(t => t[0] === S.tab)) S.tab = "today";
  const body = { today: vToday, group: vGroup, grid: vGrid, mine: vMine, admin: vAdmin }[S.tab]();
  const resetN = isAdmin() ? visibleResets().length : 0;
  const keep = keepInputs();
  app.innerHTML = header() + `<main>${body}</main><nav class="tabs">${tabs.map(([k, e, t]) => `<button data-tab="${k}" class="${S.tab === k ? "on" : ""}"><em>${e}</em>${t}${k === "admin" && resetN ? ` <span class="pill o" style="padding:1px 6px">${resetN}</span>` : ""}</button>`).join("")}</nav>`;
  restoreInputs(keep);
}
// 실시간 갱신으로 다시 그려도 입력 중인 글자가 사라지지 않게
function keepInputs() { const o = {}; document.querySelectorAll("input[id],select[id]").forEach(i => { o[i.id] = i.type === "checkbox" ? i.checked : i.value; }); const f = document.activeElement && document.activeElement.id; return { o, f }; }
function restoreInputs({ o, f }) { for (const [id, v] of Object.entries(o)) { const i = document.getElementById(id); if (i && !i.dataset.fresh) { if (i.type === "checkbox") i.checked = v; else i.value = v; } } if (f) { const i = document.getElementById(f); if (i) i.focus(); } }

function header() {
  const c = cyc(S.cid), st = cycleState(c);
  let chip = "";
  if (S.uid && S.pid && c) {
    if (st === "active") chip = `${esc(c.name)} · ${today() - c.s + 1}일째 / ${c.e - c.s + 1}일`;
    else if (st === "recruit") chip = `${esc(c.name)} 모집 중 · 시작 ${md(c.s)}`;
    else if (st === "planned") chip = `${esc(c.name)} 예정 · 모집 ${md(dayOf(c.rsMs))}부터`;
    else chip = `${esc(c.name)} 종료`;
  }
  return (testMode ? `<div class="test">테스트 모드 — 이 기기 안에서만 저장돼요</div>` : "") +
    `<header class="title"><div class="trow"><h1>건강 Reset 프로그램</h1><span class="dream">DreamUs</span></div>${chip ? `<span class="chip">${chip}</span>` : ""}</header>`;
}

// 로그인 / 가입 / 비밀번호 찾기
const fld = (id, label, attrs = "") => `<div class="lbl">${label}</div><input class="inp" id="${id}" ${attrs}>`;
function vLogin() {
  return `<div class="card">
    <div class="h mb">로그인</div>
    ${fld("li-name", "이름", 'maxlength="8" autocomplete="off"')}
    ${fld("li-tail", "전화번호 뒷자리 4개", 'inputmode="numeric" maxlength="4" pattern="[0-9]*"')}
    ${fld("li-pin", "비밀번호 (숫자 6자리)", 'type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*"')}
    <div class="err" id="li-err"></div>
    <button class="btn g" data-act="login">로그인</button>
  </div>
  <div class="center mt"><span class="note">처음이에요 · </span><button class="link" data-act="go-signup">가입하기</button></div>
  <div class="center mt"><button class="note" style="text-decoration:underline" data-act="go-forgot">비밀번호를 잊었어요</button></div>`;
}
function vSignup() {
  return `<div class="card">
    <div class="h mb">가입하기</div>
    ${fld("su-code", "그룹 코드 (또는 관리자 초대 코드)", 'inputmode="numeric" maxlength="6" pattern="[0-9]*" placeholder="관리자에게 받은 숫자"')}
    ${fld("su-name", "이름", 'maxlength="8" autocomplete="off"')}
    ${fld("su-tail", "전화번호 뒷자리 4개", 'inputmode="numeric" maxlength="4" pattern="[0-9]*"')}
    ${fld("su-pin", "비밀번호 (숫자 6자리)", 'type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*"')}
    ${fld("su-pin2", "비밀번호 한 번 더", 'type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*"')}
    <div class="err" id="su-err"></div>
    <button class="btn g" data-act="signup">참가하기</button>
  </div>
  <div class="center mt"><span class="note">이미 계정이 있어요 · </span><button class="link" data-act="go-login">로그인</button></div>`;
}
function vForgot() {
  return `<div class="card">
    <div class="h">비밀번호 재설정</div>
    <div class="note mb">새 비밀번호를 정하고 요청하면, 우리 그룹 관리자가 승인한 뒤 바로 쓸 수 있어요.</div>
    ${fld("fg-name", "이름", 'maxlength="8" autocomplete="off"')}
    ${fld("fg-tail", "전화번호 뒷자리 4개", 'inputmode="numeric" maxlength="4" pattern="[0-9]*"')}
    ${fld("fg-pin", "새 비밀번호 (숫자 6자리)", 'type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*"')}
    ${fld("fg-pin2", "새 비밀번호 한 번 더", 'type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*"')}
    <div class="err" id="fg-err"></div>
    <button class="btn" data-act="forgot">재설정 요청하기</button>
  </div>
  <div class="center mt"><button class="link" data-act="go-login">로그인으로 돌아가기</button></div>`;
}
function vWaiting() {
  const info = S.waitInfo || {};
  return `<div class="card center">
    <div style="font-size:40px">⏳</div>
    <div class="h mt">관리자 승인을 기다리고 있어요</div>
    <div class="note mt">승인되면 이 화면이 자동으로 바뀌어요.<br>급하면 관리자에게 연락해 주세요.</div>
    ${info.admins ? `<div class="card mt" style="background:#fafafa"><div class="lbl">우리 그룹 관리자</div><div class="h">${esc(info.admins)}</div></div>` : ""}
    ${info.denied ? `<div class="err mt">요청이 거절되었어요. 관리자에게 문의해 주세요.</div>` : ""}
    <button class="btn l mt" data-act="cancel-wait">취소하고 로그인 화면으로</button>
  </div>`;
}
function vUnlinked() {
  return `<div class="card center"><div class="h">이 기기의 로그인이 끝났어요</div>
    <div class="note mt">다른 기기에서 비밀번호를 바꿨거나, 가입이 끝나지 않았어요. 다시 로그인해 주세요.</div>
    <button class="btn mt" data-act="logout">다시 로그인</button></div>`;
}

// 참가 카드 (그룹에 아직 없을 때)
function vJoin(cid, label) {
  const c = cyc(cid), st = cycleState(c);
  if (!c) return `<div class="card"><div class="h">아직 회차가 없어요</div><div class="note mt">관리자가 회차를 만들면 그룹 코드로 참가할 수 있어요.</div></div>`;
  const g = S.groups && Object.values(S.groups).some(x => x.openUntil > now());
  const open = st === "recruit" || (st === "active" && g);
  return `<div class="card">
    <div class="h">${esc(label || c.name)} 참가하기</div>
    <div class="note mb">${st === "recruit" ? `모집 기간: ${md(dayOf(c.rsMs))} ~ ${md(c.s - 1)} · 활동 ${md(c.s)} ~ ${md(c.e)}` : st === "active" ? "활동 중이에요. 관리자가 추가 참가를 열어 두었다면 들어올 수 있어요." : st === "planned" ? `모집은 ${md(dayOf(c.rsMs))}부터예요.` : "이 회차는 끝났어요."}</div>
    ${fld("jn-code", "그룹 코드 (또는 관리자 초대 코드)", 'inputmode="numeric" maxlength="6" pattern="[0-9]*"')}
    <div class="err" id="jn-err"></div>
    <button class="btn g" data-act="join" data-cid="${cid}" >참가하기</button>
  </div>`;
}
function vSuperStart() {
  if (S.superPid) return "";
  return `<div class="card" style="border:2px solid var(--acc)">
    <div class="h">🚀 총관리자로 시작하기</div>
    <div class="note mt mb">앱을 처음 여는 사람이 한 번만 누를 수 있어요. 누르면 그룹과 관리자를 정할 수 있어요.</div>
    <button class="btn g" data-act="become-super">총관리자로 시작하기</button>
  </div>`;
}

// 오늘
function vToday() {
  const c = cyc(S.cid), st = cycleState(c), d = today();
  let out = vSuperStart();
  if (S.nextCid && !S.myNextGid) out += vJoin(S.nextCid, `다음 회차(${cyc(S.nextCid).name})`);
  if (!S.myGid) return out + vJoin(S.cid) + (isAdmin() ? `<div class="note center">관리 탭에서 그룹과 회차를 설정할 수 있어요.</div>` : "");
  const mine = ((S.checks[S.pid] || {})[d]) || {};
  const can = st === "active";
  const n = ITEMS.filter(([k]) => validAt(mine[k], d)).length;
  const th = S.thumbsToday[S.pid];
  const ps = personStats(S.pid, c);
  out += `<div class="h" style="margin:2px 4px 10px">${esc(userName(S.pid))}님, ${can ? "오늘도 화이팅! 💪" : st === "recruit" ? `${md(c.s)}부터 시작해요!` : "수고하셨어요!"}</div>
  <div class="card">
    <div class="row mb"><span class="h">오늘의 체크</span><span class="done">${n} / 4</span></div>
    <div class="cks">${ITEMS.map(([k, e, t]) => { const on = validAt(mine[k], d); return `<button class="ckb ${on ? "on" : "off"}" data-act="check" data-k="${k}" ${can ? "" : "disabled"}><em>${e}</em>${t}${on ? `<span class="t">✓ ${hhmm(mine[k])}</span>` : ""}</button>`; }).join("")}</div>
    <div class="note mt">것모닝·것나잇 = 프로틴·유산균으로 장(gut) 튼튼! · 오늘 안에는 다시 눌러 취소할 수 있어요</div>
  </div>
  <div class="card">
    <div class="row mb"><span class="h">📷 오늘의 사진</span><span class="note">하루 1장 · 선택</span></div>
    ${th && validAt(th.t, d)
      ? `<button class="ph" style="height:160px;width:100%" data-act="photo" data-pid="${S.pid}" data-day="${d}"><img src="${th.th}" alt=""></button>
         <div class="row mt"><span class="note">${hhmm(th.t)} 올림</span>${can ? `<label class="link">다시 올리기<input type="file" accept="image/*" id="ph-file2" data-act-change="upload" hidden></label>` : ""}</div>`
      : can ? `<label class="ph empty" style="height:110px;cursor:pointer">📷<div style="margin-top:4px">사진 찍기 · 앨범에서 고르기</div><input type="file" accept="image/*" id="ph-file" data-act-change="upload" hidden></label>`
      : `<div class="note">활동 기간에 올릴 수 있어요.</div>`}
  </div>
  <div class="stats">
    <div class="card"><div class="lbl">오늘</div><div class="big">${n}<small>/4</small></div></div>
    <div class="card"><div class="lbl">내 달성률</div><div class="big">${ps.rate}%</div></div>
    <div class="card"><div class="lbl">연속 완료</div><div class="big">${ps.streak}<small>일</small></div></div>
  </div>
  ${can && now() % DAY > 0 && hhmm(now()) >= "23:30" ? `<div class="warnbox">오늘 인증이 곧 마감돼요 (자정 기준)</div>` : ""}`;
  return out;
}

function groupPicker() {
  if (!isAdmin()) return "";
  const gids = Object.keys(S.groups || {});
  if (gids.length < 2) return "";
  return `<div class="seg">${gids.map(g => `<button data-act="view-group" data-gid="${g}" class="${S.viewGid === g ? "on" : ""}">${esc(S.groups[g].name)}${canManage(g) && !isSuper() ? " ★" : ""}</button>`).join("")}</div>`;
}
const memberPids = () => Object.keys(S.members || {}).sort((a, b) => userName(a).localeCompare(userName(b), "ko"));

// 우리 그룹
function vGroup() {
  const c = cyc(S.cid), d = today();
  if (!S.viewGid) return groupPicker() + `<div class="card note center">아직 그룹에 참가하지 않았어요.</div>`;
  const pids = memberPids();
  const full = pids.filter(p => dayCount(p, d) === 4).length;
  const pct = pids.length ? Math.round(full / pids.length * 100) : 0;
  return groupPicker() + `<div class="card row">
      <div><div class="lbl">${esc((S.groups[S.viewGid] || {}).name || "")} · 오늘 4개 모두 완료</div><div class="big">${full}<small> / ${pids.length}명</small></div></div>
      <div style="width:64px;height:64px;border-radius:50%;background:conic-gradient(var(--acc) 0 ${pct}%,#eee ${pct}% 100%);display:flex;align-items:center;justify-content:center"><div style="width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px">${pct}%</div></div>
    </div>
    <div class="card" style="padding:6px 14px">
      ${pids.length ? pids.map(p => {
        const r = ((S.checks[p] || {})[d]) || {}, th = S.thumbsToday[p];
        return `<div class="mem"><div class="av">${esc(userName(p).slice(0, 1))}</div><button class="n" style="text-align:left" data-act="person" data-pid="${p}">${esc(dispName(p, pids))}${p === S.pid ? " (나)" : ""}</button>
          <div style="display:flex;gap:3px">${ITEMS.map(([k, e]) => `<div class="ck${validAt(r[k], d) ? "" : " no"}">${e}</div>`).join("")}</div>
          ${th && validAt(th.t, d) ? `<button class="ph sq" data-act="photo" data-pid="${p}" data-day="${d}"><img src="${th.th}" alt=""></button>` : `<div class="ph sq empty" style="font-size:11px">－</div>`}</div>`;
      }).join("") : `<div class="note center" style="padding:14px">아직 참가자가 없어요.</div>`}
    </div>
    <div class="note center">🌅 것모닝 · 🍱 점심 · 🌙 것나잇 · 🏃 운동 · 오른쪽은 오늘 사진</div>`;
}

// 전체 표 · 순위
function vGrid() {
  const c = cyc(S.cid);
  if (!S.viewGid || !c) return groupPicker() + `<div class="card note center">표시할 회차가 없어요.</div>`;
  const pids = memberPids(), last = Math.min(today(), c.e);
  const days = []; for (let d = c.s; d <= last; d++) days.push(d);
  const seg = `<div class="seg"><button data-act="grid-mode" data-m="grid" class="${S.gridMode === "grid" ? "on" : ""}">날짜별 표</button><button data-act="grid-mode" data-m="rank" class="${S.gridMode === "rank" ? "on" : ""}">달성률 순위</button></div>`;
  if (S.gridMode === "rank") {
    const rows = pids.map(p => ({ p, ...personStats(p, c) })).sort((a, b) => b.rate - a.rate || b.streak - a.streak);
    let rank = 0, prev = null;
    return groupPicker() + seg + `<div class="card">${rows.map((r, i) => { if (r.rate !== prev) { rank = i + 1; prev = r.rate; } return `<div class="li"><b style="width:28px">${rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}</b><span class="grow">${esc(dispName(r.p, pids))}</span><span class="note">연속 ${r.streak}일</span><b>${r.rate}%</b></div>`; }).join("") || `<div class="note center">아직 기록이 없어요.</div>`}</div>`;
  }
  if (!days.length) return groupPicker() + seg + `<div class="card note center">${md(c.s)}부터 기록이 쌓여요.</div>`;
  const shown = days.slice().reverse();
  return groupPicker() + seg + `<div class="card" style="padding:10px 10px"><div class="gridwrap"><table class="grid">
    <tr><th></th>${shown.map(d => `<th>${md(d)}</th>`).join("")}</tr>
    ${pids.map(p => `<tr><td>${esc(dispName(p, pids))}</td>${shown.map(d => { const n = dayCount(p, d); return `<td><button data-act="cell" data-pid="${p}" data-day="${d}"><span class="lv l${n}">${n}</span></button>${hasPhoto(p, d) ? `<span class="cam">📷</span>` : ""}</td>`; }).join("")}</tr>`).join("")}
  </table></div>
  <div class="note mt">숫자 = 그날 체크 개수(0~4) · 📷 = 사진 있음 · 칸을 누르면 그날 기록 · 최근 날짜가 왼쪽</div></div>`;
}

// 내 기록
function vMine() {
  const c = cyc(S.cid);
  if (!S.myGid || !c) return `<div class="card note center">참가한 회차가 없어요.</div>` + vMyInfo();
  const ps = personStats(S.pid, c), t = today();
  const cells = [];
  for (let i = 0; i < dow(c.s); i++) cells.push(`<div class="c out"></div>`);
  for (let d = c.s; d <= c.e; d++) {
    const n = dayCount(S.pid, d), cls = d > t ? "fut" : n === 4 ? "full" : n > 0 ? "half" : "";
    cells.push(`<button class="c ${cls}${d === t ? " today" : ""}" data-act="cell" data-pid="${S.pid}" data-day="${d}" ${d > t ? "disabled" : ""}>${dDate(d).getUTCDate()}</button>`);
  }
  return `<div class="stats">
      <div class="card"><div class="lbl">달성률</div><div class="big">${ps.rate}%</div></div>
      <div class="card"><div class="lbl">연속</div><div class="big">${ps.streak}<small>일</small></div></div>
      <div class="card"><div class="lbl">완료일</div><div class="big">${ps.done}<small>/${ps.days}</small></div></div>
    </div>
    <div class="card"><div class="row mb"><b>${esc(c.name)}</b><span class="note">${md(c.s)} ~ ${md(c.e)}</span></div>
      <div class="cal">${"일월화수목금토".split("").map(w => `<div class="w">${w}</div>`).join("")}${cells.join("")}</div>
      <div class="note mt"><span style="color:var(--acc)">■</span> 4개 모두 &nbsp;<span style="color:#bfe8cf">■</span> 일부 &nbsp;<span style="color:#ddd">■</span> 없음</div></div>
    <div class="card"><div class="row mb"><span class="lbl">내 사진 모아보기</span></div><div class="gal" id="my-gal">${S.myGal ? S.myGal : `<div class="note">불러오는 중…</div>`}</div></div>
    ${vMyInfo()}`;
}
function vMyInfo() {
  return `<div class="card"><div class="lbl">내 정보</div>
    <div class="row mt"><b>${esc(S.me ? S.me.name : "")} <span class="note">(${esc(S.me ? S.me.tail : "")})</span></b>${isSuper() ? `<span class="pill k">총관리자</span>` : isAdmin() ? `<span class="pill g">관리자</span>` : ""}</div>
    <details class="mt"><summary class="note">관리자 초대 코드 입력</summary>
      <input class="inp" id="inv-code" inputmode="numeric" maxlength="6" placeholder="6자리 초대 코드"><button class="btn sm" data-act="claim">입력</button></details>
    <button class="btn l mt" data-act="logout">로그아웃</button></div>`;
}
async function loadMyGallery() {
  const c = cyc(S.cid);
  if (!c || !S.myGid) return;
  const last = Math.min(today(), c.e), ds = [];
  for (let d = last; d >= c.s; d--) if (hasPhoto(S.pid, d)) ds.push(d);
  if (!ds.length) { S.myGal = `<div class="note">아직 올린 사진이 없어요.</div>`; render(); return; }
  const ths = await Promise.all(ds.map(d => get(`thumbs/${S.cid}/${S.myGid}/${d}/${S.pid}`)));
  S.myGal = ds.map((d, i) => ths[i] ? `<button class="ph" data-act="photo" data-pid="${S.pid}" data-day="${d}"><img src="${ths[i].th}" alt="${md(d)}"></button>` : "").join("");
  render();
}

// 관리
function visibleResets() {
  return Object.entries(S.resets || {}).filter(([pid]) => {
    if (isSuper()) return true;
    const gidsCur = [S.cid, S.nextCid].filter(Boolean);
    return gidsCur.some(c => S.allMemberOf && S.allMemberOf[c] && canManage(S.allMemberOf[c][pid]));
  });
}
function vAdmin() {
  const groups = S.groups || {}, gids = Object.keys(groups);
  const manageGids = isSuper() ? gids : myAdminGids();
  let out = "";
  // 재설정 요청
  const rs = visibleResets();
  out += `<div class="card"><div class="row"><span class="h">🔑 비밀번호 재설정 요청</span><span class="pill ${rs.length ? "o" : ""}">${rs.length}건</span></div>
    ${rs.map(([pid, r]) => `<div class="li"><div class="av">${esc(userName(pid).slice(0, 1))}</div><div class="grow"><b>${esc(userName(pid))} (${esc((S.users[pid] || {}).tail)})</b><div class="note">${md(dayOf(r.at))} ${hhmm(r.at)} 요청</div></div></div>
      <div class="warnbox">⚠️ 승인 전에 카톡이나 전화로 본인인지 꼭 확인하세요</div>
      <div class="row"><button class="btn g" style="flex:1" data-act="reset-ok" data-pid="${pid}">본인 확인 · 승인</button><button class="btn l" style="flex:.5" data-act="reset-no" data-pid="${pid}">거절</button></div>`).join("") || `<div class="note mt">요청이 없어요.</div>`}</div>`;
  // 회차
  const cl = Object.entries(S.cycles || {}).map(([id, c]) => ({ id, ...c })).sort((a, b) => b.s - a.s);
  out += `<div class="card"><div class="h mb">🗓️ 회차 일정 <span class="note">(모든 그룹 공통)</span></div>
    ${cl.map(c => { const st = cycleState(c), locked = now() >= c.rsMs; return `<div class="li"><div class="grow"><b>${esc(c.name)}</b> <span class="pill ${st === "active" ? "k" : st === "recruit" ? "g" : ""}">${{ planned: "예정", recruit: "모집 중", active: "진행 중", ended: "종료" }[st]}</span>
      <div class="note">모집 ${md(dayOf(c.rsMs))}~${md(c.s - 1)} · 활동 ${md(c.s)}~${md(c.e)}${locked && !isSuper() ? " · 🔒" : ""}</div></div>
      ${!locked || isSuper() ? `<button class="btn sm w" data-act="cycle-edit" data-cid="${c.id}">수정</button>` : ""}</div>`; }).join("") || `<div class="note mb">아직 회차가 없어요.</div>`}
    ${S.cycEdit !== undefined ? vCycleForm() : `<button class="btn mt" data-act="cycle-new">＋ 새 회차 만들기</button>`}</div>`;
  // 그룹별 관리
  for (const g of manageGids) {
    const grp = groups[g]; if (!grp) continue;
    const code = S.groupCodes[g];
    const open = grp.openUntil > now();
    const mem = S.adminMembers && S.adminMembers[g] ? S.adminMembers[g] : null;
    const admins = Object.keys(grp.admins || {});
    out += `<div class="card"><div class="row"><span class="h">👥 ${esc(grp.name)}</span><span class="pill">코드 ${esc(code || "…")}</span></div>
      <div class="note mt">참가자는 가입할 때 이 그룹 코드를 넣어요. 모집 기간에만 열려요.</div>
      <div class="li"><div class="grow"><b>추가 참가</b><div class="note">${open ? `열림 · ${md(dayOf(grp.openUntil))} ${hhmm(grp.openUntil)}까지` : "닫힘 (활동 중 늦게 온 사람용)"}</div></div>
        ${open ? `<button class="btn sm l" data-act="open-close" data-gid="${g}">닫기</button>` : `<select id="open-days-${g}" class="inp" style="width:auto;margin:0;padding:6px"><option value="1">1일</option><option value="3" selected>3일</option><option value="7">7일</option></select><button class="btn sm g" data-act="open-join" data-gid="${g}">열기</button>`}</div>
      <div class="li"><div class="grow"><b>관리자</b> <span class="note">${admins.length}/${MAX_ADMINS}</span><div class="note">${admins.map(p => esc(userName(p))).join(", ") || "없음"}</div></div></div>
      ${isSuper() ? `<div class="row mt"><button class="btn sm w" data-act="invite" data-gid="${g}" ${admins.length >= MAX_ADMINS ? "disabled" : ""}>관리자 초대 코드</button><button class="btn sm w" data-act="admin-pick" data-gid="${g}">명단에서 관리자 지정</button></div>
        ${S.inviteShow && S.inviteShow.gid === g ? `<div class="warnbox" style="background:var(--acc2);color:#135e34">초대 코드 <b style="font-size:20px;letter-spacing:2px">${S.inviteShow.code}</b> · 24시간, 1회용<br>받은 사람이 가입할 때 그룹 코드 자리에 넣으면 관리자가 돼요.</div>` : ""}` : ""}
      <details class="mt" data-act-toggle="load-members" data-gid="${g}" ${S.openRoster === g ? "open" : ""}><summary class="h" style="font-size:14px">명단 (${S.cid ? esc(cyc(S.cid).name) : ""}) ${mem ? Object.keys(mem).length + "명" : ""}</summary>
        ${mem ? Object.keys(mem).sort((a, b) => userName(a).localeCompare(userName(b), "ko")).map(p => `<div class="li"><span class="grow">${esc(dispName(p, Object.keys(mem)))}${admins.includes(p) ? ` <span class="pill g">관리자</span>` : ""}</span>
          ${isSuper() && S.pickAdmin === g ? (admins.includes(p) ? `<button class="btn sm l" data-act="admin-off" data-gid="${g}" data-pid="${p}">관리자 해제</button>` : `<button class="btn sm g" data-act="admin-on" data-gid="${g}" data-pid="${p}" ${admins.length >= MAX_ADMINS ? "disabled" : ""}>관리자 지정</button>`) : `<button class="btn sm l" data-act="kick" data-gid="${g}" data-pid="${p}">빼기</button>`}</div>`).join("") || `<div class="note">아직 없어요.</div>` : `<div class="note">불러오는 중…</div>`}
      </details></div>`;
  }
  if (isSuper()) {
    out += `<div class="card"><div class="h mb">👑 총관리자 · 그룹 만들기</div>
      <input class="inp" id="new-group" maxlength="12" placeholder="그룹 이름 (예: 1그룹)"><button class="btn" data-act="group-new">그룹 만들기</button>
      <div class="note mt">그룹 코드(4자리)는 자동으로 만들어져요.</div></div>`;
  }
  return out;
}
function vCycleForm() {
  const c = S.cycEdit ? cyc(S.cycEdit) : null, t = today();
  const s = c ? c.s : t + 1, e = c ? c.e : t + 30, rd = c ? Math.round((dayStartMs(c.s) - c.rsMs) / DAY) : 7;
  return `<div class="card mt" style="background:#fafafa">
    <div class="h mb">${c ? "회차 수정" : "새 회차"}</div>
    ${fld("cy-name", "이름", `value="${esc(c ? c.name : `${dDate(s).getUTCMonth() + 1}월 회차`)}" data-fresh="1"`)}
    ${fld("cy-s", "활동 시작일", `type="date" value="${inputFromDay(s)}" data-fresh="1"`)}
    ${fld("cy-e", "활동 종료일", `type="date" value="${inputFromDay(e)}" data-fresh="1"`)}
    ${fld("cy-rd", "모집 기간 (시작 전 며칠)", `type="number" min="0" max="14" value="${rd}" data-fresh="1"`)}
    <div class="note mb">모집이 시작되면 날짜가 잠겨요 (이후엔 총관리자만 수정).</div>
    <div class="row"><button class="btn g" style="flex:1" data-act="cycle-save">저장</button><button class="btn l" style="flex:.5" data-act="cycle-cancel">취소</button></div></div>`;
}

// ── 사진 ──
async function fileToImage(file) {
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch {
    return await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
  }
}
function shrink(img, max, q) {
  const w = img.width, h = img.height, r = Math.min(1, max / Math.max(w, h));
  const cv = document.createElement("canvas"); cv.width = Math.round(w * r); cv.height = Math.round(h * r);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", q);
}
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).slice(0, 12).map(x => x.toString(16).padStart(2, "0")).join(""); }
async function upload(file) {
  if (!file) return;
  const d = today(), c = S.cid, g = S.myGid;
  toast("사진을 줄이는 중…");
  try {
    const img = await fileToImage(file);
    const big = shrink(img, 1000, 0.72), th = shrink(img, 240, 0.6);
    const h = await sha(big);
    const seen = await get(`hashes/${S.pid}/${h}`);
    if (seen && seen !== d) { toast("이미 올린 사진이에요. 오늘 사진으로 올려 주세요."); return; }
    await update({
      [`photos/${c}/${g}/${d}/${S.pid}`]: { t: TS, img: big },
      [`thumbs/${c}/${g}/${d}/${S.pid}`]: { t: TS, th, h },
      [`checks/${c}/${g}/${S.pid}/${d}/p`]: TS,
      [`hashes/${S.pid}/${h}`]: d,
    });
    S.myGal = null;
    toast("사진을 올렸어요 📷");
  } catch (e) { console.error(e); toast("사진을 올리지 못했어요. 다시 시도해 주세요."); }
}
async function showPhoto(pid, d) {
  const g = S.viewGid && S.members[pid] ? S.viewGid : S.myGid;
  openSheet(`<div class="row mb"><b>${esc(userName(pid))} · ${md(d)}</b><button data-act="close">✕</button></div><div class="note center">불러오는 중…</div>`);
  const p = await get(`photos/${S.cid}/${g}/${d}/${pid}`);
  const th = p ? null : await get(`thumbs/${S.cid}/${g}/${d}/${pid}`);
  openSheet(`<div class="row mb"><b>${esc(userName(pid))} · ${md(d)}</b><button data-act="close" style="font-size:20px">✕</button></div>
    ${p ? `<img class="full" src="${p.img}" alt=""><div class="note mt">${hhmm(p.t)} 올림</div>` : th ? `<img class="full" src="${th.th}" alt=""><div class="note mt">원본 사진은 보관 기간이 지나 썸네일만 남아 있어요.</div>` : `<div class="note">사진이 없어요.</div>`}`);
}
async function showDay(pid, d) {
  const g = S.viewGid && S.members[pid] ? S.viewGid : S.myGid;
  const r = ((S.checks[pid] || {})[d]) || {};
  const th = hasPhoto(pid, d) ? await get(`thumbs/${S.cid}/${g}/${d}/${pid}`) : null;
  openSheet(`<div class="row mb"><b>${esc(userName(pid))} · ${md(d)} (${"일월화수목금토"[dow(d)]})</b><button data-act="close" style="font-size:20px">✕</button></div>
    ${ITEMS.map(([k, e, t]) => `<div class="li"><span style="font-size:20px">${e}</span><span class="grow">${t}</span>${validAt(r[k], d) ? `<span class="done">✓ ${hhmm(r[k])}</span>` : `<span class="note">－</span>`}</div>`).join("")}
    ${th ? `<button class="ph mt" style="width:100%;height:200px" data-act="photo" data-pid="${pid}" data-day="${d}"><img src="${th.th}" alt=""></button>` : ""}`);
}
function openSheet(html) { closeSheet(); const m = document.createElement("div"); m.className = "mask"; m.innerHTML = `<div class="sheet">${html}</div>`; m.addEventListener("click", e => { if (e.target === m) closeSheet(); }); document.body.append(m); }
function closeSheet() { document.querySelectorAll(".mask").forEach(m => m.remove()); }

// ── 동작 ──
const val = id => ($("#" + id) ? $("#" + id).value.trim() : "");
const errTo = (id, msg) => { const el = $("#" + id); if (el) el.textContent = msg; else toast(msg); };
const okName = n => n.length >= 1 && n.length <= 8;
const okTail = t => /^\d{4}$/.test(t), okPin = p => /^\d{6}$/.test(p);

async function doLogin() {
  const name = val("li-name"), tail = val("li-tail"), pin = val("li-pin");
  if (!okName(name) || !okTail(tail) || !okPin(pin)) return errTo("li-err", "이름, 뒷자리 4개, 비밀번호 6자리를 확인해 주세요.");
  const key = acctKey(name, tail), a = await get(`acct/${key}`);
  if (!a) return errTo("li-err", "가입된 정보가 없어요. 이름과 뒷자리를 확인해 주세요.");
  try { await auth.signIn(emailOf(key, a.k || 0), pin); }
  catch { errTo("li-err", "비밀번호가 맞지 않아요."); }
}
async function doSignup() {
  const code = val("su-code"), name = val("su-name"), tail = val("su-tail"), pin = val("su-pin"), pin2 = val("su-pin2");
  if (!okName(name)) return errTo("su-err", "이름은 1~8글자로 적어 주세요.");
  if (!okTail(tail)) return errTo("su-err", "전화번호 뒷자리 숫자 4개를 적어 주세요.");
  if (!okPin(pin)) return errTo("su-err", "비밀번호는 숫자 6자리예요.");
  if (pin !== pin2) return errTo("su-err", "비밀번호가 서로 달라요.");
  const key = acctKey(name, tail);
  if (await get(`acct/${key}`)) return errTo("su-err", "이미 가입된 이름+뒷자리예요. 로그인해 주세요.");
  try {
    S.pendingCode = code;
    const uid = await auth.signUp(emailOf(key, 0), pin);
    await update({ [`auth/${uid}`]: uid, [`users/${uid}`]: { name, tail, at: TS, uid }, [`acct/${key}`]: { pid: uid, k: 0 } });
  } catch (e) {
    console.error(e);
    errTo("su-err", e.code === "auth/email-already-in-use" ? "이미 가입된 이름+뒷자리예요. 로그인해 주세요." : "가입하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
}
async function useCode(code, cid, errId) {
  if (/^\d{6}$/.test(code)) return claimInvite(code, errId);
  if (!/^\d{4}$/.test(code)) return errTo(errId, "그룹 코드는 숫자 4자리, 관리자 초대 코드는 6자리예요.");
  const gid = await get(`codes/${code}`);
  if (!gid) return errTo(errId, "없는 그룹 코드예요.");
  const c = cyc(cid);
  if (!c) return errTo(errId, "아직 회차가 없어요.");
  const st = cycleState(c), g = S.groups[gid] || {};
  if (!canManage(gid) && !(st === "recruit" || (st === "active" && g.openUntil > now()))) return errTo(errId, st === "planned" ? `모집은 ${md(dayOf(c.rsMs))}부터예요.` : "지금은 참가 기간이 아니에요. 관리자에게 추가 참가를 요청해 주세요.");
  try {
    await update({ [`members/${cid}/${gid}/${S.pid}`]: { at: TS, code }, [`memberOf/${cid}/${S.pid}`]: gid });
    toast(`${g.name || "그룹"}에 참가했어요!`);
  } catch (e) { console.error(e); errTo(errId, "참가하지 못했어요. 이미 다른 그룹에 있거나 기간이 아닐 수 있어요."); }
}
async function claimInvite(code, errId) {
  const inv = await get(`invites/${code}`);
  if (!inv || inv.exp < now()) return errTo(errId, "없거나 만료된 초대 코드예요.");
  if (inv.claim && inv.claim !== S.pid) return errTo(errId, "이미 사용된 초대 코드예요.");
  try {
    if (!inv.claim) await set(`invites/${code}/claim`, S.pid);
    await update({ [`adminOf/${S.pid}/${inv.gid}`]: code, [`groups/${inv.gid}/admins/${S.pid}`]: true });
    const cid = S.nextCid || S.cid;
    if (cid && !(await get(`memberOf/${cid}/${S.pid}`))) await update({ [`members/${cid}/${inv.gid}/${S.pid}`]: { at: TS, by: "invite" }, [`memberOf/${cid}/${S.pid}`]: inv.gid });
    toast(`${(S.groups[inv.gid] || {}).name || "그룹"} 관리자가 되었어요!`);
  } catch (e) { console.error(e); errTo(errId, "초대 코드를 쓰지 못했어요."); }
}
async function doForgot() {
  const name = val("fg-name"), tail = val("fg-tail"), pin = val("fg-pin"), pin2 = val("fg-pin2");
  if (!okName(name) || !okTail(tail)) return errTo("fg-err", "이름과 뒷자리 4개를 확인해 주세요.");
  if (!okPin(pin) || pin !== pin2) return errTo("fg-err", "새 비밀번호(숫자 6자리)를 두 번 똑같이 적어 주세요.");
  const key = acctKey(name, tail), a = await get(`acct/${key}`);
  if (!a) return errTo("fg-err", "가입된 정보가 없어요.");
  localStorage.setItem("hr-reset-pid", a.pid);
  for (let k = (a.k || 0) + 1; k <= (a.k || 0) + 6; k++) {
    let uid = null;
    try { uid = await auth.signUp(emailOf(key, k), pin); }
    catch (e) { if (e.code === "auth/email-already-in-use") { try { uid = await auth.signIn(emailOf(key, k), pin); } catch { continue; } } else { localStorage.removeItem("hr-reset-pid"); return errTo("fg-err", "요청하지 못했어요. 잠시 후 다시 시도해 주세요."); } }
    try { await set(`resets/${a.pid}`, { uid, at: TS, k }); }
    catch (e) { console.error(e); return errTo("fg-err", "요청하지 못했어요."); }
    return;
  }
  localStorage.removeItem("hr-reset-pid");
  errTo("fg-err", "요청을 너무 많이 했어요. 관리자에게 문의해 주세요.");
}
async function watchResetWait() {
  const pid = S.resetPid;
  sub("resetWait", `resets/${pid}`, r => { S.waitInfo = Object.assign(S.waitInfo || {}, { denied: !r && S.waitInfo && S.waitInfo.seen }); if (r) S.waitInfo.seen = true; render(); });
  // 우리 그룹 관리자 이름 보여주기
  try {
    const cy = await get("cycles"), gr = await get("groups"), us = await get("users");
    const ids = Object.keys(cy || {});
    for (const c of ids) { const g = await get(`memberOf/${c}/${pid}`); if (g && gr[g]) { S.waitInfo = Object.assign(S.waitInfo || {}, { admins: Object.keys(gr[g].admins || {}).map(p => (us[p] || {}).name).filter(Boolean).join(", ") || "아직 없음" }); } }
    render();
  } catch {}
}
async function approveReset(pid) {
  const r = S.resets[pid], u = S.users[pid];
  if (!r || !u) return;
  if (!confirm(`${u.name}(${u.tail})님의 비밀번호 재설정을 승인할까요?\n본인 확인을 하셨나요?`)) return;
  const o = { [`auth/${r.uid}`]: pid, [`users/${pid}/uid`]: r.uid, [`acct/${acctKey(u.name, u.tail)}/k`]: r.k, [`resets/${pid}`]: null };
  if (u.uid && u.uid !== r.uid) o[`auth/${u.uid}`] = null;
  await update(o); toast("승인했어요");
}
async function saveCycle() {
  const name = val("cy-name"), s = dayFromInput(val("cy-s")), e = dayFromInput(val("cy-e")), rd = Math.max(0, Math.min(14, parseInt(val("cy-rd") || "7", 10)));
  if (!name || !(e >= s)) return toast("날짜를 확인해 주세요.");
  const sMs = dayStartMs(s), id = S.cycEdit || `c${s}`;
  const clash = Object.entries(S.cycles || {}).some(([k, c]) => k !== id && !(e < c.s || s > c.e));
  if (clash) return toast("다른 회차와 활동 날짜가 겹쳐요.");
  try { await set(`cycles/${id}`, { name, s, e, sMs, eMs: dayStartMs(e + 1), rsMs: sMs - rd * DAY, by: S.pid, at: TS }); S.cycEdit = undefined; toast("저장했어요"); render(); }
  catch (er) { console.error(er); toast("저장하지 못했어요 (잠긴 회차일 수 있어요)"); }
}
async function newGroup() {
  const name = val("new-group");
  if (!name) return toast("그룹 이름을 적어 주세요.");
  let code; for (let i = 0; i < 20; i++) { code = rnd(4); if (!(await get(`codes/${code}`))) break; }
  const gid = "g" + Date.now().toString(36);
  await update({ [`groups/${gid}`]: { name, at: TS }, [`codes/${code}`]: gid, [`groupCode/${gid}`]: code });
  $("#new-group").value = ""; toast(`${name} 만들었어요 · 코드 ${code}`);
  followAdmin();
}
async function loadAdminMembers(gid) {
  if (!S.cid) return;
  const m = await get(`members/${S.cid}/${gid}`);
  S.adminMembers = Object.assign(S.adminMembers || {}, { [gid]: m || {} });
  render();
}
async function loadAllMemberOf() {
  const o = {};
  for (const c of [S.cid, S.nextCid].filter(Boolean)) o[c] = (await get(`memberOf/${c}`)) || {};
  S.allMemberOf = o; render();
}

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act],[data-tab]");
  if (!b) return;
  if (b.dataset.tab) { S.tab = b.dataset.tab; if (S.tab === "mine") { S.myGal = null; loadMyGallery(); } if (S.tab === "admin") loadAllMemberOf(); render(); scrollTo(0, 0); return; }
  const a = b.dataset.act, d = b.dataset;
  try {
    switch (a) {
      case "go-signup": S.view = "signup"; render(); break;
      case "go-login": S.view = "login"; render(); break;
      case "go-forgot": S.view = "forgot"; render(); break;
      case "login": b.disabled = true; await doLogin(); b.disabled = false; break;
      case "signup": b.disabled = true; await doSignup(); b.disabled = false; break;
      case "forgot": b.disabled = true; await doForgot(); b.disabled = false; break;
      case "logout": unsubAll(); await auth.signOut(); S.view = "login"; break;
      case "cancel-wait": localStorage.removeItem("hr-reset-pid"); unsubAll(); await auth.signOut(); S.view = "login"; break;
      case "become-super":
        if (!confirm("총관리자로 시작할까요? 이 버튼은 한 번만 쓸 수 있어요.")) return;
        await set("meta/super", S.pid); toast("총관리자가 되었어요! 관리 탭에서 그룹을 만드세요."); S.tab = "admin"; break;
      case "join": b.disabled = true; await useCode(val("jn-code"), d.cid, "jn-err"); b.disabled = false; break;
      case "claim": await claimInvite(val("inv-code"), null); break;
      case "check": {
        const k = d.k, day = today(), path = `checks/${S.cid}/${S.myGid}/${S.pid}/${day}/${k}`;
        const cur = (((S.checks[S.pid] || {})[day]) || {})[k];
        await set(path, validAt(cur, day) ? null : TS);
        break;
      }
      case "photo": showPhoto(d.pid, +d.day); break;
      case "cell": showDay(d.pid, +d.day); break;
      case "person": S.tab = "grid"; render(); break;
      case "close": closeSheet(); break;
      case "view-group": S.viewGid = d.gid; followGroup(); render(); break;
      case "grid-mode": S.gridMode = d.m; render(); break;
      case "reset-ok": await approveReset(d.pid); break;
      case "reset-no": if (confirm("이 요청을 거절할까요?")) { await remove(`resets/${d.pid}`); toast("거절했어요"); } break;
      case "cycle-new": S.cycEdit = null; render(); break;
      case "cycle-edit": S.cycEdit = d.cid; render(); break;
      case "cycle-cancel": S.cycEdit = undefined; render(); break;
      case "cycle-save": await saveCycle(); break;
      case "group-new": await newGroup(); break;
      case "open-join": { const days = +($("#open-days-" + d.gid) || {}).value || 3; await set(`groups/${d.gid}/openUntil`, now() + days * DAY); toast(`추가 참가를 ${days}일 열었어요`); break; }
      case "open-close": await set(`groups/${d.gid}/openUntil`, 0); toast("추가 참가를 닫았어요"); break;
      case "invite": {
        let code; for (let i = 0; i < 20; i++) { code = rnd(6); if (!(await get(`invites/${code}`))) break; }
        await set(`invites/${code}`, { gid: d.gid, exp: now() + DAY, by: S.pid });
        S.inviteShow = { gid: d.gid, code }; render(); break;
      }
      case "admin-pick": S.pickAdmin = S.pickAdmin === d.gid ? null : d.gid; S.openRoster = d.gid; await loadAdminMembers(d.gid); break;
      case "admin-on": await update({ [`adminOf/${d.pid}/${d.gid}`]: true, [`groups/${d.gid}/admins/${d.pid}`]: true }); toast(`${userName(d.pid)}님을 관리자로 지정했어요`); break;
      case "admin-off": if (confirm(`${userName(d.pid)}님의 관리자를 해제할까요?`)) { await update({ [`adminOf/${d.pid}/${d.gid}`]: null, [`groups/${d.gid}/admins/${d.pid}`]: null }); toast("해제했어요"); } break;
      case "kick":
        if (!confirm(`${userName(d.pid)}님을 이번 회차 명단에서 뺄까요?\n기록은 남아 있어요.`)) return;
        await update({ [`members/${S.cid}/${d.gid}/${d.pid}`]: null, [`memberOf/${S.cid}/${d.pid}`]: null });
        await loadAdminMembers(d.gid); toast("명단에서 뺐어요"); break;
    }
  } catch (err) { console.error(err); toast("처리하지 못했어요: " + (err.code || err.message || "")); b.disabled = false; }
});
document.addEventListener("change", e => { const i = e.target; if (i.dataset && i.dataset.actChange === "upload") { upload(i.files[0]); i.value = ""; } });
document.addEventListener("toggle", e => { const t = e.target; if (t.dataset && t.dataset.actToggle === "load-members" && t.open) { S.openRoster = t.dataset.gid; loadAdminMembers(t.dataset.gid); } }, true);

// 가입 직후: 적어 둔 코드로 바로 참가
setInterval(() => {
  if (S.pendingCode && S.pid && S.ready && (S.cid || /^\d{6}$/.test(S.pendingCode))) { const c = S.pendingCode; S.pendingCode = null; useCode(c, S.nextCid || S.cid, null); }
}, 700);

if ("serviceWorker" in navigator && !testMode) navigator.serviceWorker.register("sw.js").catch(() => {});
boot().catch(e => { console.error(e); $("#app").innerHTML = `<main><div class="card">앱을 열지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.</div></main>`; });
