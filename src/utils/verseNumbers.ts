/**
 * 여러 절을 이어 붙인 말씀에서 절 번호(13 … 14 … 15)를 뺀다. 카드에만 쓴다 — 기록 원문은 그대로 둔다.
 *
 * 2026-11-10 사용자 결정: 절 번호가 문장 중간에 같은 크기로 끼어 읽는 흐름을 끊어서 카드에서는 뺀다.
 * '카드 문구는 사용자가 쓴 그대로'라는 고정 규칙의 예외다. 출처(히6:13-15)는 남으므로 절 범위는 그대로 보인다.
 *
 * 본문의 숫자를 지우는 것(기도제목 목록 "1 엄마 건강 2 아빠 직장", "3 월의 목표")은 절대 안 된다.
 * 놓치는 것은 괜찮으므로, 확실할 때만 뺀다:
 *  - 글 안에 진짜 성경 출처(66권 이름·약어 + 장:절)가 있어야 한다. 출처가 없으면 아무것도 안 뺀다.
 *  - 번호는 출처의 시작 절부터 1씩 차례로 이어져야 하고, 출처 범위를 넘으면 안 된다.
 *  - 이어지는 번호들 사이에 다른 숫자가 끼어 있으면 손대지 않는다.
 *  - 한 절이면 그 번호가 맨 앞 출처 바로 뒤에 있을 때만.
 *  - 출처는 글 맨 앞(괄호 포함)이나 글 맨 끝에 있을 때만 인정한다. 문장 중간의 '기도 전 3:16'·'시 7:30'은
 *    전도서·시편이 아니라 시간이라, 그런 것을 출처로 잡으면 본문 숫자를 지우게 된다.
 */

const BOOKS = [
  // 구약
  '창세기', '창', '출애굽기', '출', '레위기', '레', '민수기', '민', '신명기', '신', '여호수아', '수', '사사기', '삿', '룻기', '룻',
  '사무엘상', '삼상', '사무엘하', '삼하', '열왕기상', '왕상', '열왕기하', '왕하', '역대상', '대상', '역대하', '대하',
  '에스라', '스', '느헤미야', '느', '에스더', '에', '욥기', '욥', '시편', '시', '잠언', '잠', '전도서', '전', '아가', '아',
  '이사야', '사', '예레미야', '렘', '예레미야애가', '애가', '애', '에스겔', '겔', '다니엘', '단', '호세아', '호', '요엘', '욜',
  '아모스', '암', '오바댜', '옵', '요나', '욘', '미가', '미', '나훔', '나', '하박국', '합', '스바냐', '습', '학개', '학',
  '스가랴', '슥', '말라기', '말',
  // 신약
  '마태복음', '마', '마가복음', '막', '누가복음', '눅', '요한복음', '요', '사도행전', '행', '로마서', '롬',
  '고린도전서', '고전', '고린도후서', '고후', '갈라디아서', '갈', '에베소서', '엡', '빌립보서', '빌', '골로새서', '골',
  '데살로니가전서', '살전', '데살로니가후서', '살후', '디모데전서', '딤전', '디모데후서', '딤후', '디도서', '딛',
  '빌레몬서', '몬', '히브리서', '히', '야고보서', '약', '베드로전서', '벧전', '베드로후서', '벧후',
  '요한일서', '요일', '요한이서', '요이', '요한삼서', '요삼', '유다서', '유', '요한계시록', '계',
];
// 긴 이름부터 맞춰 본다('요한복음'이 '요'로 먼저 잡히지 않게).
const BOOK_PATTERN = [...BOOKS].sort((a, b) => b.length - a.length).join('|');
/** 책 이름 앞은 글 처음·공백·괄호여야 한다. '필요 3:16'의 '요'를 출처로 보지 않게. */
const REFERENCE_BODY = `(?:${BOOK_PATTERN})\\s*(\\d{1,3})\\s*[:：]\\s*(\\d{1,3})(?:\\s*[-~–—]\\s*(\\d{1,3}))?`;
const VERSION = '(?:개역한글|개역개정|개역|표준새번역|새번역|공동번역|현대인의성경|쉬운성경|우리말성경|현대어성경|바른성경|NIV|ESV|KJV|NASB|MSG|AMP|NLT|NKJV)';
/** 글 맨 앞의 출처: "[히6:13-15] …", "히6:13 …" */
const LEADING_REFERENCE = new RegExp(`^\\s*[\\[(]?\\s*${REFERENCE_BODY}\\s*(?:[·・,|/]?\\s*${VERSION})?\\s*[\\])]?`);
/** 글 맨 끝의 출처: "… \n히6:13-15", "… (요 3:16 개역개정)" */
const TRAILING_REFERENCE = new RegExp(`(?:^|\\s)[\\[(]?\\s*${REFERENCE_BODY}\\s*(?:[·・,|/]?\\s*${VERSION})?\\s*[\\])]?\\s*$`);

