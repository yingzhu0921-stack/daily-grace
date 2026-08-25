#!/usr/bin/env bash
#
# codex_review.sh
# 패트(Claude)가 만든 작업 결과를 매트(Codex)가 read-only 로 검수하는 스크립트.
#
# 사용법:
#   ./codex_review.sh                     # 커밋되지 않은 변경(추적 + 미추적) 검수
#   ./codex_review.sh --staged            # staged 변경만 검수
#   ./codex_review.sh --range main..HEAD  # 커밋 범위 검수
#   ./codex_review.sh --note "카드 렌더링 회귀 위주로 봐줘"
#
# 결과: codex_review_result.md
# 종료 코드: 0 = PASS / 2 = REVISION_REQUIRED / 1 = 오류
#
# 안전 원칙 (AGENTS.md 준수)
#   - 매트는 --sandbox read-only 로 실행되어 파일을 수정/생성/삭제할 수 없다.
#   - .env, 키, 인증서 등 민감 파일은 diff 수집 단계에서 제외한다.
#   - 남은 diff 에서도 비밀값으로 보이는 라인은 [REDACTED] 로 마스킹해서 전달한다.
#   - 배포, 파일 삭제, 외부 업로드는 하지 않는다. (read-only 샌드박스는 네트워크도 차단)

set -euo pipefail

# ── 기본 설정 ────────────────────────────────────────────────────────────────
PROJECT_DIR="${CODEX_REVIEW_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
RESULT_FILE="$PROJECT_DIR/codex_review_result.md"
REASONING_EFFORT="${CODEX_REVIEW_EFFORT:-high}"
MAX_DIFF_BYTES="${CODEX_REVIEW_MAX_BYTES:-400000}"   # 프롬프트 인자 길이 안전선
MAX_UNTRACKED_BYTES="${CODEX_REVIEW_MAX_UNTRACKED_BYTES:-102400}"

# 민감정보 / 검수 무의미 파일 제외 pathspec
EXCLUDES=(
  ':(exclude,glob).env'
  ':(exclude,glob).env.*'
  ':(exclude,glob)**/.env'
  ':(exclude,glob)**/.env.*'
  ':(exclude,glob)**/*.pem'
  ':(exclude,glob)**/*.key'
  ':(exclude,glob)**/*.p12'
  ':(exclude,glob)**/*.pfx'
  ':(exclude,glob)**/*.keystore'
  ':(exclude,glob)**/id_rsa*'
  ':(exclude,glob)**/id_ed25519*'
  ':(exclude,glob)**/secrets.*'
  ':(exclude,glob)**/*credential*'
  ':(exclude,glob)**/*.token'
  ':(exclude,glob)**/.npmrc'
  ':(exclude,glob)**/service-account*.json'
  ':(exclude,glob)codex_review_result.md'
  ':(exclude,glob)package-lock.json'
  ':(exclude,glob)bun.lockb'
  ':(exclude,glob)dist/**'
  ':(exclude,glob)node_modules/**'
)

# 마스킹 대상 패턴 (제외 목록을 빠져나온 비밀값 방어)
SECRET_RE='(?:api[_-]?key|secret|password|passwd|access[_-]?token|refresh[_-]?token|auth[_-]?token|authorization|bearer\s|private[_-]?key|client[_-]?secret|\bsk-[A-Za-z0-9]{16,}|\bAIza[0-9A-Za-z_-]{20,}|\beyJ[A-Za-z0-9_-]{20,})'

usage() {
  sed -n '3,19p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

# ── 인자 파싱 ────────────────────────────────────────────────────────────────
MODE="worktree"
RANGE=""
NOTE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --staged) MODE="staged"; shift ;;
    --range)  MODE="range";  RANGE="${2:?--range 뒤에 커밋 범위를 지정하세요 (예: main..HEAD)}"; shift 2 ;;
    --note)   NOTE="${2:?--note 뒤에 추가 지시를 지정하세요}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "알 수 없는 옵션: $1" >&2; usage >&2; exit 1 ;;
  esac
done

