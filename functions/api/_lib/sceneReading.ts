/**
 * 추상적인 말씀·기록에서 그림 장면을 '깊게 읽어' 고르는 공용 프롬프트.
 *
 * 2026-11-12 사용자: 추상적인 말씀이면 미니멀은 초원·비둘기·바다, 귀여운·플랫은 산 정상·풀에 물 주기만 나온다.
 * 완전 자동(T01·T02)과 직접 편집(플랫 일러스트·미니멀 감성)이 같은 읽기 방식과 갈래를 쓰도록 여기 한 곳에 둔다.
 * 갈래 설명에는 물건 예시를 적지 않는다 — 예시를 적으면 그게 새 고정 목록이 된다(Codex 지적).
 */

/** 귀여운 손글씨(T01)·플랫 일러스트 소재 갈래. 길이 7. */
export const FLAT_SUBJECT_DOMAINS = [
  'A HAND-SCALE EVERYDAY OBJECT whose real use mirrors what the message does',
  // 2026-11-12 '집 안' 갈래는 식탁·책상 장면만 불러서 바꿨다.
  'A SMALL IMAGINARY PLACE where what the message says is literally, visibly true',
  'THE SKY OR THE WEATHER, where its physical movement matches the message',
  'SOMETHING GROWING, at the stage of growth that matches the message',
  'WATER, in a specific form or use that the message supports',
  'A COMPACT INTERACTION BETWEEN PEOPLE — two or three small figures doing to one another what the message says',
  'A HUMAN-MADE OUTDOOR PLACE whose function fits the message',
];

/** 미니멀 감성(T02·편집) 장면 갈래. 길이 6. */
export const MINIMAL_SCENE_REGISTERS = [
  'A WIDE LANDSCAPE whose land form, season and weather are specific to this message — not a generic meadow, grassland or sea.',
  'ONE HUMAN-MADE THING standing in a large open space, whose real use mirrors what the message does.',
  'A TOWN, VILLAGE OR STREET seen from a distance at one particular hour, with the light in it doing what the message does.',
  'NIGHT — the dark and the few lights in it carrying the message.',
  'ONE OR TWO EVERYDAY OBJECTS on a large plain field of colour, placed so that their relation tells the message.',
  'A TRACE OF SOMEONE WHO IS NOT IN THE PICTURE — something just used, set down, left open or left lit — that shows what the message does.',
];

/** 추상적인 말씀이 매번 받던 그림. 말씀이 직접 그 낱말을 말할 때만 허용한다. */
export const SCENE_STOCK = 'climbing to a summit or standing on a mountaintop, a person walking a path or road into the distance, watering a plant, a lone sprout or seedling, a dove, a sun rising over water, the open sea or ocean horizon, a meadow or grassland, rolling green hills, a lone tree on a hill, a river or stream, rocks, an open door, a lighthouse, a small boat on calm water, a field of flowers, rays of light through clouds';

/** 예수님·하나님이 하시는 일을 말하는 문장이면 예수님을 직접 그린다(2026-11-11 사용자 결정, T01·플랫). */
export const JESUS_FIRST_CHECK = `JESUS FIRST CHECK (before anything else below): if the message is about what Jesus, the Lord or God does for people — saving, interceding or praying for them, forgiving, dealing with sin, loving, carrying, welcoming, staying with them — the subject is JESUS HIMSELF doing exactly that, drawn in this card's style in his traditional recognisable form (shoulder-length dark hair, short beard, light robe), with the person or people he does it for when the message has them (e.g. Jesus praying for a small person, Jesus holding someone, Jesus at the cross). Write it as "Jesus <doing what> — from '<Korean phrase>'". Do NOT turn such a message into a sun, a river, rocks, hills, a sprout, a door or a path. Only when the message is not about what Jesus or God does, use the hint below.`;

export function pickRegister(list: string[], seed: number, step: number, offset: number): string {
  return list[Math.abs(seed * step + offset) % list.length];
}

export interface DeepSceneOptions {
  /** 그림체 한 줄 설명 (영어). */
  cardBrief: string;
  /** 이번 카드의 갈래. */
  register: string;
  /** scene 칸의 모양. */
  outputShape: string;
  /** 플랫 계열: 예수님 우선·사람 관계·동물 금지 규칙을 붙인다. */
  flat?: boolean;
  /** 편집 화면: 입력이 이미 장면 묘사인지·성경 사건인지 먼저 가린다(kind). */
  classify?: boolean;
}

