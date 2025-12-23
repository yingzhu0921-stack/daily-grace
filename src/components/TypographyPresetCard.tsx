import React from 'react';
import { TypographyPreset } from '../types/typography';

interface TypographyPresetCardProps {
  preset: TypographyPreset;
  isSelected: boolean;
  onSelect: (presetId: string) => void;
}

export const TypographyPresetCard: React.FC<TypographyPresetCardProps> = ({
  preset,
  isSelected,
  onSelect,
}) => {
  const { style } = preset;

  const previewStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: `${Math.min(style.fontSize, 18)}px`, // Scale down for preview
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing}px`,
    textAlign: style.textAlign,
    textShadow: style.shadow && style.shadowConfig
      ? `${style.shadowConfig.offsetX}px ${style.shadowConfig.offsetY}px ${style.shadowConfig.blur}px ${style.shadowConfig.color}`
      : undefined,
    backgroundColor: style.textBg && style.textBgConfig
      ? `${style.textBgConfig.color}${Math.round(style.textBgConfig.opacity * 255).toString(16).padStart(2, '0')}`
      : undefined,
    padding: style.textBg && style.textBgConfig
      ? `${style.textBgConfig.padding / 2}px`
      : undefined,
  };

  return (
    <button
      onClick={() => onSelect(preset.id)}
      className={`
        relative w-full p-4 rounded-xl border-2 transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      {/* Preview */}
      <div className="mb-3 min-h-[60px] flex items-center justify-center">
        <p style={previewStyle} className="text-gray-800 break-keep">
          {preset.preview}
        </p>
      </div>

      {/* Preset Name */}
      <div className="text-sm font-medium text-gray-700">
        {preset.name}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
};
