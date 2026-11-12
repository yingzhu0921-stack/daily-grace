/**
 * T01(귀여운 그림) 의 그림체.
 *
 * 자동완성 T01 카드와 직접 편집의 '플랫 일러스트' 배경이 같은 그림체여야 해서
 * 여기 두고 양쪽이 같이 읽는다. 한쪽에만 적어 두면 T01 을 손볼 때 편집 화면이 조용히 갈라진다.
 *
 * 여기 있는 것은 **기법과 인물**뿐이다. 카드 구도(주인공을 프레임 아래쪽에, 상단 절반은 비움)와
 * 카드별로 돌아가는 바탕색은 글씨를 얹는 T01 카드에만 해당하므로 generate-image.ts 에 남겨 둔다.
 * 편집 화면은 사용자가 글씨를 아무 데나 놓기 때문에 그 구도를 강제하면 안 된다.
 *
 * 2026-11-12 새로 씀. 하루 동안 피드백마다 문장을 덧붙여 서로 부딪히기 시작해서(사용자: "덮어쓰다 이상해지는 건 아니겠지"),
 * 사용자 레퍼런스(소파의 곰, 옷장의 곰, 색 덩어리 사이의 하얀 강아지, 인디 그림책 포스터) 핵심만으로 다시 정리했다.
 * 그날 받은 피드백: 학습지·주보 삽화 같은 아이 그림은 촌스럽다 / 아기 같다 / 남자만 나온다 / 할아버지 X(성경 인물은 O) /
 * 사물에 눈·입 X / 원색 그대로는 너무 쨍하다 / 갈색 톤 X / 자잘한 소품이 많으면 유치하다.
 */

/** 매체와 형태. */
// 이어서 "너무 착해졌다, 더 익살스럽게, 약간 대충 그린 느낌" → 반듯한 그림책이 아니라 빠르게 툭툭 그린 손그림.
export const T01_FLAT_MEDIUM = 'A flat indie illustration that looks QUICKLY and LOOSELY drawn by hand, like a confident doodle filled with flat colour. '
  + 'Shapes are lopsided and a little careless, edges wobbly, proportions slightly off — NEVER neat, polished, symmetrical or vector-clean. '
  + 'Colour only — NO outlines, NO shading, NO gradients, NO highlights. ';

/** 인물. 나이·옷 규칙은 이름 없는 보통 사람에게만 적용하고, 성경 인물은 알아볼 특징을 지킨다. */
// 귀여움은 둥글고 통통한 몸·점 눈·무심한 표정에서 나온다(레퍼런스의 곰). 아기처럼 보이는 건 거대한 머리와 아기 얼굴이라 그것만 뺀다.
export const T01_FIGURE_LOOK = 'A person looks like a cute indie mascot character (think a chubby little bear-like figure, but human), not a children\'s-book kid: '
  // 이어서 "다리 같은 거 잘 나오게" → 뭉툭한 팔다리 대신 두 다리와 발을 또렷하게.
  + 'a soft, ROUND, CHUBBY body with a slightly big round head (about a third of its height), simple arms with round mitten hands, and TWO clearly drawn legs with little feet or shoes — never missing, merged, hidden or stumpy. '
  + 'The character is drawn LARGE enough to be the clear star of the picture, and it is DOING something with a little comic-strip humour — struggling with something comically big, flopping over, peeking out awkwardly, tiptoeing, overreacting. '
  + 'The face is two tiny dot eyes (or squinting lines) and a small mouth that can be a little odd — a wobbly line, an open "o", a tongue poking out — a goofy, deadpan, slightly silly look; cheek patches optional. Funny rather than sweet. '
  + 'Cute, but not a baby: a teenager or young adult in feel (a child only when the scene is about a child; never a baby, toddler or elderly person), with no baby face, no huge head. '
  + 'Hair is one simple soft shape (or a simple hat); clothes are one flat colour. Never a bald featureless egg. '
  + 'A Bible figure the scene names (Jesus, Moses, Abraham, David, Mary, a disciple, a shepherd) is drawn in this same simple way but keeps what identifies them: '
  + 'a long robe, a head cloth or sandals of their time, a staff, and grey hair and a beard for older figures such as Abraham or Moses. ';

/** 색. 원색 그대로가 아니라 인쇄된 과슈처럼 살짝 누그러진 선명한 색. */
// 이어서 "그냥 따뜻한 느낌이 됐다, 귀여워야 한다" → 중간 톤에서 한 단계 명랑하게(원색까지는 아님).
export const T01_ACCENT_COLOURS = 'Two or three CHEERFUL, clear colours in the picture, a step brighter than mid-tone but never primary or neon '
  + '(coral, sunny mustard, cornflower blue, fresh green, pink, cream white) — happy and fresh, never dull, muted or brownish, ';

/** 표면. 매끈한 벡터가 아니라 보송한 붓 질감. */
export const T01_SURFACE = 'A soft painted texture: every colour shape has a slightly furry, dry-brush edge and a fine grainy fill, like gouache on paper. '
  + 'The texture never tints the picture brown or grey. ';

/** 피할 것. */
export const T01_NOT = 'Only people and animals have faces — clouds, suns, balloons, plants, seeds, hearts and objects have NO eyes or mouth. '
  + 'No animal unless the scene names one (an animal the scene names, such as a sheep or a lamb, is drawn plainly and simply). '
  + 'NOT outlined, NOT a children\'s workbook or church-bulletin clip art, NOT sweet or saccharine, NOT kawaii, NOT neat vector art, NOT busy, NOT photo-realistic. '
  + 'No crayon scribbles, pencil, watercolour, halftone dots, sparkles, floating hearts or rainbows, and no English words in the picture; the only word allowed inside the picture is one short Korean label copied exactly from the verse when the scene asks for it (e.g. a bag labelled 염려).';
