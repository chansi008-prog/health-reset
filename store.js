// 데이터 저장소: Firebase(실제) 또는 이 기기 안의 "테스트 모드"(config.js가 비어 있을 때)
// 앱은 이 파일의 함수만 쓴다: 로그인, 경로 읽기/쓰기, 실시간 구독, 서버 시간
import { firebaseConfig } from "./config.js";

export const TS = { ".sv": "timestamp" };   // 서버 시간 표시 (쓰는 순간의 서버 시각으로 바뀜)
export let testMode = !firebaseConfig || !firebaseConfig.apiKey || new URLSearchParams(location.search).has("test");

let api;
export async function initStore() {
  api = testMode ? makeMock() : await makeFirebase();
  return api;
}
export const auth = {
  signUp: (email, pw) => api.signUp(email, pw),
  signIn: (email, pw) => api.signIn(email, pw),
  signOut: () => api.signOut(),
  onChange: cb => api.onAuth(cb),
  uid: () => api.uid(),
};
export const get = path => api.get(path);
export const set = (path, v) => api.set(path, v);
export const update = obj => api.update(obj);           // { "a/b": 1, "c/d": null } 여러 곳 한 번에
export const remove = path => api.set(path, null);
export const watch = (path, cb) => api.on(path, cb);     // 반환값 = 구독 해제 함수
export const now = () => Date.now() + (api ? api.offset() : 0);   // 서버 기준 현재 시각(ms)

async function makeFirebase() {
  const V = "10.12.2", base = `https://www.gstatic.com/firebasejs/${V}`;
  const { initializeApp } = await import(`${base}/firebase-app.js`);
  const A = await import(`${base}/firebase-auth.js`);
  const D = await import(`${base}/firebase-database.js`);
  const app = initializeApp(firebaseConfig);
  const au = A.getAuth(app);
  await A.setPersistence(au, A.browserLocalPersistence);
  const db = D.getDatabase(app);
  let off = 0;
  D.onValue(D.ref(db, ".info/serverTimeOffset"), s => { off = s.val() || 0; });
  const r = p => D.ref(db, p);
  return {
    signUp: async (e, p) => (await A.createUserWithEmailAndPassword(au, e, p)).user.uid,
    signIn: async (e, p) => (await A.signInWithEmailAndPassword(au, e, p)).user.uid,
    signOut: () => A.signOut(au),
    onAuth: cb => A.onAuthStateChanged(au, u => cb(u ? u.uid : null)),
    uid: () => au.currentUser ? au.currentUser.uid : null,
    get: async p => (await D.get(r(p))).val(),
    set: (p, v) => D.set(r(p), v),
    update: o => D.update(r("/"), o),
    on: (p, cb) => D.onValue(r(p), s => cb(s.val()), () => cb(null)),
    offset: () => off,
  };
}

// ── 테스트 모드: localStorage에 데이터 나무를 통째로 저장 (보안 규칙은 검사하지 않음) ──
function makeMock() {
  const KEY = "hr-test-db", AKEY = "hr-test-auth";
  const load = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const parts = p => p.split("/").filter(Boolean);
  const read = (tree, p) => parts(p).reduce((n, k) => (n && typeof n === "object" ? n[k] : undefined), tree);
  const fill = v => {
    if (v && typeof v === "object") {
      if (v[".sv"] === "timestamp") return Date.now();
      const o = {};
      for (const [k, x] of Object.entries(v)) { const y = fill(x); if (y !== null && y !== undefined) o[k] = y; }
      return Object.keys(o).length ? o : null;
    }
    return v;
  };
  const write = (tree, p, v) => {
    const ks = parts(p); let n = tree;
    for (let i = 0; i < ks.length - 1; i++) { if (!n[ks[i]] || typeof n[ks[i]] !== "object") n[ks[i]] = {}; n = n[ks[i]]; }
    const val = fill(v);
    if (val === null || val === undefined) delete n[ks.at(-1)]; else n[ks.at(-1)] = val;
  };
  const subs = new Set();
  const fire = () => { const t = load(KEY); subs.forEach(s => s.cb(clone(read(t, s.p)) ?? null)); };
  const clone = v => v === undefined ? null : JSON.parse(JSON.stringify(v));
  addEventListener("storage", e => { if (e.key === KEY) fire(); });
  // 탭마다 다른 사람으로 테스트할 수 있게 로그인은 sessionStorage
  let me = sessionStorage.getItem("hr-test-uid");
  const authSubs = new Set();
  const setMe = u => { me = u; if (u) sessionStorage.setItem("hr-test-uid", u); else sessionStorage.removeItem("hr-test-uid"); authSubs.forEach(cb => cb(me)); };
  const err = code => Object.assign(new Error(code), { code });
  return {
    signUp: async (e, p) => {
      const a = load(AKEY);
      if (a[e]) throw err("auth/email-already-in-use");
      const uid = "t" + Math.random().toString(36).slice(2, 12);
      a[e] = { p, uid }; save(AKEY, a); setMe(uid); return uid;
    },
    signIn: async (e, p) => {
      const a = load(AKEY)[e];
      if (!a || a.p !== p) throw err("auth/invalid-credential");
      setMe(a.uid); return a.uid;
    },
    signOut: async () => setMe(null),
    onAuth: cb => { authSubs.add(cb); setTimeout(() => cb(me)); return () => authSubs.delete(cb); },
    uid: () => me,
    get: async p => clone(read(load(KEY), p)) ?? null,
    set: async (p, v) => { const t = load(KEY); write(t, p, v); save(KEY, t); fire(); },
    update: async o => { const t = load(KEY); for (const [p, v] of Object.entries(o)) write(t, p, v); save(KEY, t); fire(); },
    on: (p, cb) => { const s = { p, cb }; subs.add(s); setTimeout(() => cb(clone(read(load(KEY), p)) ?? null)); return () => subs.delete(s); },
    offset: () => 0,
  };
}
