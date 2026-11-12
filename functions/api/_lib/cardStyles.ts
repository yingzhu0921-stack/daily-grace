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
// 이어서 "플랫한 걸로 돌아가야 할 듯, 점점 착한 동화책이 된다" → 보송한 질감·대시를 빼고 매끈한 색면 스티커로.
export const T01_FLAT_MEDIUM = 'A FLAT graphic sticker illustration by a Korean indie character artist: solid flat colour shapes with slightly wonky, hand-cut edges — '
  + 'simple, a little lopsided and offbeat, never neat vector clip art and never a painted storybook. No outlines, no shading, no gradients, no highlights. ';

/** 인물. 나이·옷 규칙은 이름 없는 보통 사람에게만 적용하고, 성경 인물은 알아볼 특징을 지킨다. */
// 귀여움은 둥글고 통통한 몸·점 눈·무심한 표정에서 나온다(레퍼런스의 곰). 아기처럼 보이는 건 거대한 머리와 아기 얼굴이라 그것만 뺀다.
// 착한 동화책이 되는 원인: 웃는 얼굴·볼터치·반듯한 비율. 무표정한 점 눈과 살짝 이상한 비율로 웃기게 한다.
export const T01_FIGURE_LOOK = 'A person is a DEADPAN indie mascot character, NOT a sweet storybook kid: '
  + 'slightly odd proportions (a round head on a soft blob body), simple arms with mitten hands and two short legs with little feet clearly visible. '
  + 'The face is just two tiny black dot eyes and a tiny flat line mouth (or no mouth) — expressionless and a bit absurd. NO smiles, NO grins, NO rosy cheeks, NO sparkly eyes, NO sweet expressions. '
  + 'The humour comes from that blank face doing something slightly absurd — carrying something far too big, flopping over, standing stiffly, peeking out. '
  + 'A teenager or young adult in feel (a child only when the scene is about a child; never a baby or an elderly person). Hair is one simple flat shape (or a simple hat); clothes are one flat colour. Never a bald featureless egg. '
  + 'A Bible figure the scene names (Jesus, Moses, Abraham, David, Mary, a disciple, a shepherd) is drawn in this same simple way but keeps what identifies them: '
  + 'a long robe, a head cloth or sandals of their time, a staff, and grey hair and a beard for older figures such as Abraham or Moses. ';

/** 색. 이어서 "컬러도 좀 더 쨍하게" → 레퍼런스처럼 맑고 쨍한 색(탁하거나 갈색 끼 없이). */
// 이어서 "그냥 따뜻한 느낌이 됐다, 귀여워야 한다" → 중간 톤에서 한 단계 명랑하게(원색까지는 아님).
export const T01_ACCENT_COLOURS = 'BRIGHT, SUNNY, saturated colours inside the picture (emerald green hills, sunflower yellow, tangerine orange, tomato red, white, sky blue) — punchy but used on the objects and the ground they stand on, clean, never muddy or brownish, ';

/** 표면. 매끈한 벡터가 아니라 보송한 붓 질감. */
export const T01_SURFACE = 'Clean flat colour with at most a faint paper grain — no fuzzy, furry or brushy edges, no crayon or painted texture. ';

/** 피할 것. */
export const T01_NOT = 'Only people and animals have faces — clouds, suns, balloons, plants, seeds, hearts and objects have NO eyes or mouth. '
  + 'No animal unless the scene names one (an animal the scene names, such as a sheep or a lamb, is drawn plainly and simply). '
  + 'NOT outlined, NOT a sweet children\'s storybook, NOT a workbook or church-bulletin clip art, NOT kawaii, NOT busy, NOT photo-realistic. '
  + 'No crayon scribbles, pencil, watercolour, halftone dots, sparkles, floating hearts or rainbows, and no English words in the picture; the only word allowed inside the picture is one short Korean label copied exactly from the verse when the scene asks for it (e.g. a bag labelled 염려).';