# ── 사전 점검 ────────────────────────────────────────────────────────────────
command -v codex >/dev/null 2>&1 || { echo "[오류] codex CLI 를 찾을 수 없습니다." >&2; exit 1; }
command -v perl  >/dev/null 2>&1 || { echo "[오류] perl 이 필요합니다(민감정보 마스킹)." >&2; exit 1; }
git -C "$PROJECT_DIR" rev-parse --git-dir >/dev/null 2>&1 \
  || { echo "[오류] git 저장소가 아닙니다: $PROJECT_DIR" >&2; exit 1; }
[[ -f "$PROJECT_DIR/AGENTS.md" ]] \
  || { echo "[오류] AGENTS.md 가 없습니다. 매트의 검수 기준을 로드할 수 없습니다." >&2; exit 1; }

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
RAW_DIFF="$TMP_DIR/raw.diff"
SAFE_DIFF="$TMP_DIR/safe.diff"
LAST_MSG="$TMP_DIR/last_message.md"

# ── 1) 검수 대상 diff 수집 ───────────────────────────────────────────────────
: > "$RAW_DIFF"
case "$MODE" in
  staged)
    SCOPE_DESC="staged 변경 (git diff --cached)"
    git -C "$PROJECT_DIR" diff --cached -- . "${EXCLUDES[@]}" >> "$RAW_DIFF"
    ;;
  range)
    SCOPE_DESC="커밋 범위 $RANGE"
    git -C "$PROJECT_DIR" diff "$RANGE" -- . "${EXCLUDES[@]}" >> "$RAW_DIFF"
    ;;
  worktree)
    SCOPE_DESC="커밋되지 않은 변경 (추적 파일 + 미추적 파일)"
    git -C "$PROJECT_DIR" diff HEAD -- . "${EXCLUDES[@]}" >> "$RAW_DIFF"
    # 미추적(신규) 파일은 diff HEAD 에 안 잡히므로 개별 수집
    while IFS= read -r -d '' f; do
      size=$(wc -c < "$PROJECT_DIR/$f" 2>/dev/null | tr -d ' ' || echo 0)
      [[ -z "$size" ]] && size=0
      if (( size > MAX_UNTRACKED_BYTES )); then
        printf '\n# [건너뜀] 신규 파일 %s (%s bytes, 크기 초과)\n' "$f" "$size" >> "$RAW_DIFF"
        continue
      fi
      ( cd "$PROJECT_DIR" && git diff --no-index -- /dev/null "$f" ) >> "$RAW_DIFF" || true
    done < <(git -C "$PROJECT_DIR" ls-files --others --exclude-standard -z -- . "${EXCLUDES[@]}")
    ;;
esac

if [[ ! -s "$RAW_DIFF" ]]; then
  echo "[안내] 검수할 변경사항이 없습니다. ($SCOPE_DESC)"
  exit 0
fi

# ── 2) 민감정보 마스킹 ───────────────────────────────────────────────────────
perl -pe '
  if (/^[-+ ]/ && !/^(?:\+\+\+|---) / && /'"$SECRET_RE"'/i) {
    s{^([-+ ]).*$}{${1}[REDACTED: 민감정보 가능 라인 - 매트에게 전달하지 않음]};
  }
' "$RAW_DIFF" > "$SAFE_DIFF"

REDACTED_COUNT=$(grep -c 'REDACTED: 민감정보' "$SAFE_DIFF" || true)

DIFF_BYTES=$(wc -c < "$SAFE_DIFF" | tr -d ' ')
TRUNCATED="no"
if (( DIFF_BYTES > MAX_DIFF_BYTES )); then
  # 한글이 깨지지 않도록 바이트 컷 후 잘린 마지막 줄을 버려 줄 경계로 맞춘다
  head -c "$MAX_DIFF_BYTES" "$SAFE_DIFF" | sed '$d' > "$SAFE_DIFF.cut"
  printf '\n\n# [잘림] diff 가 %s bytes 로 커서 앞부분 %s bytes 만 전달합니다.\n' \
    "$DIFF_BYTES" "$MAX_DIFF_BYTES" >> "$SAFE_DIFF.cut"
  mv "$SAFE_DIFF.cut" "$SAFE_DIFF"
  TRUNCATED="yes"
