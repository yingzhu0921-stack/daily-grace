# Daily Grace AI OFFICE

브라우저 채팅창 하나로 패트(Claude Code)에게 개발을 요청하고,
필요하면 매트(Codex)에게 read-only 검수까지 맡기는 로컬 개발용 콘솔.

## 실행

```bash
cd ai-office
npm start          # 또는 node server.js
```

접속: <http://127.0.0.1:4477>

포트를 바꾸려면 `AI_OFFICE_PORT=5000 npm start`.

## 구조

| 파일 | 역할 |
|---|---|
| `server.js` | 로컬 HTTP 서버 (127.0.0.1 전용), SSE 로 진행 상황 전송 |
| `lib/config.js` | 경로·포트·금지 도구·시스템 프롬프트 등 설정 |
| `lib/uploads.js` | 첨부 검증/저장. 종류별 핸들러로 분리되어 PDF/TXT/MD 확장이 쉬움 |
| `lib/pat-runner.js` | Claude Code CLI 비대화형 호출 및 이벤트 → 작업 단계 변환 |
| `lib/matt-runner.js` | 프로젝트 루트의 `codex_review.sh` 실행 및 판정 파싱 |
| `public/` | 반응형 채팅 UI |
| `uploads/` | 첨부 임시 저장소 (git 제외) |

## 동작 방식

1. 브라우저에서 메시지를 보내면 서버가 `claude -p` 를 **프로젝트 루트**(`dailygrace-main`)에서 실행한다.
   따라서 프로젝트의 `CLAUDE.md` 규칙이 그대로 적용된다.
2. `--output-format stream-json` 이벤트를 읽어 `코드 확인 중 / 수정 중 / 테스트 중` 같은
   작업 상태로 변환해 보여준다. 터미널 로그 원문은 사용자에게 노출하지 않는다.
3. "검수해줘", "검수까지" 같은 요청이나 「검수까지」 버튼을 쓰면
   이번 요청에서 실제로 바뀐 파일만 대상으로 `codex_review.sh` 를 실행한다.
   결과는 주황색 매트 메시지로 PASS / REVISION_REQUIRED 와 함께 표시된다.

## 이미지 첨부

- 지원: jpg, jpeg, png, webp / 여러 장 / 전송 전 썸네일 및 개별 취소
- 첨부 버튼 외에 **붙여넣기(⌘V / Ctrl+V)** 로도 추가된다.
  클립보드에 이미지가 있을 때만 가로채고, 일반 텍스트 붙여넣기는 그대로 동작한다.
- 업로드 파일은 `ai-office/uploads/` 에 sanitize 된 이름으로 저장된다.
- 패트에게는 **base64 image 블록**으로 전달한다
  (`claude -p --input-format stream-json` 의 user 메시지 content).
  경로 문자열만 던지는 방식이 아니라 모델이 이미지를 실제로 인식한다.
- PDF/TXT/MD 는 `lib/uploads.js` 의 `ATTACHMENT_KINDS.document.enabled` 를 켜고
  `toContentBlock()` 을 채우면 동작하도록 자리를 만들어 두었다.

## 중단

- 실행 중에는 전송 버튼이 빨간 **중단** 버튼으로 바뀐다. **Esc** 키도 같은 동작이다.
- 중단하면 브라우저가 연결을 끊고, 서버가 그 신호를 받아
  실행 중이던 `claude` / `codex_review.sh` 자식 프로세스를 `SIGTERM` 으로 종료한다.
  (연결만 끊고 프로세스가 계속 도는 상태가 되지 않는다.)
- 이미 적용된 파일 수정은 되돌리지 않는다. 중단은 "더 진행하지 않음"이지 롤백이 아니다.

## 배포

- 상태바 오른쪽의 빨간 **배포** 버튼으로만 실행된다.
- 실행 순서: `npm run build` → `npx wrangler pages deploy dist` (Cloudflare Pages `daily-grace`)
- 승인 절차가 2겹이다.
  1. 브라우저에서 확인 창 승인
  2. 서버가 `{"confirm": true}` 가 없는 요청을 400 으로 거부
- **패트는 배포할 수 없다.** 배포 도구(`wrangler`, `vercel`, `npm publish` 등)는 계속
  `DISALLOWED_TOOLS` 로 차단되어 있고, 패트는 `/api/deploy` 를 호출할 수단이 없다.
  배포는 오직 사람이 버튼을 눌렀을 때만 일어난다.
- 배포 중에도 **중단** 버튼이 동작한다(빌드/배포 프로세스 SIGTERM).
  단, 이미 업로드가 끝난 배포는 되돌아가지 않는다.
- 배포 단계를 바꾸려면 `lib/deploy-runner.js` 의 `DEPLOY_STEPS` 만 수정하면 된다.

## 보안

- `127.0.0.1` 에만 바인딩하고, Host 헤더가 로컬이 아니면 403 (DNS rebinding 방지)
- 업로드 파일명 sanitize + uploads 폴더 밖 경로 차단 + MIME/확장자/크기 검증
- 정적 파일은 `public/` 밖으로 나갈 수 없음
- 모든 외부 프로세스는 `spawn(cmd, argsArray)` 로 실행 (shell 문자열 조합 없음)
- 패트에게 금지된 도구: `rm`, `git commit/push`, `wrangler`, `vercel`, `npm publish`,
  `curl`, `scp`, `ssh`, `WebFetch`, `WebSearch` (배포·삭제·외부 업로드 자동 실행 차단)
- 매트는 `codex_review.sh` 의 read-only 샌드박스를 그대로 사용하며,
  `.env`·API 키·토큰은 검수 diff 수집 단계에서 제외/마스킹된다.

## 알려진 제한

- 패트는 `--permission-mode acceptEdits` 로 동작하므로 파일 수정은 승인 없이 적용된다.
  배포·삭제·업로드 계열만 도구 차단으로 막아 둔 상태다.
- 도구 차단은 목록 기반이므로, 목록에 없는 우회 명령까지 완전히 막지는 못한다.
- 서버 세션은 1개다. 브라우저 여러 개를 동시에 쓰면 대화 맥락이 섞인다.
