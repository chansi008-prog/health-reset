// 저녁 8시 알림: 오늘 체크를 다 못 한 사람에게 푸시를 보낸다 (GitHub Actions에서 실행)
// 필요한 비밀값: FIREBASE_SERVICE_ACCOUNT (서비스 계정 JSON 전체)
// ONLY_NAME이 있으면 시험 모드: 그 이름의 사람에게만 시험 알림을 보낸다
import admin from "firebase-admin";

const DB_URL = "https://health-reset-default-rtdb.asia-southeast1.firebasedatabase.app";
const DAY = 864e5, KST = 9 * 3600e3;
const ITEMS = [["m", "것모닝"], ["l", "점심식사"], ["n", "것나잇"], ["e", "운동"]];
const dayOf = ms => Math.floor((ms + KST) / DAY);

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (!sa.private_key) { console.error("FIREBASE_SERVICE_ACCOUNT 비밀값이 없어요"); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: DB_URL });
const db = admin.database();
const val = async p => (await db.ref(p).get()).val();

const t = dayOf(Date.now());
const onlyName = (process.env.ONLY_NAME || "").trim();
const tokens = (await val("tokens")) || {};
const users = (await val("users")) || {};
const messages = [], owners = [];
const push = (pid, title, body) => {
  for (const [k, v] of Object.entries(tokens[pid] || {})) {
    messages.push({ token: v.t, data: { title, body, url: "./", tag: `remind-${t}` }, webpush: { headers: { Urgency: "high", TTL: "7200" } } });
    owners.push([pid, k]);
  }
};

if (onlyName) {
  const pids = Object.keys(users).filter(p => users[p].name === onlyName);
  pids.forEach(p => push(p, "건강 Reset 프로그램", "🔔 알림 시험이에요. 이 알림이 보이면 성공!"));
  console.log(`시험: ${onlyName} → ${pids.length}명, 기기 ${messages.length}대`);
} else {
  const cycles = (await val("cycles")) || {};
  const active = Object.entries(cycles).find(([, c]) => c.s <= t && t <= c.e);
  if (!active) { console.log("진행 중인 회차가 없어요"); process.exit(0); }
  const [cid] = active;
  const memberOf = (await val(`memberOf/${cid}`)) || {};
  const checks = (await val(`checks/${cid}`)) || {};
  let need = 0;
  for (const [pid, gid] of Object.entries(memberOf)) {
    const r = ((checks[gid] || {})[pid] || {})[t] || {};
    const left = ITEMS.filter(([k]) => !(typeof r[k] === "number" && dayOf(r[k]) === t));
    if (!left.length) continue;
    need++;
    push(pid, "건강 Reset 프로그램", `⏰ 오늘 체크 ${left.length}개가 남았어요: ${left.map(x => x[1]).join(", ")}. 자정 전에 눌러 주세요!`);
  }
  console.log(`미완료 ${need}명, 알림 받을 기기 ${messages.length}대`);
}

let ok = 0;
const dead = {};
for (let i = 0; i < messages.length; i += 500) {
  const res = await admin.messaging().sendEach(messages.slice(i, i + 500));
  res.responses.forEach((r, j) => {
    if (r.success) { ok++; return; }
    const code = r.error && r.error.code;
    console.log("실패:", code);
    if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"].includes(code)) {
      const [pid, k] = owners[i + j]; dead[`tokens/${pid}/${k}`] = null;
    }
  });
}
if (Object.keys(dead).length) await db.ref().update(dead);
console.log(`보냄 ${ok}건, 지운 옛 기기 ${Object.keys(dead).length}건`);
process.exit(0);