/**
 * 플랫(귀여운 손글씨·플랫 일러스트)용 4·5단계.
 * 2026-11-12 사용자: "안 예쁘고 안 귀엽다". '평범한 오늘의 순간'을 찾게 했더니 모든 카드가
 * 식탁·책상 앞 사람 + 머그컵·화분·창문·성경책이 됐다. 스티커 그림은 일상 재현이 아니라 엉뚱한 상상이 맞다.
 */
const FLAT_IDEA_STEP = `4. lifeMoment — a PLAYFUL PICTURE-BOOK IDEA that shows the action, the way a witty indie sticker artist would draw it: a small character doing the action almost literally, a gentle exaggeration of scale, a little visual pun, or a tiny story with a before and after. Charming, warm and a little offbeat. It may happen anywhere — outdoors, in the sky, on the water, in a made-up little world — but NOT a realistic everyday indoor moment.
5. scene — the picture for this card. If imagery is not "none", build the scene from that imagery in the same playful way. Otherwise draw the idea from step 4, seen through the REGISTER below.`;

/** 플랫 결과가 몰렸던 실내 일상 장면. */
const FLAT_STOCK = 'a person sitting at a table, desk or kitchen counter, a group around a table, a Bible study, a mug or cup of coffee, a potted plant on a windowsill or table, a window with sunlight, an open Bible on a table, a laptop, washing dishes, a church window with a cross';

export function deepScenePrompt(o: DeepSceneOptions): string {
  const fields = o.classify
    ? '{"kind":"","speaker":"","action":"","imagery":"","lifeMoment":"","scene":""}'
    : '{"speaker":"","action":"","imagery":"","lifeMoment":"","scene":""}';
  const classifyStep = o.classify
    ? `0. kind — "scene" if the input already says what to draw (a place, an object, a view, weather, a person doing something); "moment" if it is a Bible passage describing one particular event (someone speaks or acts at a particular place and time); otherwise "abstract" (a promise, a prayer, a teaching, a feeling, a diary line). If you are unsure between "scene" and "abstract", answer "scene" — the user's own scene must never be replaced. When kind is not "abstract", leave every other field empty and stop.
`
    : '';
  return `You choose the picture for ONE card made from a Korean faith message. These messages are often abstract (a promise, a prayer, a teaching, a diary line), and abstract messages keep getting the same stock pictures. Your job is to read THIS message closely enough that its picture could not belong to any other message.

Work in this order and fill every field. Output JSON only: ${fields}
${classifyStep}1. speaker — who is talking to whom: God to a person, a person to God, a person to themself, or a person to others.
2. action — the exact thing being done, asked, promised or declared, in plain words (the main verb and its object). NOT a theme word such as hope, faith, grace or peace.
3. imagery — every picture, comparison or concrete word inside the message itself, as "Korean phrase = English". Write "none" if there is none.
${o.flat ? FLAT_IDEA_STEP : `4. lifeMoment — ONE specific ordinary moment today in which someone would need, pray or live these exact words: a particular kind of person, a particular place, what has just happened, the time of day. Concrete and unglamorous. Never "someone struggling", never a symbolic landscape.
5. scene — the picture for this card. If imagery is not "none", build the scene from that imagery. Otherwise build it from action and lifeMoment, seen through the REGISTER below.`} Write it as ${o.outputShape}.

THIS CARD'S STYLE: ${o.cardBrief}
REGISTER FOR THIS CARD: ${o.register} The register only says where to look; it yields to the message. If the message names a concrete thing, draw that thing whatever the register says.${o.flat ? `
${JESUS_FIRST_CHECK}
If the message is about what people do to or for one another, the subject is two small figures doing exactly that to each other. A cute animal the message never mentions is NOT allowed. A person the message does not name is a child, a teenager or a young adult — never an elderly person or a grandparent (Bible figures the message names are drawn as they are).` : ''}
NO WRITTEN WORDS IN THE PICTURE: no English words, no letters spelled out by clouds, stars or objects. At most ONE short Korean word copied exactly from the message may appear as a small label on an object.
STOCK PICTURES — these became the answer to almost every abstract card, so do NOT use any of them unless the message's own words name it: ${SCENE_STOCK}${o.flat ? `, ${FLAT_STOCK}` : ''}. Also avoid any generic journey, ascent or "new beginning" metaphor.
The reader should be able to look at the picture and say which words of the message it came from. English for every field except quoted Korean phrases.`;
}

/** 모델 응답에서 JSON 을 꺼낸다. 실패하면 null. */
export function parseDeepScene(raw: string): { kind?: string; scene: string } | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const d = JSON.parse(m ? m[0] : raw);
    const scene = typeof d?.scene === 'string' ? d.scene.trim() : '';
    return { kind: typeof d?.kind === 'string' ? d.kind.trim().toLowerCase() : undefined, scene };
  } catch {
    return null;
  }
}
