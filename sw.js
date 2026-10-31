// 건강 Reset 서비스 워커: 앱 화면 파일만 저장 (기록은 Firebase로 주고받음). 새 버전이 있으면 먼저 받는다.
const VERSION = "hreset-v9";
const CORE = ["./", "index.html", "app.js", "store.js", "config.js", "style.css", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-touch.png", "icons/gm.png", "icons/gn.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const key = e.request.mode === "navigate" ? "index.html" : e.request;
  e.respondWith(caches.open(VERSION).then(async c => {
    try {
      const r = await fetch(e.request);
      if (r.ok) c.put(key, r.clone());
      return r;
    } catch {
      const hit = await c.match(key, { ignoreSearch: true });
      if (hit) return hit;
      throw new Error("offline");
    }
  }));
});
