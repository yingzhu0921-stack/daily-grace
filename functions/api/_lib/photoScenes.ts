/**
 * 직접 편집 사진 그림체(감성 사진·빈티지 필름)의 장면 후보.
 *
 * 2026-11-14 사용자 "장면은 진짜 다양하게": 갈래(하늘·꽃·물…)만 주면 모델이 노을 언덕·들꽃 풀밭·강으로 되돌아갔다.
 * 구체적인 장면을 크게 모아 두고 매번 무작위로 몇 개만 건네, 그중 말씀에 맞는 하나를 고르게 한다.
 * 물가 장면은 일부러 적게 넣었다(필름이 6장 중 5장 강이었던 적이 있다). 안개 장면은 넣지 않는다(사용자 결정).
 */

/** 감성 사진 — 밝은 파스텔 자연, 사람 없음. */
export const NATURE_PHOTO_SCENES = [
  'cherry blossom branches against a pale sky, shot from below',
  'a quiet lane under a tunnel of cherry blossoms, petals on the ground',
  'a yellow rapeseed field under a clear sky',
  'tulips close up in a field, a soft blurred row of colour behind',
  'a sunflower field seen from low down, big heads against the sky',
  'rows of lavender running toward the horizon',
  'hydrangeas wet with raindrops after rain',
  'round lotus leaves and one pink lotus on a still pond',
  'cosmos flowers swaying along the edge of a field',
  'red poppies against a pale blue sky',
  'daisies close up with light behind them',
  'clover and dewdrops close up in the morning',
  'dandelion seed heads glowing in the light',
  'a single tree standing in a wide green field',
  'white birch trunks in a light, airy forest',
  'a bamboo forest seen looking straight up to the sky',
  'ferns on a forest floor with spots of sunlight',
  'golden ginkgo trees over a path covered with yellow leaves',
  'red maple leaves against a clear blue sky',
  'silver grass (eulalia) shining and bending in the wind on a hillside',
  'golden rice paddies ready for harvest',
  'young green rice paddies reflecting the sky',
  'neat rows of a green tea plantation on gentle hills',
  'apple blossoms in an orchard',
  'a field of ripe wheat moving in the wind',
  'clear turquoise waves washing onto white sand, seen close',
  'beach grass on soft sand dunes',
  'a clear stream running over smooth pebbles',
  'snowy branches against a bright blue sky',
  'a snow-covered field with a few bare trees',
  'frost on grass blades in the early sun',
  'big white cumulus clouds towering over a green field',
  'a rainbow over a meadow after rain',
  'a crescent moon in a deep blue evening sky above dark treetops',
  'a starry night sky over a quiet field',
  'ivy and small flowers on an old stone wall in the sun',
  'climbing roses on a white garden fence',
  'moss and tiny wildflowers growing between stones',
];

/** 빈티지 필름 — 바랜 90s 필름, 장소·동네·자연. 사람은 별도 규칙으로 가끔 작게. */
export const FILM_PHOTO_SCENES = [
  'fields and small houses passing outside a train window',
  'raindrops on a bus window with a blurred town behind',
  'a coastal road seen through a car window',
  'a small, empty country train station platform with tracks running away',
  'laundry drying on a rooftop with the city behind',
  'a hillside village of colourful roofs and narrow stairs',
  'an empty seaside town street in summer',
  'a lawn under a big tree with dappled light',
  'sun glints sparkling on a river',
  'a city river at dusk with bridge lights coming on',
  'an avenue of cherry blossom trees',
  'a snowy village lane with low houses',
  'a street lined with golden ginkgo trees',
  'a wooden dock on a lake',
  'a beach at low tide, wet sand reflecting the sky',
  'a country road through a tunnel of trees',
  'a sunflower field by a country road',
  'a bicycle path running beside rice paddies',
  'an empty playground in afternoon light',
  'the deck rail of a ferry with islands in the sea',
  'a small flower stall in a quiet street, buckets of flowers',
  'a stone wall with ivy and a wooden door',
  'a narrow alley lined with potted plants',
  'a corner shop glowing at blue hour',
  'a summer night lane under street lights',
  'horses grazing in a meadow',
  'sheep on a green hillside',
  'a flock of birds over a city park',
  'a winding mountain road with a guardrail',
  'silver grass fields on a hill in the wind',
  'a quiet winter beach',
  'an old greenhouse full of plants',
  'a small harbour with a few fishing boats',
];

/** 목록에서 서로 다른 n개를 무작위로 고른다. */
export function pickScenes(list: string[], n: number): string[] {
  const pool = [...list];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

export const SCENE_IS_WATER = /river|lake|sea|beach|waves|stream|pond|dock|harbour|ferry|tide/i;
