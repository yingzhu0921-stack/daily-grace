import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FontFamily = 
  | 'Inter' | 'SerifKR' | 'NotoSans' | 'NanumGothic' | 'NanumMyeongjo' 
  | 'Jua' | 'BlackHanSans' | 'DoHyeon' | 'NanumPen' | 'Sunflower' 
  | 'GothicA1' | 'GamjaFlower' | 'GowunDodum' | 'GowunBatang' 
  | 'NanumBrush' | 'HiMelody' | 'Gaegu' | 'Dongle' | 'SongMyung' 
  | 'Hahmlet' | 'Playfair' | 'Montserrat' | 'Roboto' | 'Lora';

interface FontOption {
  value: FontFamily;
  label: string;
  family: string;
  category: 'basic' | 'handwriting' | 'display' | 'english';
}

const fontOptions: FontOption[] = [
  // 고딕/명조 (Basic)
  { value: 'NotoSans', label: 'Noto Sans KR (고딕)', family: 'Noto Sans KR', category: 'basic' },
  { value: 'SerifKR', label: 'Noto Serif KR (세리프)', family: 'Noto Serif KR', category: 'basic' },
  { value: 'NanumGothic', label: '나눔고딕', family: 'Nanum Gothic', category: 'basic' },
  { value: 'NanumMyeongjo', label: '나눔명조', family: 'Nanum Myeongjo', category: 'basic' },
  { value: 'GothicA1', label: '고딕 A1', family: 'Gothic A1', category: 'basic' },
  { value: 'GowunDodum', label: '고운 도둠', family: 'Gowun Dodum', category: 'basic' },
  { value: 'GowunBatang', label: '고운 바탕', family: 'Gowun Batang', category: 'basic' },
  { value: 'SongMyung', label: '송명조', family: 'Song Myung', category: 'basic' },
  { value: 'Hahmlet', label: '함릿체', family: 'Hahmlet', category: 'basic' },
  
  // 손글씨/감성 (Handwriting)
  { value: 'NanumPen', label: '나눔손글씨', family: 'Nanum Pen Script', category: 'handwriting' },
  { value: 'NanumBrush', label: '나눔손글씨 붓', family: 'Nanum Brush Script', category: 'handwriting' },
  { value: 'GamjaFlower', label: '감자꽃', family: 'Gamja Flower', category: 'handwriting' },
  { value: 'HiMelody', label: '하이멜로디', family: 'Hi Melody', category: 'handwriting' },
  { value: 'Gaegu', label: '개구쟁이', family: 'Gaegu', category: 'handwriting' },
  
  // 제목/포인트 (Display)
  { value: 'Jua', label: 'Jua (둥근체)', family: 'Jua', category: 'display' },
  { value: 'BlackHanSans', label: '검은고딕', family: 'Black Han Sans', category: 'display' },
  { value: 'DoHyeon', label: '도현체', family: 'Do Hyeon', category: 'display' },
  { value: 'Sunflower', label: '해바라기', family: 'Sunflower', category: 'display' },
  { value: 'Dongle', label: '동글체', family: 'Dongle', category: 'display' },
  
  // 영어 폰트 (English)
  { value: 'Inter', label: 'Inter', family: 'Inter', category: 'english' },
  { value: 'Roboto', label: 'Roboto', family: 'Roboto', category: 'english' },
  { value: 'Montserrat', label: 'Montserrat', family: 'Montserrat', category: 'english' },
  { value: 'Playfair', label: 'Playfair Display', family: 'Playfair Display', category: 'english' },
  { value: 'Lora', label: 'Lora', family: 'Lora', category: 'english' },
];

interface FontPickerProps {
  value: FontFamily;
  onChange: (value: FontFamily) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  const basicFonts = fontOptions.filter(f => f.category === 'basic');
  const handwritingFonts = fontOptions.filter(f => f.category === 'handwriting');
  const displayFonts = fontOptions.filter(f => f.category === 'display');
  const englishFonts = fontOptions.filter(f => f.category === 'english');

  return (
    <Select value={value} onValueChange={(v) => onChange(v as FontFamily)}>
      <SelectTrigger className="w-full rounded-xl bg-white text-[#2E2E2E] border border-[#E3E2E0] px-3 py-2.5 text-sm h-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[400px] bg-white z-[100] border border-[#E3E2E0] shadow-lg">
        <SelectGroup>
          <SelectLabel className="text-xs text-[#7E7C78] font-medium px-2 py-1.5">
            고딕/명조 (Basic)
          </SelectLabel>
          {basicFonts.map((font) => (
            <SelectItem 
              key={font.value} 
              value={font.value}
              className="cursor-pointer hover:bg-[#F9F8F6] focus:bg-[#F9F8F6] py-2.5"
              style={{ fontFamily: font.family }}
            >
              <span style={{ fontFamily: font.family, fontSize: '14px' }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectGroup>

        <SelectGroup>
          <SelectLabel className="text-xs text-[#7E7C78] font-medium px-2 py-1.5">
            손글씨/감성 (Handwriting)
          </SelectLabel>
          {handwritingFonts.map((font) => (
            <SelectItem 
              key={font.value} 
              value={font.value}
              className="cursor-pointer hover:bg-[#F9F8F6] focus:bg-[#F9F8F6] py-2.5"
              style={{ fontFamily: font.family }}
            >
              <span style={{ fontFamily: font.family, fontSize: '14px' }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectGroup>

        <SelectGroup>
          <SelectLabel className="text-xs text-[#7E7C78] font-medium px-2 py-1.5">
            제목/포인트 (Display)
          </SelectLabel>
          {displayFonts.map((font) => (
            <SelectItem 
              key={font.value} 
              value={font.value}
              className="cursor-pointer hover:bg-[#F9F8F6] focus:bg-[#F9F8F6] py-2.5"
              style={{ fontFamily: font.family }}
            >
              <span style={{ fontFamily: font.family, fontSize: '14px' }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectGroup>

        <SelectGroup>
          <SelectLabel className="text-xs text-[#7E7C78] font-medium px-2 py-1.5">
            영어 폰트 (English)
          </SelectLabel>
          {englishFonts.map((font) => (
            <SelectItem 
              key={font.value} 
              value={font.value}
              className="cursor-pointer hover:bg-[#F9F8F6] focus:bg-[#F9F8F6] py-2.5"
              style={{ fontFamily: font.family }}
            >
              <span style={{ fontFamily: font.family, fontSize: '14px' }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
