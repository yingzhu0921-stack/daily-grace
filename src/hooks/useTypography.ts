import { useState, useCallback } from 'react';
import { TypographyState, DEFAULT_TYPOGRAPHY_STATE } from '../types/typography';

/**
 * Hook for managing typography state
 * Provides easy access to typography state and helper functions
 */
export const useTypography = (initialState?: TypographyState) => {
  const [typography, setTypography] = useState<TypographyState>(
    initialState || DEFAULT_TYPOGRAPHY_STATE
  );

  const updateTypography = useCallback((newTypography: TypographyState) => {
    setTypography(newTypography);
  }, []);

  const resetTypography = useCallback(() => {
    setTypography(DEFAULT_TYPOGRAPHY_STATE);
  }, []);

  const getCSSStyle = useCallback((): React.CSSProperties => {
    const { style } = typography;

    return {
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
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
        ? `${style.textBgConfig.padding}px`
        : undefined,
    };
  }, [typography]);

  return {
    typography,
    updateTypography,
    resetTypography,
    getCSSStyle,
  };
};
