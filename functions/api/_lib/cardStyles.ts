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
// 2026-11-12 레퍼런스(제주 피크닉 곰): 털실처럼 보송한 가장자리, 짙은 갈색 짧은 대시·점 디테일. 매끈한 플랫으로도 돌아가 봤지만
// 사용자와 비교해 보고 질감 있는 쪽으로 정했다(미니멀은 풍경·작은 사람·코드 글씨라 겹치지 않는다).
export const T01_FLAT_MEDIUM = 'A cute, offbeat hand-drawn illustration like a Korean or Chinese indie sticker artist\'s: chunky, wobbly, naive shapes filled with flat colour, '
  + 'each shape with a thick FUZZY, fluffy edge like felt or a woolly brush. Small details are added with short, rough dashes and dots in dark brown or a darker tone of the colour '
  + '(marks on a hill, dashes in the grass, dots on fruit, a few strokes for folds or fur). Clumsy and imperfect on purpose — NOT neat, polished, symmetrical, vector-clean or storybook-like. '
  + 'No black outlines around shapes, no shading, no gradients. ';

/** 인물. 나이·옷 규칙은 이름 없는 보통 사람에게만 적용하고, 성경 인물은 알아볼 특징을 지킨다. */
// 귀여움은 둥글고 통통한 몸·점 눈·무심한 표정에서 나온다(레퍼런스의 곰). 아기처럼 보이는 건 거대한 머리와 아기 얼굴이라 그것만 뺀다.
// 2026-11-12 사용자: "너무 착해, 전형적인 웃음은 개성이 없다. 누구나 GPT 로 만들 수 있으면 안 되고 내 앱에서만 나오는 스타일".
// 둥근 얼굴·볼터치·코 점·U자 웃음은 AI 의 기본 '귀여운 사람'이라 뺐다. 대신 하루은혜 고유 얼굴 규칙:
// (입은 처음에 한글 자모 모양으로 정했다가 V 자로 나와서 작고 동그란 입으로 바꿨다. 눈은 흰자위 있는 붙은 눈.)
export const T01_FIGURE_LOOK = 'Every person is drawn as this app\'s own SIGNATURE CHARACTER — follow these face rules exactly, they are what make the style recognisable: '
  // 이어서 "머리가 사과 같다" → 삐친 한 가닥(사과 꼭지처럼 보임)을 뺐다.
  + 'HEAD: a slightly wide BEAN-shaped head (not a perfect circle). Hair is one soft chunky shape that frames the face — a bob, a short messy cut, a low ponytail, a cap or beanie — with NO single tuft or sprout sticking up from the top. '
  // 이어서 "개성은 있는데 안 귀엽다": 세로 눈·처진 눈썹·큰 ㅅ 이 멍하고 찡그린 얼굴이 됐다 → 동그란 점 눈, 이목구비를 얼굴 아래쪽에 모으고, 눈썹은 필요할 때만.
  // 이어서 "이마가 너무 넓어 징그럽다" → 이목구비를 얼굴 가운데 높이에, 머리가 이마를 자연스럽게 덮게.
  + 'FACE FEATURES sit around the MIDDLE of the face with normal, balanced proportions; the hair comes down naturally over the forehead (a fringe or hairline close to the eyes) — never a huge bare forehead. '
  // 이어서 사용자 참고(스티커 캐릭터 세트)의 일반 기법만: 흰자위 있는 동그란 눈을 붙여 두고 눈동자 방향으로 표정. 그 캐릭터의 모양은 따라 하지 않는다.
  // 이어서 "사시로 나오면 안 돼" → 눈동자가 서로를 보거나 따로 놀지 않게, 두 눈동자는 늘 같은 방향.
  // 2026-11-13 사용자: 정면을 빤히 보는 눈은 무섭다 → 살짝 위나 옆(상대·물건 쪽)을 보게.
  + 'EYES: two round WHITE eyes with black pupils, set close together and touching or nearly touching. BOTH pupils always look in the SAME direction together, glancing slightly UP or to ONE SIDE (toward the other character or the object they care about) — NEVER staring straight out at the viewer with centred pupils (that looks scary), never cross-eyed, never in different directions, and both pupils the same dark colour. For a blissful moment, two closed curved lines instead. '
  // 이어서 "입이 아래로 뾰족한 건 별로" → ㅅ 입이 V 자로 그려졌다. 한글 자모 입을 빼고, 사용자가 좋아한 아브라함처럼 작고 동그란 입.
  + 'MOUTH: TINY and soft — a small round "o", a tiny short line, or a small open mouth when excited. NEVER a pointed V or ^ shape, never a big U smile. '
  + 'EYEBROWS: usually none; add two tiny dashes only for a strong moment (surprise, effort). '
  + 'NEVER a U-shaped smile or a curved grin, NO nose, NO rosy cheek circles, NO sparkly eyes, NO sweet storybook face. '
  + 'BODY: soft and chunky with slightly odd proportions, simple arms with mitten hands and two short legs with little feet clearly visible. '
  + 'The character shows feeling with HAND GESTURES too — thumbs up, arms crossed, hands on cheeks, a little wave, hugging something. The charm comes from the character\'s expression and pose while doing the scene\'s sincere action — never from turning the scene into a gag. '
  + 'A teenager or young adult in feel (a child only when the scene is about a child; never a baby or an elderly person); clothes are one flat colour. Never a bald featureless egg. '
  + 'A Bible figure the scene names (Jesus, Moses, Abraham, David, Mary, a disciple, a shepherd) is drawn in this same simple way but keeps what identifies them: '
  + 'a long robe, a head cloth or sandals of their time, a staff, and grey hair and a beard for older figures such as Abraham or Moses. ';

