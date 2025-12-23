import React, { useState } from 'react';
import { TypographyEditor } from './TypographyEditor';
import { useTypography } from '../hooks/useTypography';

/**
 * Example implementation of the Verse Card Generator screen
 * Shows how to integrate the typography system into your card editor
 */
export const VerseCardEditor: React.FC = () => {
  const [verseText, setVerseText] = useState('주님은 나의 목자시니\n내게 부족함이 없으리로다');
  const { typography, updateTypography, getCSSStyle } = useTypography();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Card Preview */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="aspect-[9/16] relative bg-gradient-to-br from-blue-100 to-purple-100 p-8 flex items-center justify-center">
            <textarea
              value={verseText}
              onChange={(e) => setVerseText(e.target.value)}
              style={getCSSStyle()}
              className="w-full h-full bg-transparent border-none outline-none resize-none text-center"
              placeholder="말씀을 입력하세요..."
            />
          </div>
        </div>

        {/* Typography Editor */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <TypographyEditor
            typography={typography}
            onTypographyChange={updateTypography}
          />
        </div>

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-800 text-gray-100 rounded-lg p-4 text-xs font-mono">
            <div>Mode: {typography.mode}</div>
            <div>Preset: {typography.presetId || 'none'}</div>
            <div>Font: {typography.style.fontFamily}</div>
            <div>Size: {typography.style.fontSize}px</div>
          </div>
        )}
      </div>
    </div>
  );
};
