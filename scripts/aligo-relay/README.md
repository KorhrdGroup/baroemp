# 알리고 알림톡 중계기

알리고 API는 호출 서버 IP를 사전 등록해야 하는데 Vercel은 고정 IP가 없다.
고정 IP 서버(114.207.245.105, korhrdgroup.cafe24.com)에 이 중계기를 두고 Vercel → 중계기 → 알리고로 보낸다.

- 실행 위치: `/opt/aligo-relay/server.js` (Node 12 호환, `server.js`) · systemd `aligo-relay.service` · 환경파일 `/etc/aligo-relay.env`
- 외부 주소: `https://korhrdgroup.cafe24.com/aligo/alimtalk` (nginx `/aligo/` → 127.0.0.1:8787, Let's Encrypt 자동갱신)
- 헬스체크: `https://korhrdgroup.cafe24.com/aligo/health`
- Vercel 환경변수: `ALIGO_RELAY_URL`, `ALIGO_RELAY_TOKEN`(서버 `/etc/aligo-relay.env` 의 RELAY_TOKEN 과 동일)
- 알리고 문자API → 발신 IP 등록: `114.207.245.105`

서버 점검: `systemctl status aligo-relay` · 로그 `journalctl -u aligo-relay -n 50`
재배포: `scp scripts/aligo-relay/server.js root@114.207.245.105:/opt/aligo-relay/server.js && ssh root@114.207.245.105 systemctl restart aligo-relay`