/** 색. 이어서 "컬러도 좀 더 쨍하게" → 레퍼런스처럼 맑고 쨍한 색(탁하거나 갈색 끼 없이). */
// 이어서 "그냥 따뜻한 느낌이 됐다, 귀여워야 한다" → 중간 톤에서 한 단계 명랑하게(원색까지는 아님).
export const T01_ACCENT_COLOURS = 'BRIGHT, SUNNY, saturated colours inside the picture (emerald green hills, sunflower yellow, tangerine orange, tomato red, white, sky blue) — punchy but used on the objects and the ground they stand on, clean, never muddy or brownish, ';

/** 표면. 매끈한 벡터가 아니라 보송한 붓 질감. */
export const T01_SURFACE = 'Fuzzy felt-like edges on every shape and a fine woolly grain inside the colour areas. The texture never makes the colours dull. ';

/** 피할 것. */
export const T01_NOT = 'Only people and animals have faces — globes, the earth, clouds, suns, balloons, plants, seeds, hearts and objects have NO eyes or mouth. '
  + 'No animal unless the scene names one (an animal the scene names, such as a sheep or a lamb, is drawn plainly and simply). '
  + 'NOT a storybook scene: no landscape scenery behind the characters. NOT outlined, NOT a sweet children\'s storybook, NOT a workbook or church-bulletin clip art, NOT kawaii, NOT busy, NOT photo-realistic. '
  + 'Unless the scene names them: no sprouts or seedlings, watering cans, streams, lily pads, sunrises or rolling hills. '
  // 2026-11-13 사용자: 인물 주변 빛줄기 짝대기가 너무 많이 나온다 → 막는다.
  + 'NO radiating rays, glow dashes, sunburst lines, motion lines or emphasis marks around people or objects — the picture stays calm and uncluttered. '
  // 2026-11-14 사용자: 하트 주변에 점·짧은 선이 둘러 나온다 → 하트만이 아니라 강조 표시 전부를 막는다.
  + 'NO EMPHASIS MARKS ANYWHERE: never add little dots, short dashes, ticks, rays, sparkle marks, surprise marks, sweat drops or motion lines around ANYTHING to make it stand out — not around a heart, an object, a gift, a book, a light, a person or a head. Every shape sits on empty background right up to its edge. Small dashes and dots are allowed ONLY inside a shape as its texture (grass, fruit, folds), never floating beside it. '
  + 'No crayon scribbles, pencil, watercolour, halftone dots, sparkles, floating hearts or rainbows, and no English words in the picture; the only word allowed inside the picture is one short Korean label copied exactly from the verse when the scene asks for it (e.g. a bag labelled 염려).';