type NumberHit = { start: number; end: number; value: number };

/** 줄 처음이나 공백 뒤에 오고, 뒤에 공백과 글자가 이어지는 1~3자리 숫자 */
const NUMBER_TOKEN = /(^|\s)(\d{1,3})(?=[ \t]+[^\s\d])/g;

export function stripVerseNumbers(text: string): string {
  const leading = text.match(LEADING_REFERENCE);
  const ref = leading ?? text.match(TRAILING_REFERENCE);
  if (!ref) return text;
  const first = Number(ref[2]);
  const last = ref[3] ? Number(ref[3]) : first;
  if (last < first) return text;
  // 출처 안의 숫자(장·절)는 후보에서 뺀다.
  const refStart = (ref.index ?? 0);
  const refEnd = refStart + ref[0].length;

  const hits: NumberHit[] = [];
  for (const m of text.matchAll(NUMBER_TOKEN)) {
    const start = (m.index ?? 0) + m[1].length;
    if (start >= refStart && start < refEnd) continue;
    hits.push({ start, end: start + m[2].length, value: Number(m[2]) });
  }

  // 시작 절과 같은 첫 번호부터, 바로 다음 숫자 후보가 1 큰 번호일 때만 잇는다.
  // 사이에 다른 숫자가 끼면(바로 다음 후보가 1 큰 번호가 아니면) 거기서 끊는다.
  const startIdx = hits.findIndex(h => h.value === first);
  if (startIdx < 0) return text;
  const chain = [hits[startIdx]];
  for (let i = startIdx + 1; i < hits.length; i++) {
    const prev = chain[chain.length - 1].value;
    if (hits[i].value === prev + 1 && hits[i].value <= last) chain.push(hits[i]);
    else break;
  }
  // 이어진 번호 뒤에 범위 안의 숫자가 또 나오면 무언가 섞인 것이다. 손대지 않는다.
  const tailStart = startIdx + chain.length;
  if (hits.slice(tailStart).some(h => h.value >= first && h.value <= last)) return text;

  // 한 절이면 맨 앞 출처 바로 뒤(공백만 사이)일 때만. '[묵상] 13 번째 …' 같은 분류 괄호는 출처가 아니다.
  const rightAfterLeading = !!leading && text.slice(refEnd, chain[0].start).trim() === '';
  const confident = chain.length >= 2 || rightAfterLeading;
  if (!confident) return text;

  let out = '';
  let cursor = 0;
  for (const h of chain) {
    out += text.slice(cursor, h.start);
    // 숫자 뒤의 공백도 함께 뺀다. 줄 처음이 아니면 앞쪽 공백이 남아 단어 사이 띄어쓰기는 유지된다.
    let end = h.end;
    while (end < text.length && (text[end] === ' ' || text[end] === '\t')) end++;
    cursor = end;
  }
  return out + text.slice(cursor);
}
