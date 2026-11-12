/**
 * T01(귀여운 그림) 의 그림체.
 *
 * 자동완성 T01 카드와 직접 편집의 '플랫 일러스트' 배경이 같은 그림체여야 해서
 * 여기 두고 양쪽이 같이 읽는다. 한쪽에만 적어 두면 T01 을 손볼 때 편집 화면이 조용히 갈라진다.
 *
 * 여기 있는 것은 **기법과 인물**뿐이다. 카드 구도(주인공을 프레임 아래쪽에, 상단 절반은 비움)와
 * 카드별로 돌아가는 바탕색은 글씨를 얹는 T01 카드에만 해당하므로 generate-image.ts 에 남겨 둔다.
 * 편집 화면은 사용자가 글씨를 아무 데나 놓기 때문에 그 구도를 강제하면 안 된다.
 */

/** 매체와 형태. 외곽선 없는 색면이라는 것이 이 그림체의 핵심이다. */
export const T01_FLAT_MEDIUM = 'FLAT, MINIMAL illustration in the style of a modern Korean/Japanese indie sticker or zine artist. '
  + 'SOLID FLAT COLOR FILLS with NO OUTLINES AT ALL — shapes are defined by color alone, never by a drawn line. '
  + 'NO shading, NO gradients, NO highlights. Simple BLOBBY, slightly LOPSIDED shapes with soft hand-drawn edges — '
  + 'charmingly wonky, never geometric or polished. ';

/**
 * 인물 생김새. 머리카락과 팔다리가 없으면 사람이 아니라 달걀로 그려진다.
 * 2026-11-12 사용자(인디 그림책 레퍼런스): "사람 생김새가 더 개성 있고 귀엽게" → 큰 머리·짧은 몸·작은 점 눈·사람마다 특징 하나.
 */
export const T01_FIGURE_LOOK = 'Characters are small, chunky and charming, like characters from an indie picture book or zine: '
  + 'an OVERSIZED soft round head (a third of the body height or more), a short stubby body, tiny mitten hands and short legs. '
  + 'The face is tiny and simple: two small dot eyes set a little wide apart, sometimes a small round dark nose dot, and a tiny short line for a mouth — '
  + 'a slightly sleepy, deadpan, quietly funny look. Give each character ONE personal quirk so they feel like an individual '
  + '(a cowlick, a bobble hat, round glasses, a messy fringe, a striped top, two flat round cheek patches). '
  + 'A character always has CLEARLY DRAWN HAIR (or a hat) with a real shape and simple limbs — never a bald featureless egg. '
  + 'No realistic proportions, no detailed cartoon face, no big sparkly eyes. ';

/** 악센트 색. 뒤에 붙는 바탕 설명이 카드와 편집 화면에서 다르므로 색만 떼어 둔다.
 * (2026-11-12 진한 흙빛 색면을 시험했으나 글씨와 합치면 촌스럽다고 해서 원래 색으로 되돌렸다. 질감만 남김.) */
export const T01_ACCENT_COLOURS = 'BOLD SATURATED accent colours (cobalt blue, red-orange, grass green, sunny yellow, peach, dark brown) ';

/** 표면 질감. 2026-11-12 사용자 레퍼런스: 매끈한 벡터가 아니라 리소그래프·실크스크린 인쇄 느낌. */
export const T01_SURFACE = 'A printed indie-zine surface: a fine, clearly visible risograph / screen-print GRAIN over every colour area, '
  + 'and slightly dry, rough, hand-cut edges on the shapes, like gouache printed on matte paper. Never glossy, never smooth digital vector. ';

/** T01 에서 반드시 피해야 하는 것. 예전 그림체(두꺼운 검정 외곽선·크레용 질감)로 돌아가지 않게 막는다. */
export const T01_NOT = 'NOT outlined (no black ink outlines at all), NOT a doodle cartoon, '
  + 'NO crayon, NO pencil or colored-pencil, NO pastel texture, NO watercolor, NO marker bleed, NO halftone dots, '
  + 'NOT painterly, NOT soft AI-kawaii, NOT detailed, NOT busy, NOT muted, NOT gloomy, NOT photo-realistic, NOT a church poster.';
