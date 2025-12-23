// Typography system types

export type TypographyMode = 'preset' | 'custom';

export interface TypographyPreset {
  id: string;
  name: string;
  preview: string;
  style: TypographyStyle;
}

export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  shadow: boolean;
  textBg: boolean;
  // Optional shadow/bg configs
  shadowConfig?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  textBgConfig?: {
    color: string;
    opacity: number;
    padding: number;
  };
}

export interface TypographyState {
  mode: TypographyMode;
  presetId?: string;
  style: TypographyStyle;
}

// Preset definitions
export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    id: 'handwritten-warm',
    name: '따뜻한 손글씨',
    preview: '주님은 나의 목자시니',
    style: {
      fontFamily: "'Nanum Pen Script', cursive",
      fontSize: 28,
      lineHeight: 1.6,
      letterSpacing: 0,
      textAlign: 'center',
      shadow: true,
      textBg: false,
      shadowConfig: {
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        color: 'rgba(0, 0, 0, 0.15)',
      },
    },
  },
  {
    id: 'meditation-serif',
    name: '묵상 세리프',
    preview: '주님은 나의 목자시니',
    style: {
      fontFamily: "'Noto Serif KR', serif",
      fontSize: 24,
      lineHeight: 1.8,
      letterSpacing: 1,
      textAlign: 'center',
      shadow: false,
      textBg: true,
      textBgConfig: {
        color: '#ffffff',
        opacity: 0.85,
        padding: 16,
      },
    },
  },
  {
    id: 'minimal-sans',
    name: '미니멀 산스',
    preview: '주님은 나의 목자시니',
    style: {
      fontFamily: "'Noto Sans KR', sans-serif",
      fontSize: 22,
      lineHeight: 1.7,
      letterSpacing: -0.5,
      textAlign: 'center',
      shadow: false,
      textBg: false,
    },
  },
  {
    id: 'emphasis-title',
    name: '강조 타이틀',
    preview: '주님은 나의 목자시니',
    style: {
      fontFamily: "'Black Han Sans', sans-serif",
      fontSize: 32,
      lineHeight: 1.4,
      letterSpacing: 2,
      textAlign: 'center',
      shadow: true,
      textBg: true,
      shadowConfig: {
        offsetX: 0,
        offsetY: 4,
        blur: 8,
        color: 'rgba(0, 0, 0, 0.3)',
      },
      textBgConfig: {
        color: '#000000',
        opacity: 0.5,
        padding: 20,
      },
    },
  },
  {
    id: 'quiet-contemplation',
    name: '고요한 묵상',
    preview: '주님은 나의 목자시니',
    style: {
      fontFamily: "'Nanum Myeongjo', serif",
      fontSize: 20,
      lineHeight: 2,
      letterSpacing: 1.5,
      textAlign: 'left',
      shadow: false,
      textBg: false,
    },
  },
];

export const DEFAULT_TYPOGRAPHY_STATE: TypographyState = {
  mode: 'preset',
  presetId: 'handwritten-warm',
  style: TYPOGRAPHY_PRESETS[0].style,
};
