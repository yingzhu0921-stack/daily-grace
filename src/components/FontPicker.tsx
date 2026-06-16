import React from 'react';

export type FontFamily =
  | 'Inter' | 'SerifKR' | 'NotoSans' | 'NanumGothic' | 'NanumMyeongjo'
  | 'Jua' | 'BlackHanSans' | 'DoHyeon' | 'NanumPen' | 'Sunflower'
  | 'GothicA1' | 'GamjaFlower' | 'GowunDodum' | 'GowunBatang'
  | 'NanumBrush' | 'HiMelody' | 'Gaegu' | 'Dongle' | 'SongMyung'
  | 'Hahmlet' | 'Playfair' | 'Montserrat' | 'Roboto' | 'Lora'
  | 'KBLJump' | 'GangwonTunTun' | 'PaperBlack' | 'PaperLight' | 'Taenada'
  | 'RidiBatang' | 'SeoulHangang' | 'Hyunok' | 'Kkubullim' | 'GangwonModoo'
  | 'Keris' | 'JeonnamBarun' | 'Incheon' | 'Limelight' | 'CaveatBrush'
  | 'Cafe24SuperMagic';

export interface FontOption {
  value: FontFamily;
  label: string;
  family: string;
}

export const fontOptions: FontOption[] = [
  // ── 말씀카드 추천 ──
  // 초강렬 헤드라인
  { value: 'KBLJump', label: 'KBL점프', family: 'KBLJump' },
  { value: 'GangwonTunTun', label: '강원튼튼', family: 'GangwonTunTun' },
  // 개성/힙
  { value: 'Kkubullim', label: '꾸불림', family: 'Kkubullim' },
  { value: 'Taenada', label: '태나다', family: 'Taenada' },
  { value: 'Cafe24SuperMagic', label: '카페24슈퍼매직', family: 'Cafe24SuperMagic' },
  // 깔끔한 고딕
  { value: 'PaperBlack', label: '페이퍼블랙', family: 'PaperBlack' },
  { value: 'PaperLight', label: '페이퍼라이트', family: 'PaperLight' },
  { value: 'SeoulHangang', label: '서울한강', family: 'SeoulHangang' },
  { value: 'GangwonModoo', label: '강원모두', family: 'GangwonModoo' },
  { value: 'JeonnamBarun', label: '전남바른', family: 'JeonnamBarun' },
  // 손글씨/감성
  { value: 'Hyunok', label: '현옥샘', family: 'Hyunok' },
  { value: 'Incheon', label: '인천자람', family: 'Incheon' },
  // 세리프/명조 · 교육체 개성
  { value: 'RidiBatang', label: '리디바탕', family: 'RidiBatang' },
  { value: 'Keris', label: '케리스', family: 'Keris' },
  // 영문 (레트로/브러시)
  { value: 'Limelight', label: 'Limelight', family: 'Limelight' },
  { value: 'CaveatBrush', label: 'Caveat Brush', family: 'Caveat Brush' },

  // 고딕/명조 (Basic)
  { value: 'NotoSans', label: 'Noto Sans KR', family: 'Noto Sans KR' },
  { value: 'SerifKR', label: 'Noto Serif KR', family: 'Noto Serif KR' },
  { value: 'NanumGothic', label: '나눔고딕', family: 'Nanum Gothic' },
  { value: 'NanumMyeongjo', label: '나눔명조', family: 'Nanum Myeongjo' },
  { value: 'GothicA1', label: '고딕 A1', family: 'Gothic A1' },
  { value: 'GowunDodum', label: '고운도둠', family: 'Gowun Dodum' },
  { value: 'GowunBatang', label: '고운바탕', family: 'Gowun Batang' },
  { value: 'SongMyung', label: '송명조', family: 'Song Myung' },
  { value: 'Hahmlet', label: '함릿체', family: 'Hahmlet' },

  // 손글씨/감성 (Handwriting)
  { value: 'NanumPen', label: '나눔손글씨', family: 'Nanum Pen Script' },
  { value: 'NanumBrush', label: '나눔붓', family: 'Nanum Brush Script' },
  { value: 'GamjaFlower', label: '감자꽃', family: 'Gamja Flower' },
  { value: 'HiMelody', label: '하이멜로디', family: 'Hi Melody' },
  { value: 'Gaegu', label: '개구쟁이', family: 'Gaegu' },

  // 제목/포인트 (Display)
  { value: 'Jua', label: 'Jua', family: 'Jua' },
  { value: 'BlackHanSans', label: '검은고딕', family: 'Black Han Sans' },
  { value: 'DoHyeon', label: '도현체', family: 'Do Hyeon' },
  { value: 'Sunflower', label: '해바라기', family: 'Sunflower' },
  { value: 'Dongle', label: '동글체', family: 'Dongle' },

  // 영어 폰트 (English)
  { value: 'Inter', label: 'Inter', family: 'Inter' },
  { value: 'Roboto', label: 'Roboto', family: 'Roboto' },
  { value: 'Montserrat', label: 'Montserrat', family: 'Montserrat' },
  { value: 'Playfair', label: 'Playfair', family: 'Playfair Display' },
  { value: 'Lora', label: 'Lora', family: 'Lora' },
];

interface FontPickerProps {
  value: FontFamily;
  onChange: (value: FontFamily) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 hide-scrollbar">
      {fontOptions.map((font) => (
        <button
          key={font.value}
          onClick={() => onChange(font.value)}
          style={{ fontFamily: font.family }}
          className={`shrink-0 px-3 py-1.5 rounded-full border text-xs sm:text-sm whitespace-nowrap transition-all ${
            value === font.value
              ? 'bg-[#6BAAB8] text-white border-[#6BAAB8] shadow-sm'
              : 'bg-white text-[#2E2E2E] border-[#E3E2E0] hover:border-[#6BAAB8]'
          }`}
        >
          {font.label}
        </button>
      ))}
    </div>
  );
}
