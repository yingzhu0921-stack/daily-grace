import React from 'react';
import { TypographyStyle } from '../types/typography';

interface TypographyCustomControlsProps {
  style: TypographyStyle;
  onChange: (updates: Partial<TypographyStyle>) => void;
}

const FONT_OPTIONS = [
  { value: "'Nanum Pen Script', cursive", label: '나눔 펜' },
  { value: "'Noto Serif KR', serif", label: 'Noto 세리프' },
  { value: "'Noto Sans KR', sans-serif", label: 'Noto 산스' },
  { value: "'Black Han Sans', sans-serif", label: '검은고딕' },
  { value: "'Nanum Myeongjo', serif", label: '나눔명조' },
  { value: "'Jua', sans-serif", label: '주아체' },
];

export const TypographyCustomControls: React.FC<TypographyCustomControlsProps> = ({
  style,
  onChange,
}) => {
  return (
    <div className="space-y-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        고급 타이포그래피 설정
      </h3>

      {/* Font Family */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          폰트
        </label>
        <select
          value={style.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          글자 크기: {style.fontSize}px
        </label>
        <input
          type="range"
          min="14"
          max="48"
          step="1"
          value={style.fontSize}
          onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Line Height */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          줄 간격: {style.lineHeight.toFixed(1)}
        </label>
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={style.lineHeight}
          onChange={(e) => onChange({ lineHeight: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Letter Spacing */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          자간: {style.letterSpacing}px
        </label>
        <input
          type="range"
          min="-2"
          max="5"
          step="0.5"
          value={style.letterSpacing}
          onChange={(e) => onChange({ letterSpacing: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Text Align */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          정렬
        </label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ textAlign: align })}
              className={`
                flex-1 py-2 px-4 rounded-lg border transition-colors
                ${style.textAlign === align
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }
              `}
            >
              {align === 'left' && '왼쪽'}
              {align === 'center' && '가운데'}
              {align === 'right' && '오른쪽'}
            </button>
          ))}
        </div>
      </div>

      {/* Shadow Toggle */}
      <div>
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">그림자</span>
          <button
            onClick={() => onChange({ shadow: !style.shadow })}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${style.shadow ? 'bg-blue-500' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${style.shadow ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </label>
      </div>

      {/* Text Background Toggle */}
      <div>
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">배경</span>
          <button
            onClick={() => onChange({ textBg: !style.textBg })}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${style.textBg ? 'bg-blue-500' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${style.textBg ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </label>
      </div>
    </div>
  );
};
