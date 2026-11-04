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

/** 인물 생김새. 머리카락과 팔다리가 없으면 사람이 아니라 달걀로 그려진다. */
export const T01_FIGURE_LOOK = 'Any character is a chunky little blob body with a round face, '
  + 'TINY DOT EYES and a small deadpan flat mouth, drawn with tiny dots and short thin lines only. A character always has CLEARLY DRAWN HAIR with a real shape and simple limbs — never a bald featureless egg. No eyebrows, '
  + 'no blush, no smile lines, no expressive cartoon faces. ';

/** 악센트 색. 뒤에 붙는 바탕 설명이 카드와 편집 화면에서 다르므로 색만 떼어 둔다. */
export const T01_ACCENT_COLOURS = 'BOLD SATURATED accent colours (cobalt blue, red-orange, grass green, sunny yellow, peach, dark brown) ';

/** 표면 질감. */
export const T01_SURFACE = 'Clean smooth surface with at most a very subtle paper grain. ';

/** T01 에서 반드시 피해야 하는 것. 예전 그림체(두꺼운 검정 외곽선·크레용 질감)로 돌아가지 않게 막는다. */
export const T01_NOT = 'NOT outlined (no black ink outlines at all), NOT a doodle cartoon, '
  + 'NO crayon, NO pencil or colored-pencil, NO pastel texture, NO watercolor, NO marker bleed, NO halftone dots, '
  + 'NOT painterly, NOT soft AI-kawaii, NOT detailed, NOT busy, NOT muted, NOT dark, NOT photo-realistic, NOT a church poster.';