fi

# ── 3) 프롬프트 구성 ─────────────────────────────────────────────────────────
PROMPT="너는 매트다. 프로젝트 루트의 AGENTS.md 에 정의된 역할과 검수 원칙을 그대로 따른다.

[중요 제약]
- 너는 read-only 샌드박스에서 실행 중이다. 파일을 생성/수정/삭제하지 마라.
- 코드를 대신 구현하지 말고, 지적사항만 정리해라.
- 배포, 파일 삭제, 외부 업로드, 네트워크 요청을 시도하지 마라.
- 아래 diff 에는 민감정보가 마스킹되어 있다. .env / API 키 / 비밀번호 값을 추측하거나 출력하지 마라.
- 필요하면 저장소 파일을 읽어 맥락을 확인해도 되지만, .env 및 비밀키 파일은 열지 마라.

[검수 대상] $SCOPE_DESC
[민감정보 마스킹 라인 수] $REDACTED_COUNT
[diff 잘림 여부] $TRUNCATED
${NOTE:+[패트의 추가 요청] $NOTE}

[출력 형식 - 마크다운]
## 검수 결론
PASS 또는 REVISION_REQUIRED 중 하나만 명시

## 치명적 오류
(없으면 '없음')

## 개선 권고
(없으면 '없음')

## 회귀 위험
(기존 동작을 깨뜨릴 가능성이 있는 변경)

## 빌드/테스트 확인 필요 항목

--- DIFF 시작 ---
$(cat "$SAFE_DIFF")
--- DIFF 끝 ---"

# ── 4) 매트 호출 (비대화형, read-only) ───────────────────────────────────────
echo "[매트 검수 시작] $SCOPE_DESC"
echo "  프로젝트 : $PROJECT_DIR"
echo "  마스킹   : ${REDACTED_COUNT}줄 / diff 잘림: $TRUNCATED"

set +e
codex exec \
  -C "$PROJECT_DIR" \
  --sandbox read-only \
  -c model_reasoning_effort="$REASONING_EFFORT" \
  -o "$LAST_MSG" \
  "$PROMPT" \
  < /dev/null
CODEX_STATUS=$?
set -e

if (( CODEX_STATUS != 0 )) || [[ ! -s "$LAST_MSG" ]]; then
  echo "[오류] 매트 실행 실패 (exit=$CODEX_STATUS)" >&2
  exit 1
fi

# ── 5) 결과 저장 ─────────────────────────────────────────────────────────────
{
  echo "# 매트(Codex) 검수 결과"
  echo
  echo "- 검수 일시: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "- 검수 대상: $SCOPE_DESC"
  echo "- 프로젝트: $PROJECT_DIR"
  echo "- 기준 문서: AGENTS.md"
  echo "- 샌드박스: read-only (파일 수정 불가)"
  echo "- 민감정보 마스킹: ${REDACTED_COUNT}줄"
  echo "- diff 잘림: $TRUNCATED"
  if [[ -n "$NOTE" ]]; then echo "- 추가 요청: $NOTE"; fi
  echo
  echo "---"
  echo
  cat "$LAST_MSG"
} > "$RESULT_FILE"

echo "[완료] 검수 결과 저장: $RESULT_FILE"

# 본문 언급이 아니라 '검수 결론' 값만 보고 판정한다
VERDICT=$(grep -Eo '^[[:space:]]*(\*\*)?(PASS|REVISION_REQUIRED)(\*\*)?[[:space:]]*$' "$LAST_MSG" \
  | grep -Eo 'PASS|REVISION_REQUIRED' | head -n 1 || true)
if [[ -z "$VERDICT" ]]; then
  VERDICT=$(grep -Eo 'PASS|REVISION_REQUIRED' "$LAST_MSG" | head -n 1 || true)
fi

case "$VERDICT" in
  REVISION_REQUIRED) echo "[판정] REVISION_REQUIRED"; exit 2 ;;
  PASS)              echo "[판정] PASS";              exit 0 ;;
  *)                 echo "[판정] 판독 실패 - $RESULT_FILE 를 직접 확인하세요" >&2; exit 1 ;;
esac
