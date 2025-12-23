import React, { useState } from 'react';
import {
  TypographyState,
  TypographyStyle,
  TYPOGRAPHY_PRESETS,
  DEFAULT_TYPOGRAPHY_STATE,
} from '../types/typography';
import { TypographyPresetCard } from './TypographyPresetCard';
import { TypographyCustomControls } from './TypographyCustomControls';

interface TypographyEditorProps {
  typography: TypographyState;
  onTypographyChange: (typography: TypographyState) => void;
}

export const TypographyEditor: React.FC<TypographyEditorProps> = ({
  typography,
  onTypographyChange,
}) => {
  const [showCustomControls, setShowCustomControls] = useState(typography.mode === 'custom');

  const handlePresetSelect = (presetId: string) => {
    const preset = TYPOGRAPHY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    onTypographyChange({
      mode: 'preset',
      presetId: preset.id,
      style: { ...preset.style },
    });

    // Close custom controls when switching to preset
    setShowCustomControls(false);
  };

  const handleCustomize = () => {
    setShowCustomControls(true);
    // Don't change mode yet - only change when user actually modifies a control
  };

  const handleStyleChange = (updates: Partial<TypographyStyle>) => {
    onTypographyChange({
      mode: 'custom',
      presetId: undefined, // Clear preset association
      style: {
        ...typography.style,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Mode Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          타이포그래피
        </h2>
        {typography.mode === 'custom' && (
          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            커스텀 모드
          </span>
        )}
      </div>

      {/* Preset Grid */}
      {typography.mode === 'preset' && (
        <div className="grid grid-cols-2 gap-3">
          {TYPOGRAPHY_PRESETS.map((preset) => (
            <TypographyPresetCard
              key={preset.id}
              preset={preset}
              isSelected={typography.presetId === preset.id}
              onSelect={handlePresetSelect}
            />
          ))}
        </div>
      )}

      {/* Customize Button (only in preset mode) */}
      {typography.mode === 'preset' && !showCustomControls && (
        <button
          onClick={handleCustomize}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          이 스타일 커스터마이징하기
        </button>
      )}

      {/* Custom Controls */}
      {showCustomControls && (
        <div className="space-y-4">
          {/* Back to Presets (only if still in preset mode) */}
          {typography.mode === 'preset' && (
            <button
              onClick={() => setShowCustomControls(false)}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              프리셋으로 돌아가기
            </button>
          )}

          {/* Reset to Presets (only if in custom mode) */}
          {typography.mode === 'custom' && (
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
              <span className="text-sm text-purple-700">
                커스텀 설정이 적용되었습니다
              </span>
              <button
                onClick={() => {
                  onTypographyChange({
                    ...DEFAULT_TYPOGRAPHY_STATE,
                  });
                  setShowCustomControls(false);
                }}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                프리셋으로 초기화
              </button>
            </div>
          )}

          <TypographyCustomControls
            style={typography.style}
            onChange={handleStyleChange}
          />
        </div>
      )}
    </div>
  );
};
