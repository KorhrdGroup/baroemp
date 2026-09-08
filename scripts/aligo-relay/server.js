/**
 * 알리고 알림톡 중계기 (Node 12 호환판 - fetch 없이 https 모듈만 사용).
 *
 * 알리고 API는 호출 서버 IP를 사전 등록해야 하는데 Vercel은 고정 IP가 없다.
 * 이 파일을 고정 IP 서버에서 띄워 두면 Vercel(우리 서비스) → 중계기 → 알리고 로 흘러
 * 알리고에는 이 서버 IP 하나만 등록하면 된다.
 *
 * 하는 일: x-relay-token 이 맞는 POST /alimtalk 의 본문을 그대로 알리고로 전달하고 응답을 돌려준다.
 * 알리고 키는 본문에 실려 오므로 이 서버는 비밀을 보관하지 않는다. 토큰 없이는 아무것도 안 한다.
 *
 * 실행: RELAY_TOKEN=<긴문자열> PORT=8787 node server.js   (systemd 유닛은 aligo-relay.service 참고)
 * Vercel: ALIGO_RELAY_URL=http://<고정IP>:8787/alimtalk , ALIGO_RELAY_TOKEN=<같은 문자열>
 */
"use strict";
const http = require("http");
const https = require("https");

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.RELAY_TOKEN;

if (!TOKEN) {
  console.error("RELAY_TOKEN 환경변수가 필요합니다.");
  process.exit(1);
}

function forward(body, contentType) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "kakaoapi.aligo.in",
        path: "/akv10/alimtalk/send/",
        method: "POST",
        headers: { "content-type": contentType, "content-length": Buffer.byteLength(body) },
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode || 502, type: res.headers["content-type"] || "application/json", text: Buffer.concat(chunks).toString("utf8") }),
        );
      },
    );
    req.on("timeout", () => req.destroy(new Error("aligo timeout")));
    req.on("error", reject);
    req.end(body);
  });
}

http
  .createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "text/plain" }).end("ok");
      return;
    }
    if (req.method !== "POST" || req.url !== "/alimtalk") {
      res.writeHead(404).end();
      return;
    }
    if (req.headers["x-relay-token"] !== TOKEN) {
      res.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ code: -401, message: "relay token mismatch" }));
      return;
    }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const body = Buffer.concat(chunks);
      try {
        const out = await forward(body, req.headers["content-type"] || "application/x-www-form-urlencoded");
        console.log(new Date().toISOString(), "relay →", out.status, out.text.slice(0, 120));
        res.writeHead(out.status, { "content-type": out.type }).end(out.text);
      } catch (err) {
        console.error("relay error", err && err.message);
        res.writeHead(502, { "content-type": "application/json" }).end(JSON.stringify({ code: -502, message: String(err && err.message) }));
      }
    });
  })
  .listen(PORT, () => console.log("aligo-relay listening on :" + PORT));
