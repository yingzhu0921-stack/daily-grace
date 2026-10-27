import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Wand2, Upload, ImageIcon, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Paintbrush, Ruler, Palette, Check, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { RecordSelectorModal } from '@/components/RecordSelectorModal';
import { CardSaveSuccessModal } from '@/components/CardSaveSuccessModal';
import { LoginModal } from '@/components/LoginModal';
import { FontPicker, fontOptions } from '@/components/FontPicker';
import { toast } from 'sonner';

import { saveCard, getCardById, type VerseCard } from '@/utils/verseCardDB';
import { renderGenerativeCard, pickGrainSpec, preloadGrainFonts, emphasisWords, canEmphasize, remapEmphasis, type GenerativeStyle, type GenerativeSpec, type EmphasisChoice } from '@/utils/generativeCard';

// Add global CSS for hiding UI controls during capture + mobile viewport fix
const hideUIControlsStyle = `
  .hide-ui-controls .ui-control {
    display: none !important;
  }
  .hide-ui-controls .dashed-border {
    display: none !important;
  }
  body {
    overscroll-behavior: none;
  }
`;

// Inject styles into head
if (typeof document !== 'undefined') {
  const styleId = 'card-designer-ui-controls';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = hideUIControlsStyle;
    document.head.appendChild(style);
  }
}


/** ─────────────────────────────────────────────────────────
 * 캔버스 상태 모델
 * ───────────────────────────────────────────────────────── */
type Ratio = '9:16' | '16:9' | '1:1' | '4:3' | '4:5' | '3:4' | '2:3';
type Align = 'left' | 'center' | 'right';

type TextStyle = {
  content: string;
  fontFamily: 'Inter' | 'SerifKR' | 'NotoSans' | 'NanumGothic' | 'NanumMyeongjo' | 'Jua' | 'BlackHanSans' | 'DoHyeon' | 'NanumPen' | 'Sunflower' | 'GothicA1' | 'GamjaFlower' | 'GowunDodum' | 'GowunBatang' | 'NanumBrush' | 'HiMelody' | 'Gaegu' | 'Dongle' | 'SongMyung' | 'Hahmlet' | 'Playfair' | 'Montserrat' | 'Roboto' | 'Lora' | 'KBLJump' | 'GangwonTunTun' | 'PaperBlack' | 'PaperLight' | 'Taenada' | 'RidiBatang' | 'SeoulHangang' | 'Hyunok' | 'Kkubullim' | 'GangwonModoo' | 'Keris' | 'JeonnamBarun' | 'Incheon' | 'Limelight' | 'CaveatBrush' | 'Cafe24SuperMagic';
  fontSize: number;         // px
  lineHeight: number;       // 1.2 ~ 1.8
  letterSpacing: number;    // -1 ~ 2(px)
  color: string;            // hex
  bold: boolean;
  italic: boolean;
  underline: boolean;
  stroke: { width: number; color: string; enabled: boolean };
  shadow: { x: number; y: number; blur: number; color: string; enabled: boolean };
  box: { enabled: boolean; color: string; opacity: number; padding: number; radius: number };
  align: Align;
  x: number; // %, 0~100
  y: number; // %, 0~100
  w: number; // %, 텍스트 박스 너비 (이제 가변)
  h: number; // %, 텍스트 박스 높이 (auto-grow)
};

type Meta = {
  ratio: Ratio;
  safeGuide: boolean;
  bgColor: string;
  bgImageUrl?: string;
  bgScale: number;  // 배경 이미지 확대/축소 (100 = 기본)
  bgPositionX: number; // 배경 이미지 가로 위치 (0-100)
  bgPositionY: number; // 배경 이미지 세로 위치 (0-100)
  bgFilter: string; // CSS filter (e.g., 'sepia(1)', 'grayscale(1)', etc.)
  bgDarken: number; // 배경 어둡게 (0-60, opacity percentage)
  bgBlur: number; // 배경 흐리게 (0-8, blur radius in px)
};

type GenerationKey = 'auto' | 'regenerate' | 'photo' | 'prompt' | 'background';

type AutoTypography = {
  color: string;
  secondaryColor: string;
  referenceColor: string;
  shadow: string;
  editShadow: { x: number; y: number; blur: number; color: string };
  mainSize: string;
  subSize: string;
  refSize: string;
  lineHeight: number;
  editFontSize: number;
  weight: React.CSSProperties['fontWeight'];
  bold: boolean;
  box?: {
    enabled: boolean;
    color: string;
    opacity: number;
    padding: number;
    radius: number;
  };
};

const PALETTE = ['#FFFFFF','#000000','#7E7C78','#1F1F1F','#A57DB8','#E8C87D','#DD957D'];

/** ─────────────────────────────────────────────────────────
 * 유틸
 * ───────────────────────────────────────────────────────── */
const RatioBox: React.FC<{ ratio: Ratio; className?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({ ratio, className, style, children }) => {
  const cls = 
    ratio === '9:16' ? 'aspect-[9/16]' :
    ratio === '16:9' ? 'aspect-[16/9]' :
    ratio === '1:1' ? 'aspect-square' :
    ratio === '4:3' ? 'aspect-[4/3]' :
    ratio === '4:5' ? 'aspect-[4/5]' :
    ratio === '3:4' ? 'aspect-[3/4]' :
    'aspect-[2/3]';
  return <div className={`${cls} ${className||''}`} style={style}>{children}</div>;
};

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(n, max)); }

function ratioToAspect(ratio: Ratio | string) {
  const [w, h] = ratio.split(':').map(Number);
  return w && h ? `${w}/${h}` : '4/5';
}

function hexToRgba(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized;
  const num = parseInt(value, 16);
  if (Number.isNaN(num)) return `rgba(0,0,0,${opacity})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${opacity})`;
}

// 말씀 주소의 핵심 토큰: "책이름 장:절" (범위 -절 허용). 반드시 책이름(글자)이 앞에 있어야 하므로
// "5:30" 같은 시간 표기만으론 안 걸림.
const AUTO_BIBLE_REF_RE = /(?:[1-3]\s*)?[A-Za-z가-힣]{1,12}\.?\s*\d{1,3}\s*[:：]\s*\d{1,3}(?:\s*[-~]\s*\d{1,3})?/;
// 주소 뒤에 붙을 수 있는 번역본 이름(있어도 주소 줄로 인정)
const BIBLE_VERSION_RE = /^(개역한글|개역개정|개역|표준새번역|새번역|공동번역|현대인의성경|쉬운성경|우리말성경|현대어성경|바른성경|NIV|ESV|KJV|NASB|MSG|AMP|NLT|NKJV)$/i;

// 한 줄이 "말씀 주소 줄"인지: 핵심 토큰이 있고 나머지는 없거나 번역본 이름뿐일 때.
// (본문 문장은 핵심 토큰이 없거나, 있어도 나머지 텍스트가 길어서 제외됨)
function isAutoCaptionLine(text: string, scale?: number) {
  if (typeof scale === 'number' && scale <= 0.55) return true;
  const t = String(text).trim().replace(/^[[(]+/, '').replace(/[\])]+$/, '').trim();
  if (!AUTO_BIBLE_REF_RE.test(t)) return false;
  const rest = t.replace(AUTO_BIBLE_REF_RE, '').replace(/[·・,|/()[\]\s]/g, '').trim();
  return rest === '' || BIBLE_VERSION_RE.test(rest);
}

// 원문에서 말씀 주소를 위치(앞/중간/뒤)·버전명 상관없이 통째로 추출해 본문과 분리.
// 주소는 괄호·버전명(개역한글 등)을 떼고 깨끗한 "책 장:절"만 남긴다.
const REF_TOKEN_RE = /[[(]?\s*(?:[1-3]\s*)?[A-Za-z가-힣]{1,12}\.?\s*\d{1,3}\s*[:：]\s*\d{1,3}(?:\s*[-~]\s*\d{1,3})?\s*[\])]?(?:\s*[·・,|/]?\s*(?:개역한글|개역개정|개역|표준새번역|새번역|공동번역|현대인의성경|쉬운성경|우리말성경|현대어성경|바른성경|NIV|ESV|KJV|NASB|MSG|AMP|NLT|NKJV))?/i;
function extractReference(raw: string): { body: string; reference: string } {
  const m = raw.match(REF_TOKEN_RE);
  if (!m) return { body: raw.trim(), reference: '' };
  const token = m[0];
  const reference = token
    .replace(/[[\]()]/g, '')
    .replace(/\s*[·・,|/]?\s*(?:개역한글|개역개정|개역|표준새번역|새번역|공동번역|현대인의성경|쉬운성경|우리말성경|현대어성경|바른성경|NIV|ESV|KJV|NASB|MSG|AMP|NLT|NKJV)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const body = raw.replace(token, '\n')
    .split('\n').map((s) => s.trim()).filter(Boolean).join('\n');
  return { body: body || raw.trim(), reference };
}

function hasProclamationTone(text: string) {
  return /(전파|선포|찬송|찬양|입술|입을|입이|복음|보내소서|가라|외치|증거|담대)/.test(text);
}

const T03_LAYOUT = {
  maxWidthCqw: 84,
  ornamentHeightCqw: 2.8,
  ornamentGapCqw: 2.4,
  ruleWidthCqw: 7.2,
  ruleThicknessCqw: 0.14,
  ruleTopGapCqw: 3.2,
  referenceGapCqw: 2.6,
  referenceFontCqw: 2.65,
  referenceLineHeight: 1.1,
  referencePaddingXCqw: 3.8,
  referencePaddingYCqw: 0.9,
  referenceBorderCqw: 0.14,
} as const;

type T03Composition = {
  anchorPercent: number;
  baseFontCqw: number;
  heroIndices: Set<number>;
  accentLineIndex: number;
  accentDirection: -1 | 1;
};

type T03LinePresentation = {
  fontSizeCqw: number;
  lineHeight: number;
  letterSpacingEm: number;
  fontWeight: number;
  isHero: boolean;
  isHandAccent: boolean;
};

type T03RenderLine = T03LinePresentation & {
  text: string;
  sourceIndex: number;
  fontFamily: string;
  gapBeforeCqw: number;
};

function getT03Composition(
  lines: { text: string; scale: number }[],
  textZone: 'upper' | 'center' | 'lower' | undefined,
  variationSeed: number,
  primaryFontKey: string,
  proclamation: boolean,
): T03Composition {
  const safeSeed = Math.abs(Number.isFinite(variationSeed) ? variationSeed : 0);
  const variant = safeSeed % 3;
  const scales = lines.map((line) => clamp(Number(line.scale) || 1, 0.75, 2));
  const maxScale = Math.max(1, ...scales);
  const fallbackHero = lines.length ? Math.min(lines.length - 1, Math.floor(lines.length / 2)) : 0;
  const heroIndices = new Set<number>();
  if (maxScale >= 1.2) {
    scales.forEach((scale, index) => {
      if (scale >= Math.max(1.2, maxScale - 0.08)) heroIndices.add(index);
    });
  } else if (lines.length) {
    // 직접 문구를 수정해 의미 scale이 평평해진 경우에도 한 줄의 시각적 중심은 유지한다.
    heroIndices.add(fallbackHero);
  }

  const isHandwritingPrimary = primaryFontKey === 'KirangHaerang' || primaryFontKey === 'HiMelody';
  const accentCandidates = lines
    .map((line, index) => ({ index, length: Array.from(line.text.replace(/\s/g, '')).length }))
    .filter(({ index, length }) => !heroIndices.has(index) && length >= 2 && length <= 16);
  const accentLineIndex = !isHandwritingPrimary && variant === 2 && accentCandidates.length
    ? accentCandidates[accentCandidates.length - 1].index
    : -1;

  const anchors = textZone === 'upper'
    ? [36, 39, 42]
    : textZone === 'lower'
    ? [58, 61, 64]
    : [44, 50, 56];

  return {
    anchorPercent: anchors[variant],
    baseFontCqw: proclamation ? 5.1 : 4.9,
    heroIndices,
    accentLineIndex,
    accentDirection: variant === 1 ? -1 : 1,
  };
}

function getT03LinePresentation(
  scale: number,
  index: number,
  composition: T03Composition,
  handwritingPrimary: boolean,
): T03LinePresentation {
  const safeScale = clamp(Number(scale) || 1, 0.75, 2);
  const isHero = composition.heroIndices.has(index);
  const isHandAccent = composition.accentLineIndex === index;
  return {
    // 의미 분석의 scale을 그대로 크기에 반영하되, 히어로와 연결 문장의 대비를 더 또렷하게 만든다.
    fontSizeCqw: composition.baseFontCqw * (isHero ? safeScale * 1.22 : safeScale * 0.86),
    lineHeight: isHero ? 1.02 : (isHandAccent ? 1.24 : 1.34),
    letterSpacingEm: isHero ? -0.022 : (isHandAccent ? 0.025 : 0.055),
    fontWeight: isHero ? (handwritingPrimary ? 500 : 600) : 400,
    isHero,
    isHandAccent,
  };
}

function getT03LineGap(previous: T03RenderLine | undefined, current: T03RenderLine) {
  if (!previous) return 0;
  if (previous.isHero && current.isHero) return 0.35;
  if (previous.isHero || current.isHero) return 1.65;
  return 0.65;
}

function setCanvasLetterSpacing(ctx: CanvasRenderingContext2D, em: number) {
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${em}em`;
}

function readLocalRecordList(key: string, type: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]').map((record: any) => ({ ...record, type }));
  } catch {
    return [];
  }
}

function getLocalRecordsForSelector() {
  return [
    ...readLocalRecordList('meditations', 'meditation'),
    ...readLocalRecordList('prayers', 'prayer'),
    ...readLocalRecordList('gratitudes', 'gratitude'),
    ...readLocalRecordList('diaries', 'diary'),
  ];
}

/**
 * Crop image to specified aspect ratio (center crop)
 */
async function cropImageToRatio(imageDataUrl: string, ratio: Ratio): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Parse target ratio
      const [widthRatio, heightRatio] = ratio.split(':').map(Number);
      const targetAspectRatio = widthRatio / heightRatio;

      // Calculate source dimensions
      const sourceAspectRatio = img.width / img.height;

      let cropWidth: number, cropHeight: number, cropX: number, cropY: number;

      if (sourceAspectRatio > targetAspectRatio) {
        // Image is wider than target - crop width
        cropHeight = img.height;
        cropWidth = cropHeight * targetAspectRatio;
        cropX = (img.width - cropWidth) / 2;
        cropY = 0;
      } else {
        // Image is taller than target - crop height
        cropWidth = img.width;
        cropHeight = cropWidth / targetAspectRatio;
        cropX = 0;
        cropY = (img.height - cropHeight) / 2;
      }

      // Create canvas and crop
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      // Convert back to data URL
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/** ─────────────────────────────────────────────────────────
 * 메인 페이지
 * ───────────────────────────────────────────────────────── */
/** ─────────────────────────────────────────────────────────
 * Helper: Text Wrapping for Canvas
 * ───────────────────────────────────────────────────────── */
const wrapCanvasText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

/** ─────────────────────────────────────────────────────────
 * 메인 페이지
 * ───────────────────────────────────────────────────────── */
export default function Designer() {
  // 사진 업로드 후 AI가 글씨까지 생성하는 실험 기능은 당분간 사용자에게 노출하지 않는다.
  // 관련 구현은 유지해 두 핵심 흐름이 안정된 뒤 다시 활성화할 수 있게 한다.
  const showPhotoAiFlow = false;
  const navigate = useNavigate();
  const { requireAuth, showLoginModal, setShowLoginModal, loginCallbackUrl, user, loading } = useAuth();
  
  // 메타/텍스트 상태
  const [meta, setMeta] = useState<Meta>({ 
    ratio: '9:16', 
    safeGuide: true, 
    bgColor: '#7B8FA0',
    bgScale: 150, 
    bgPositionX: 50, 
    bgPositionY: 50,
    bgFilter: 'none',
    bgDarken: 0,
    bgBlur: 0
  });
  const [t, setT] = useState<TextStyle>({
    content: '텍스트를 입력하세요.',
    fontFamily: 'Inter',
    fontSize: 18,
    lineHeight: 1.35,
    letterSpacing: 0,
    color: '#FFFFFF',
    bold: false,
    italic: false,
    underline: false,
    stroke: { enabled: false, width: 2, color: '#000000' },
    shadow: { enabled: false, x: 0, y: 2, blur: 8, color: 'rgba(0,0,0,.35)' },
    box: { enabled: false, color: '#000000', opacity: 0, padding: 20, radius: 12 },
    align: 'center',
    x: 50, y: 50, w: 85, h: 40, // w, h 초기값
  });
  const [activeTab, setActiveTab] = useState<'text'|'font'|'color'|'size'>('text');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBgEditMode, setIsBgEditMode] = useState(false);
  const [bgPrompt, setBgPrompt] = useState('');
  const [expandedPrompt, setExpandedPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [isExpandingPrompt, setIsExpandingPrompt] = useState(false);
  const lastTapRef = useRef<number>(0);
  const [lastGenerateTime, setLastGenerateTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recordSelectorOpen, setRecordSelectorOpen] = useState(false);
  const [availableRecords, setAvailableRecords] = useState<any[]>([]);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [savedCardData, setSavedCardData] = useState<{ imageDataUrl: string; text: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [bgTab, setBgTab] = useState<'ai' | 'photo' | 'color'>('ai');
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<{
    key: GenerationKey;
    startedAt: number;
    durationMs: number;
  } | null>(null);
  const [progressNow, setProgressNow] = useState(Date.now());

  // Track keyboard height for iOS: pad the bottom so panel stays above keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(kh);
    };
    handler();
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);

  useEffect(() => {
    if (!generationProgress) return;
    const timer = window.setInterval(() => setProgressNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [generationProgress]);

  // ── 멀티스텝 플로우 ──
  type FlowStep = 'entry' | 'record' | 'auto-template' | 'auto-preview' | 'edit' | 'photo-upload';
  const [flowStep, setFlowStep] = useState<FlowStep>('entry');
  // T04 제자리 문구 수정: null이면 편집 안 함, 문자열이면 편집 중(본문 초안)
  const [textEditDraft, setTextEditDraft] = useState<string | null>(null);
  // 강조 고르기 패널. null 이면 안 열림. from 은 첫 번째로 탭한 어절(아직 끝을 안 고름).
  const [emphasisPick, setEmphasisPick] = useState<{ from: number | null; applied: { from: number; to: number } | null } | null>(null);
  // 고른 뒤 카드를 다시 그리는 동안. 연타로 순서가 엉키는 걸 막는다.
  const [emphasisBusy, setEmphasisBusy] = useState(false);
  const [activeTrack, setActiveTrack] = useState<'auto' | 'manual' | 'photo' | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoText, setPhotoText] = useState('');
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [verseInput, setVerseInput] = useState('');
  const [autoResult, setAutoResult] = useState<{
    image: string;
    template: string;
    fonts: { primary: string; secondary: string };
    lines: { text: string; scale: number }[];
    aiText?: boolean;
    textAlign: 'left' | 'center';
    useBrush: boolean;
    textZone?: 'upper' | 'center' | 'lower';
    mood: string;
    recommendedTemplates: string[];
    backgroundConcept?: string;
    sceneSubject?: string;
    typographyVersion?: number;
    visualMotifs?: string[];
    palette?: string;
    lighting?: string;
    composition?: string;
    typographyTone?: string;
    fontMood?: string;
    avoidImagery?: string[];
    ratio?: Ratio;
    typography?: AutoTypography;
    simpleLines?: string[];
    simpleScale?: number;   // T04: 미리보기/저장본 공통 글씨 배율
    genSeed?: number;      // 코드 렌더 카드(T03): 재현·재편집용 시드
    genStyle?: GenerativeStyle;
    genEmphasis?: EmphasisChoice;   // 사용자가 고른 강조 구간. undefined 면 자동
    genBodyText?: string;           // 주소를 뗀 본문. 강조 후보를 세는 데 쓴다
  } | null>(null);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [cardPolicyExpanded, setCardPolicyExpanded] = useState(false);
  const [recordPickerTarget, setRecordPickerTarget] = useState<'auto' | 'manual-text' | 'photo' | 'manual-bg'>('auto');

  // 재생성 시 이전 장면 피사체를 누적해 다음 요청에서 제외 (같은 장면 반복 방지)
  const usedSubjectsRef = useRef<string[]>([]);

  // Mobile: start collapsed by default
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);  // 진입 시 패널 닫혀있음
  const panelCollapsedBeforeEdit = useRef(true);

  const isPlaceholderText = t.content === '텍스트를 입력하세요.';
  const isTextEmpty = !t.content.trim() || isPlaceholderText;
  // 배경 선택 안내가 떠 있는 상태. 이때는 글씨 상자의 점선·핸들·힌트를 숨겨 안내와 겹치지 않게 한다.
  // 기본 문구('텍스트를 입력하세요.')도 빈 것으로 본다 — 그래야 첫 진입부터 안내가 뜬다.
  // (isTextEmpty 가 아니라 !t.content.trim() 을 쓰던 때는 상자를 한 번 눌렀다 나와야만 떴다)
  const showBgPrompt = !meta.bgImageUrl && isTextEmpty && !isEditing && !isBgEditMode;

  const openBackgroundSheet = (tab: typeof bgTab = 'ai') => {
    setBgTab(tab);
    setBgOpen(true);
  };

  const startGenerationProgress = useCallback((key: GenerationKey, durationMs: number) => {
    const now = Date.now();
    setProgressNow(now);
    setGenerationProgress({ key, startedAt: now, durationMs });
  }, []);

  const stopGenerationProgress = useCallback((key: GenerationKey) => {
    setGenerationProgress(current => current?.key === key ? null : current);
  }, []);

  const getGenerationProgress = (key: GenerationKey) => {
    if (generationProgress?.key !== key) {
      return { active: false, percent: 0, remainingSeconds: 0 };
    }
    const elapsed = Math.max(0, progressNow - generationProgress.startedAt);
    const rawPercent = elapsed / generationProgress.durationMs;
    const percent = Math.min(95, Math.max(8, Math.round(rawPercent * 100)));
    const remainingSeconds = Math.max(1, Math.ceil((generationProgress.durationMs - elapsed) / 1000));
    return { active: true, percent, remainingSeconds };
  };

  const renderGenerationContent = (
    key: GenerationKey,
    idleLabel: string,
    activeLabel: string,
    icon?: React.ReactNode,
    dark = true,
    compact = false
  ) => {
    const progress = getGenerationProgress(key);
    if (!progress.active) {
      return (
        <>
          {icon}
          {idleLabel}
        </>
      );
    }

    // 좁은 버튼(다시 생성 등)용 간단 로딩 — 스피너 + 짧은 텍스트만, 줄바꿈 없음
    if (compact) {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[13px]">
          <span className={`w-3.5 h-3.5 border-2 rounded-full animate-spin ${dark ? 'border-white/30 border-t-white' : 'border-[#1F1F1F]/30 border-t-[#1F1F1F]'}`} />
          {activeLabel}
        </span>
      );
    }

    return (
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex items-center justify-center gap-2">
          <div className={`w-4 h-4 border-2 rounded-full animate-spin ${dark ? 'border-white/30 border-t-white' : 'border-[#1F1F1F]/30 border-t-[#1F1F1F]'}`} />
          <span>{activeLabel}</span>
          <span className={dark ? 'text-white/70' : 'text-[#7E7C78]'}>
            약 {progress.remainingSeconds}초
          </span>
        </div>
        <div className={`h-1.5 w-full overflow-hidden rounded-full ${dark ? 'bg-white/20' : 'bg-[#E3E2E0]'}`}>
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${dark ? 'bg-white' : 'bg-[#1F1F1F]'}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    );
  };

  const renderCardPolicyNotice = () => (
    <div className="rounded-lg border border-[#E8E7E5] bg-[#F9F8F6] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#2E2E2E]">
            입력 콘텐츠 안내
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[#7E7C78]">
            Daily Grace는 성경 본문이나 찬양 가사 등의 콘텐츠를 직접 제공하지 않습니다. 카드에 들어가는 문구와 이미지는 사용자가 직접 입력하거나 업로드합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCardPolicyExpanded(value => !value)}
          className="shrink-0 pt-0.5 text-[11px] font-semibold text-[#4F8A5B] underline underline-offset-2"
        >
          {cardPolicyExpanded ? '접기' : '콘텐츠 이용 안내 보기'}
        </button>
      </div>

      {cardPolicyExpanded && (
        <div className="mt-2 border-t border-[#E3E2E0] pt-2">
          <p className="text-[12px] font-semibold text-[#2E2E2E]">
            콘텐츠 이용 안내
          </p>
          <div className="mt-1.5 space-y-2 text-[11px] leading-4 text-[#7E7C78]">
            <p>
              Daily Grace는 사용자가 직접 입력하거나 업로드한 콘텐츠를 기록하고, 카드 및 이미지 등의 형태로 디자인할 수 있도록 돕는 서비스입니다.
            </p>
            <p>
              Daily Grace는 성경 번역문, 찬양·CCM 가사, 도서의 문장 등 제3자가 권리를 보유할 수 있는 콘텐츠의 원문을 직접 제공하거나 검색·자동완성하지 않습니다.
            </p>
            <p>
              사용자는 직접 입력한 내용을 개인 기록, 묵상 및 카드 제작 등에 활용할 수 있습니다.
            </p>
            <p>
              다만 성경 번역문, 찬양 가사, 도서의 문장, 사진 등 제3자의 저작물이 포함된 콘텐츠를 SNS 등에 공개하거나 외부에 배포·상업적으로 이용하는 경우에는 해당 콘텐츠의 저작권 및 권리자의 이용 조건이 적용될 수 있습니다.
            </p>
            <p>
              Daily Grace는 사용자가 입력한 콘텐츠의 저작권을 소유한다고 주장하지 않으며, 해당 콘텐츠의 이용 가능 여부나 권리 상태를 보증하지 않습니다.
            </p>
            <p>
              자세한 사항은 각 콘텐츠의 권리자 또는 공식 이용 정책을 확인해 주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/legal')}
            className="mt-1.5 text-[11px] font-semibold text-[#4F8A5B] underline underline-offset-2"
          >
            약관 및 정책 보기
          </button>
        </div>
      )}

    </div>
  );


  const startTextEditing = () => {
    if (isBgEditMode) return;
    if (isPlaceholderText) {
      setT(s => ({ ...s, content: '' }));
      if (textRef.current) textRef.current.innerText = '';
    }
    setIsEditing(true);
    requestAnimationFrame(() => {
      textRef.current?.focus();
    });
  };

  const startCardFlow = (track: 'auto' | 'manual' | 'photo') => {
    requireAuth(() => {
      setActiveTrack(track);
      if (track === 'auto') {
        setFlowStep('record');
        return;
      }
      if (track === 'manual') {
        setFlowStep('edit');
        setIsPanelCollapsed(false);
        return;
      }
      setFlowStep('photo-upload');
    }, window.location.pathname, {
      // 말씀카드 만들기는 로그인이 꼭 필요하다. 게스트로 계속할 수 있는 것처럼
      // 보이는 버튼을 두면 눌러도 아무 일이 없어 헷갈린다.
      guestAllowed: false,
      title: '로그인이 필요해요',
      description: '말씀카드를 만들고 저장하려면 먼저 로그인해주세요.',
    });
  };

  // 캔버스 참조
  const canvasRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX:number; startY:number; sx:number; sy:number; sw:number; sh:number; mode:'move'|'resize-tl'|'resize-tr'|'resize-bl'|'resize-br' }>();
  const bgDragRef = useRef<{ startX:number; startY:number; startScale:number; startPosX:number; startPosY:number; pinchStartDistance?:number }>();

  // contentEditable을 비제어 컴포넌트로 관리
  useEffect(() => {
    if (textRef.current && textRef.current.innerText !== t.content) {
      textRef.current.innerText = t.content;
    }
  }, [t.content]);

  // Load editor state if editing existing card
  useEffect(() => {
    const editState = sessionStorage.getItem('edit_card_state');
    const editCardId = sessionStorage.getItem('edit_card_id');
    if (editState) {
      try {
        const state = JSON.parse(editState);
        if (state.meta) {
          setMeta(state.meta);
        }
        if (state.textStyle) {
          setT(state.textStyle);
          // Ensure text content is set in the contentEditable element
          setTimeout(() => {
            if (textRef.current && state.textStyle.content) {
              textRef.current.innerText = state.textStyle.content;
            }
          }, 0);
        }
        // Mark as edit mode but don't clear session storage yet
        if (editCardId) {
          setIsEditMode(true);
        }
        toast.success('카드를 불러왔어요!');
      } catch (error) {
        console.error('Failed to load card state:', error);
        toast.error('카드를 불러오는데 실패했어요');
      }
    }
  }, []);

  // 하단 패널 스와이프 제스처
  const panelSwipeRef = useRef<{ startY: number; didSwipe: boolean }>();

  const handlePanelSwipeStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    panelSwipeRef.current = { startY: clientY, didSwipe: false };
    const doc = (e.currentTarget as HTMLElement).ownerDocument;
    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!panelSwipeRef.current) return;
      const cy = 'touches' in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      const delta = cy - panelSwipeRef.current.startY;
      if (Math.abs(delta) > 40) panelSwipeRef.current.didSwipe = true;
    };
    const onEnd = (ev: MouseEvent | TouchEvent) => {
      doc.removeEventListener('mousemove', onMove);
      doc.removeEventListener('mouseup', onEnd);
      doc.removeEventListener('touchmove', onMove as any);
      doc.removeEventListener('touchend', onEnd);
      if (!panelSwipeRef.current) return;
      const cy = 'changedTouches' in ev ? ev.changedTouches[0].clientY : (ev as MouseEvent).clientY;
      const delta = cy - panelSwipeRef.current.startY;
      if (Math.abs(delta) > 40) {
        if (delta > 0) setIsPanelCollapsed(true);
        else setIsPanelCollapsed(false);
      }
      panelSwipeRef.current = undefined;
    };
    doc.addEventListener('mousemove', onMove);
    doc.addEventListener('mouseup', onEnd);
    doc.addEventListener('touchmove', onMove as any, { passive: false });
    doc.addEventListener('touchend', onEnd);
  };

  /** 드래그: 이동 및 리사이즈 */
  const onDragStart = (e: React.MouseEvent | React.TouchEvent, mode: 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br') => {
    if (!canvasRef.current || isEditing || isBgEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragRef.current = {
      startX: clientX, startY: clientY,
      sx: t.x, sy: t.y, sw: t.w, sh: t.h, mode
    };
    
    const doc = (e.currentTarget as HTMLElement).ownerDocument;
    doc.addEventListener('mousemove', onDragging);
    doc.addEventListener('mouseup', onDragEnd);
    doc.addEventListener('touchmove', onTouchDragging, { passive: false });
    doc.addEventListener('touchend', onDragEnd);
  };
  
  const onDragging = (e: MouseEvent) => {
    if (!canvasRef.current || !dragRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX)/rect.width)*100;
    const dy = ((e.clientY - dragRef.current.startY)/rect.height)*100;
    updateDragPosition(dx, dy);
  };
  
  const onTouchDragging = (e: TouchEvent) => {
    if (!canvasRef.current || !dragRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.touches[0].clientX - dragRef.current.startX)/rect.width)*100;
    const dy = ((e.touches[0].clientY - dragRef.current.startY)/rect.height)*100;
    updateDragPosition(dx, dy);
  };
  
  const updateDragPosition = (dx: number, dy: number) => {
    if (!dragRef.current) return;
    const currentDrag = dragRef.current;
    
    if (currentDrag.mode === 'move') {
      // 이동 모드 - 여유로운 범위 (5~95%)로 자유 이동
      let newX = clamp(currentDrag.sx + dx, 5, 95);
      let newY = clamp(currentDrag.sy + dy, 5, 95);

      // 스냅 로직: 중앙에 가까우면 자동 스냅
      const snapThreshold = 3;
      if (Math.abs(newX - 50) < snapThreshold) newX = 50;
      if (Math.abs(newY - 50) < snapThreshold) newY = 50;
      
      setT(s => ({ ...s, x: newX, y: newY }));
    } else {
      // 리사이즈 모드
      let newW = currentDrag.sw;
      let newH = currentDrag.sh;
      const newX = currentDrag.sx;
      const newY = currentDrag.sy;
      
      if (currentDrag.mode === 'resize-tl') {
        newW = clamp(currentDrag.sw - dx * 2, 30, 95);
        newH = clamp(currentDrag.sh - dy * 2, 20, 80);
      } else if (currentDrag.mode === 'resize-tr') {
        newW = clamp(currentDrag.sw + dx * 2, 30, 95);
        newH = clamp(currentDrag.sh - dy * 2, 20, 80);
      } else if (currentDrag.mode === 'resize-bl') {
        newW = clamp(currentDrag.sw - dx * 2, 30, 95);
        newH = clamp(currentDrag.sh + dy * 2, 20, 80);
      } else if (currentDrag.mode === 'resize-br') {
        newW = clamp(currentDrag.sw + dx * 2, 30, 95);
        newH = clamp(currentDrag.sh + dy * 2, 20, 80);
      }
      
      setT(s => ({ ...s, w: newW, h: newH, x: newX, y: newY }));
    }
  };
  
  const onDragEnd = (e: MouseEvent | TouchEvent) => {
    const doc = e.currentTarget as Document;
    doc.removeEventListener('mousemove', onDragging);
    doc.removeEventListener('mouseup', onDragEnd);
    doc.removeEventListener('touchmove', onTouchDragging);
    doc.removeEventListener('touchend', onDragEnd);
    dragRef.current = undefined;
  };

  /** 배경 이미지 드래그 */
  const onBgDragging = (e: MouseEvent) => {
    if (!canvasRef.current || !bgDragRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - bgDragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - bgDragRef.current.startY) / rect.height) * 100;
    // ref 값을 미리 저장하여 상태 업데이트 중 undefined 방지
    const startPosX = bgDragRef.current.startPosX;
    const startPosY = bgDragRef.current.startPosY;
    setMeta(m => ({
      ...m,
      bgPositionX: clamp(startPosX + dx, 0, 100),
      bgPositionY: clamp(startPosY + dy, 0, 100),
    }));
  };

  const onBgTouchDragging = (e: TouchEvent) => {
    if (!canvasRef.current || !bgDragRef.current) return;
    e.preventDefault();
    
    // Two-finger pinch zoom
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (bgDragRef.current.pinchStartDistance) {
        const scaleChange = (currentDistance / bgDragRef.current.pinchStartDistance) * 100;
        const newScale = clamp(bgDragRef.current.startScale * (scaleChange / 100), 50, 400);
        setMeta(m => ({ ...m, bgScale: newScale }));
      }
      return;
    }
    
    // Single-finger drag
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.touches[0].clientX - bgDragRef.current.startX) / rect.width) * 100;
    const dy = ((e.touches[0].clientY - bgDragRef.current.startY) / rect.height) * 100;
    const startPosX = bgDragRef.current.startPosX;
    const startPosY = bgDragRef.current.startPosY;
    setMeta(m => ({
      ...m,
      bgPositionX: clamp(startPosX + dx, 0, 100),
      bgPositionY: clamp(startPosY + dy, 0, 100),
    }));
  };

  const onBgDragEnd = (e: MouseEvent | TouchEvent) => {
    const doc = e.currentTarget as Document;
    doc.removeEventListener('mousemove', onBgDragging);
    doc.removeEventListener('mouseup', onBgDragEnd);
    doc.removeEventListener('touchmove', onBgTouchDragging);
    doc.removeEventListener('touchend', onBgDragEnd);
    bgDragRef.current = undefined;
  };

  /** 스타일 계산 */
  const textBoxStyle = useMemo<React.CSSProperties>(()=>({
    left: `${t.x}%`,
    top: `${t.y}%`,
    width: `${t.w}%`,
    height: 'auto',
    maxWidth: '95%',
    transform: 'translate(-50%,-50%)',
    textAlign: t.align,
    letterSpacing: `${t.letterSpacing}px`,
    lineHeight: t.lineHeight,
    color: t.color,
    fontFamily: 
      t.fontFamily === 'Inter' ? 'Inter, system-ui, -apple-system, sans-serif' :
      t.fontFamily === 'SerifKR' ? `'Noto Serif KR', serif` :
      t.fontFamily === 'NotoSans' ? `'Noto Sans KR', sans-serif` :
      t.fontFamily === 'NanumGothic' ? `'Nanum Gothic', sans-serif` :
      t.fontFamily === 'NanumMyeongjo' ? `'Nanum Myeongjo', serif` :
      t.fontFamily === 'Jua' ? `'Jua', sans-serif` :
      t.fontFamily === 'BlackHanSans' ? `'Black Han Sans', sans-serif` :
      t.fontFamily === 'DoHyeon' ? `'Do Hyeon', sans-serif` :
      t.fontFamily === 'NanumPen' ? `'Nanum Pen Script', cursive` :
      t.fontFamily === 'Sunflower' ? `'Sunflower', sans-serif` :
      t.fontFamily === 'GothicA1' ? `'Gothic A1', sans-serif` :
      t.fontFamily === 'GamjaFlower' ? `'Gamja Flower', cursive` :
      t.fontFamily === 'GowunDodum' ? `'Gowun Dodum', sans-serif` :
      t.fontFamily === 'GowunBatang' ? `'Gowun Batang', serif` :
      t.fontFamily === 'NanumBrush' ? `'Nanum Brush Script', cursive` :
      t.fontFamily === 'HiMelody' ? `'Hi Melody', cursive` :
      t.fontFamily === 'Gaegu' ? `'Gaegu', cursive` :
      t.fontFamily === 'Dongle' ? `'Dongle', sans-serif` :
      t.fontFamily === 'SongMyung' ? `'Song Myung', serif` :
      t.fontFamily === 'Hahmlet' ? `'Hahmlet', serif` :
      t.fontFamily === 'Playfair' ? `'Playfair Display', serif` :
      t.fontFamily === 'Montserrat' ? `'Montserrat', sans-serif` :
      t.fontFamily === 'Roboto' ? `'Roboto', sans-serif` :
      t.fontFamily === 'KBLJump' ? `'KBLJump', sans-serif` :
      t.fontFamily === 'GangwonTunTun' ? `'GangwonTunTun', sans-serif` :
      t.fontFamily === 'PaperBlack' ? `'PaperBlack', sans-serif` :
      t.fontFamily === 'PaperLight' ? `'PaperLight', sans-serif` :
      t.fontFamily === 'Taenada' ? `'Taenada', sans-serif` :
      t.fontFamily === 'RidiBatang' ? `'RidiBatang', serif` :
      t.fontFamily === 'SeoulHangang' ? `'SeoulHangang', sans-serif` :
      t.fontFamily === 'Hyunok' ? `'Hyunok', sans-serif` :
      t.fontFamily === 'Kkubullim' ? `'Kkubullim', sans-serif` :
      t.fontFamily === 'GangwonModoo' ? `'GangwonModoo', sans-serif` :
      t.fontFamily === 'Keris' ? `'Keris', sans-serif` :
      t.fontFamily === 'JeonnamBarun' ? `'JeonnamBarun', sans-serif` :
      t.fontFamily === 'Incheon' ? `'Incheon', sans-serif` :
      t.fontFamily === 'Limelight' ? `'Limelight', cursive` :
      t.fontFamily === 'CaveatBrush' ? `'Caveat Brush', cursive` :
      t.fontFamily === 'Cafe24SuperMagic' ? `'Cafe24SuperMagic', sans-serif` :
      `'Lora', serif`,
    fontSize: t.fontSize,
    fontWeight: t.bold ? 700 : 400,
    fontStyle: t.italic ? 'italic' : 'normal',
    textDecoration: t.underline ? 'underline' : 'none',
    textShadow: t.shadow.enabled ? `${t.shadow.x}px ${t.shadow.y}px ${t.shadow.blur}px ${t.shadow.color}` : 'none',
    WebkitTextStroke: t.stroke.enabled ? `${t.stroke.width}px ${t.stroke.color}` : undefined,
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  }),[t]);

  const boxBg = useMemo(()=> t.box.enabled ? `${t.box.color}${Math.round(t.box.opacity/100*255).toString(16).padStart(2,'0')}` : 'transparent',[t]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMeta(m => ({ ...m, bgImageUrl: ev.target?.result as string }));
        
        // 이미지 업로드 시 기본 텍스트 지우기
        if (t.content === '텍스트를 입력하세요.') {
          setT(s => ({ ...s, content: '' }));
          if (textRef.current) {
            textRef.current.innerText = '';
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };


  const fetchRecordsForSelector = useCallback(async () => {
    try {
      // 병합: localStorage 우선 (최신일 가능성 높음)
      const recordMap = new Map();

      // localStorage로 덮어쓰기 (최신 데이터 우선)
      getLocalRecordsForSelector().forEach(record => {
        recordMap.set(record.id, {
          ...record,
          // localStorage 데이터 필드명 통일
          created_at: record.createdAt || record.created_at,
          title: record.title,
          content: record.content,
          items: record.items
        });
      });

      // 전체 기록을 정렬하고, 선택 창에서 카테고리·검색 적용 후 더 보기 처리
      const allRecords = Array.from(recordMap.values())
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.createdAt || a.date).getTime();
          const dateB = new Date(b.created_at || b.createdAt || b.date).getTime();
          return dateB - dateA;
        });

      // 상태 업데이트
      setAvailableRecords(allRecords);
    } catch (error) {
      console.error('❌ Error fetching records:', error);
      toast.error('기록을 불러오는데 실패했습니다.');
    }
  }, []); // 빈 배열: 컴포넌트 생명주기 동안 함수 참조 유지

  const openRecordSelector = async (target: typeof recordPickerTarget = 'auto') => {
    setRecordPickerTarget(target);
    await fetchRecordsForSelector();
    setRecordSelectorOpen(true);
  };

  const continueWithText = (phrase: string) => {
    setVerseInput(phrase);
    setT(s => ({ ...s, content: phrase }));
    if (activeTrack === 'manual') {
      setFlowStep('edit');
      setIsPanelCollapsed(false);
    } else {
      if (!selectedTemplateId || selectedTemplateId === 'T13') setSelectedTemplateId('T01');
      setFlowStep('auto-template');
    }
  };

  const useSelectedRecordText = (_record: unknown, selectedText: string) => {
    const phrase = selectedText.trim();
    if (!phrase) return;
    setRecordSelectorOpen(false);
    if (recordPickerTarget === 'photo') {
      setPhotoText(phrase);
    } else if (recordPickerTarget === 'manual-bg') {
      setBgPrompt(phrase);
      setExpandedPrompt('');
      toast.success('배경 참고 내용을 가져왔어요. 카드 글씨는 유지됩니다.');
    } else if (recordPickerTarget === 'manual-text') {
      setT(s => ({ ...s, content: phrase }));
      setVerseInput(phrase);
      setIsEditing(false);
      toast.success('카드 문구를 선택한 문구로 바꿨어요.');
    } else {
      continueWithText(phrase);
    }
  };

  const expandPrompt = async (generateAfter = false) => {
    if (isExpandingPrompt || isGenerating) return;

    // 쿨다운 체크
    const now = Date.now();
    const timeSinceLastGenerate = now - lastGenerateTime;
    const COOLDOWN_MS = 10000; // 10초 쿨다운

    if (timeSinceLastGenerate < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - timeSinceLastGenerate) / 1000);
      toast.error('잠시만 기다려주세요', {
        description: `${remainingSeconds}초 후에 다시 시도해주세요.`
      });
      return;
    }

    // 로그인 체크
    if (!user) {
      navigate('/auth?callback=' + encodeURIComponent(window.location.pathname));
      return;
    }

    setLastGenerateTime(now);
    setIsExpandingPrompt(true);
    startGenerationProgress('prompt', 12000);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'expand-prompt', prompt: bgPrompt.trim(), style: selectedStyle }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
        console.error('❌ generate-image API error:', response.status, errorData);

        if (response.status === 429) {
          toast.error('API 요청 한도 초과', {
            description: 'API 요청 한도에 도달했습니다. 1-2분 후에 다시 시도해주세요.',
            duration: 5000,
          });
          return;
        }

        throw new Error(errorData.error || '프롬프트 확장 실패');
      }

      const data = await response.json();
      if (!data.expandedPrompt?.trim()) throw new Error('배경 설명을 만들지 못했어요. 다시 시도해주세요.');
      setExpandedPrompt(data.expandedPrompt);
      if (generateAfter) await generateBackground(data.expandedPrompt);
      else toast.success('배경 설명을 준비했어요. 필요하면 수정하세요.');
    } catch (error) {
      console.error('❌ Expand prompt error:', error);
      toast.error(error instanceof Error ? error.message : '프롬프트 확장에 실패했습니다.');
    } finally {
      setIsExpandingPrompt(false);
      stopGenerationProgress('prompt');
    }
  };

  const generateBackground = async (preparedPrompt?: string) => {
    // 쿨다운 체크
    const now = Date.now();
    const timeSinceLastGenerate = now - lastGenerateTime;
    const COOLDOWN_MS = 10000; // 10초 쿨다운

    if (!preparedPrompt && timeSinceLastGenerate < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - timeSinceLastGenerate) / 1000);
      toast.error('잠시만 기다려주세요', {
        description: `${remainingSeconds}초 후에 다시 시도해주세요.`
      });
      return;
    }

    // 로그인 체크
    if (!user) {
      navigate('/auth?callback=' + encodeURIComponent(window.location.pathname));
      return;
    }

    setLastGenerateTime(now);
    setIsGenerating(true);
    startGenerationProgress('background', 38000);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-image', prompt: preparedPrompt || expandedPrompt, style: selectedStyle, ratio: meta.ratio }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);

        if (response.status === 429) {
          toast.error('API 요청 한도 초과', {
            description: 'API 요청 한도에 도달했습니다. 1-2분 후에 다시 시도해주세요.',
            duration: 5000,
          });
          return;
        }

        throw new Error(errorData.error || '이미지 생성 실패');
      }
      
      const data = await response.json();

      // Auto-crop image to match requested aspect ratio
      let finalImage = data.image;
      if (data.requestedRatio && meta.ratio) {
        try {
          finalImage = await cropImageToRatio(data.image, meta.ratio);
        } catch (error) {
          console.error('Failed to crop image:', error);
          // Use original image if cropping fails
        }
      }

      setMeta(m => ({ ...m, bgImageUrl: finalImage, bgScale: 100 }));
      
      // 배경 생성 시 기본 텍스트 지우기
      if (t.content === '텍스트를 입력하세요.') {
        setT(s => ({ ...s, content: '' }));
        // textRef도 업데이트
        if (textRef.current) {
          textRef.current.innerText = '';
        }
      }
      
      toast.success('배경이 생성되었습니다!');
      setBgOpen(false);
      setExpandedPrompt('');
    } catch (error) {
      console.error('Generate background error:', error);
      toast.error(error instanceof Error ? error.message : '이미지 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
      stopGenerationProgress('background');
    }
  };

  // ── 멀티스텝 플로우 함수들 ──
  const goBack = () => {
    if (isGenerating || isExpandingPrompt || isSaving) {
      toast.info('진행 중인 작업이 끝난 뒤 이동해주세요.');
      return;
    }
    switch (flowStep) {
      case 'record':        setFlowStep('entry'); break;
      case 'photo-upload':  setFlowStep('entry'); setPhotoData(null); setPhotoText(''); break;
      case 'auto-template': setFlowStep('record'); break;
      case 'auto-preview':  setFlowStep('auto-template'); break;
      case 'edit':
        if (activeTrack === 'manual') {
          setFlowStep('entry');
        }
        else setFlowStep('auto-preview');
        break;
      default: navigate('/'); break;
    }
  };

  const renderFlowProgress = (current: FlowStep) => {
    const steps = activeTrack === 'auto'
      ? [
          { id: 'record', label: '내용' },
          { id: 'auto-template', label: '템플릿' },
          { id: 'auto-preview', label: '확인' },
        ]
      : activeTrack === 'photo'
      ? [
          { id: 'photo-upload', label: '사진' },
          { id: 'edit', label: '편집' },
        ]
      : [
          { id: 'edit', label: '배경·글씨 편집' },
        ];

    const currentIndex = Math.max(0, steps.findIndex(step => step.id === current));

    return (
      <div className="px-4 sm:px-5 py-3 bg-white">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {steps.map((step, index) => {
            const active = index <= currentIndex;
            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-1.5">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                    active ? 'bg-[#1F1F1F] text-white' : 'bg-[#EEEDEB] text-[#7E7C78]'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`text-[12px] font-medium ${active ? 'text-[#2E2E2E]' : 'text-[#9E9C98]'}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-px flex-1 ${index < currentIndex ? 'bg-[#1F1F1F]' : 'bg-[#E3E2E0]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // Entry 화면
  const renderEntry = () => (
    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-y-auto">
      <div className="w-full max-w-md mx-auto px-5 pt-10 pb-6">
        <h2 className="text-[26px] font-semibold leading-tight text-[#2E2E2E]">말씀카드 만들기</h2>
        <p className="mt-2 text-[14px] leading-6 text-[#7E7C78]">원하는 방식으로 오늘의 기록을 카드로 남겨보세요.</p>
      </div>

      <div className="w-full max-w-md mx-auto px-5 pb-8 space-y-2.5">
        {renderCardPolicyNotice()}

        <p className="text-[13px] text-[#7E7C78]">두 방식 모두 직접 입력하거나 내 기록을 가져올 수 있어요.</p>

        <button
          onClick={() => startCardFlow('auto')}
          className="relative w-full flex items-center gap-4 p-4 pr-16 border border-[#1F1F1F] bg-[#1F1F1F] text-white rounded-lg text-left transition-colors hover:bg-[#333333]"
        >
          <span className="absolute right-3 top-3 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/16 text-white/86">
            추천
          </span>
          <div className="h-10 w-10 rounded-lg bg-white/12 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">완전 자동</p>
            <p className="mt-1 text-[12px] leading-5 text-white/72">입력한 문구를 분석해 타이포그래피와 배경까지 자동으로 완성합니다.</p>
          </div>
        </button>

        <button
          onClick={() => startCardFlow('manual')}
          className="w-full flex items-center gap-4 p-4 border border-[#E3E2E0] bg-white rounded-lg text-left transition-colors hover:border-[#1F1F1F]"
        >
          <div className="h-10 w-10 rounded-lg bg-[#F3F2F1] flex items-center justify-center shrink-0">
            <Type className="w-5 h-5 text-[#1F1F1F]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#2E2E2E]">직접 편집</p>
            <p className="mt-1 text-[12px] leading-5 text-[#7E7C78]">AI 배경·내 사진·단색 위에 글씨를 자유롭게 더해요. 배경부터 시작해도 좋아요.</p>
          </div>
        </button>

        {showPhotoAiFlow && (
          <button
            onClick={() => startCardFlow('photo')}
            className="w-full flex items-center gap-4 p-4 border border-[#E3E2E0] bg-white rounded-lg text-left transition-colors hover:border-[#1F1F1F]"
          >
            <div className="h-10 w-10 rounded-lg bg-[#F3F2F1] flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 text-[#1F1F1F]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#2E2E2E]">사진으로 시작</p>
              <p className="mt-1 text-[12px] leading-5 text-[#7E7C78]">내 사진을 업로드하고 문구를 더해 카드로 완성합니다.</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );

  // Photo Upload 화면
  const renderPhotoUpload = () => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoData(ev.target?.result as string);
      reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
      if (!photoData || !photoText.trim()) return;
      setIsGeneratingPhoto(true);
      startGenerationProgress('photo', 30000);
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'photo-text', imageBase64: photoData, text: photoText.trim() }),
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data.error || '생성 실패');
        // 결과 이미지를 카드 배경으로 설정하고 저장
        setMeta(m => ({ ...m, bgImageUrl: data.image, bgType: 'image' as any }));
        setFlowStep('edit');
      } catch (err: any) {
        alert(err.message || '이미지 생성에 실패했습니다.');
      } finally {
        setIsGeneratingPhoto(false);
        stopGenerationProgress('photo');
      }
    };

    return (
      <div className="flex-1 min-h-0 flex flex-col px-4 pt-8 pb-8 bg-white gap-5 overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold text-[#1F1F1F] mb-1">사진 + AI 텍스트</h2>
          <p className="text-sm text-[#7A7A7A]">사진을 올리고 원하는 텍스트를 입력하면 AI가 자동으로 생성해요</p>
        </div>

        {/* 사진 업로드 */}
        <label className="block cursor-pointer">
          <div className={`w-full aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden
            ${photoData ? 'border-transparent' : 'border-[#EDEDED] hover:border-[#1F1F1F]/30'}`}>
            {photoData ? (
              <img src={photoData} alt="preview" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#C0C0C0] mb-2" />
                <p className="text-sm text-[#7A7A7A]">사진을 탭해서 업로드</p>
                <p className="text-xs text-[#C0C0C0] mt-1">JPG, PNG, WEBP 지원</p>
              </>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>

        {photoData && (
          <button
            onClick={() => setPhotoData(null)}
            className="text-xs text-[#7A7A7A] underline text-center -mt-2"
          >
            다른 사진 선택
          </button>
        )}

        {/* 텍스트 입력 */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-sm font-semibold text-[#1F1F1F] block">넣고 싶은 문구</label>
            <button
              type="button"
              onClick={() => openRecordSelector('photo')}
              className="text-[12px] font-semibold text-[#4F8A5B] underline underline-offset-2"
            >
              ✨ 내 기록에서 가져오기
            </button>
          </div>
          <textarea
            value={photoText}
            onChange={e => setPhotoText(e.target.value)}
            placeholder={"카드로 남기고 싶은 문구를 입력해주세요\n말씀 · 묵상 · 기도 · 감사 등"}
            className="w-full h-28 px-4 py-3 rounded-xl border border-[#EDEDED] text-[14px] text-[#1F1F1F] resize-none focus:outline-none focus:border-[#1F1F1F]/40"
          />
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={!photoData || !photoText.trim() || isGeneratingPhoto}
          className="w-full min-h-12 py-2 rounded-full bg-[#1F1F1F] text-white font-semibold text-[15px] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {renderGenerationContent('photo', 'AI로 카드 완성하기', 'AI가 카드를 만드는 중...', <Sparkles className="w-4 h-4" />)}
        </button>
      </div>
    );
  };

  // Record 화면

  const renderRecord = () => (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 bg-white gap-4 overflow-y-auto">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-[#2E2E2E]">카드 내용 입력</h2>
        <p className="mt-1 text-[13px] leading-5 text-[#7E7C78]">카드로 남기고 싶은 문구를 입력해주세요.</p>
      </div>
      <button
        type="button"
        onClick={() => openRecordSelector('auto')}
        className="w-full rounded-lg border border-[#D9DDD5] bg-[#F7F8F4] px-4 py-3 text-left text-[13px] font-semibold text-[#4F8A5B] hover:bg-[#F1F4ED]"
      >
        ✨ 내 기록에서 가져오기
      </button>
      <textarea
        value={verseInput}
        onChange={(e) => {
          setVerseInput(e.target.value);
          setT(s => ({ ...s, content: e.target.value }));
          if (textRef.current) textRef.current.innerText = e.target.value;
        }}
        placeholder={"카드로 남기고 싶은 문구를 입력해주세요\n말씀 · 묵상 · 기도 · 감사 등"}
        className="flex-1 min-h-[190px] p-4 border border-[#E3E2E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F1F1F] resize-none text-[15px] leading-7"
      />
      <p className="text-[11px] leading-4 text-[#9B9B9B]">
        입력한 내용은 카드 생성을 위해 AI가 분석합니다. 이름·연락처·주소 등 개인정보는 입력하지 마세요.
      </p>
      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={() => {
            if (!verseInput.trim()) { toast.error('내용을 입력해주세요'); return; }
            continueWithText(verseInput.trim());
          }}
          className="px-4 py-3 bg-[#1F1F1F] text-white rounded-lg font-medium hover:bg-[#333333]"
        >
          {activeTrack === 'manual' ? '이 문구로 편집하기' : '이 문구로 스타일 선택'}
        </button>
      </div>
    </div>
  );

  // Auto Template 선택 화면
  // 설명·배지는 실제 생성 경로에 맞춘다.
  //  T01·T02 = AI 가 글자까지 그린다(aiText) → 오탈자 확인이 필요하고 시간이 걸린다
  //  T03      = 코드 렌더, AI 호출 0 → 바로 나오고 철자가 정확하다
  //  T04      = AI 사진 + 코드 글자 → 사진은 시간이 걸리지만 글자는 정확하다
  // (요청서의 T02 배지 '바로 생성 · 철자 정확' 은 코드와 반대라 고쳤다)
  const TEMPLATE_INFO: {
    id: string; name: string; desc: string; badge: string;
    tone: 'ai' | 'instant'; thumb: string | null;
  }[] = [
    { id: 'T01', name: '귀여운 그림',   desc: 'AI가 귀여운 그림과 손글씨 말씀을 함께 그려요', badge: 'AI 그림 · 오탈자 확인', tone: 'ai',      thumb: null },
    { id: 'T02', name: '강렬한 포스터', desc: '큰 글씨가 꽉 차는 포스터예요',                 badge: 'AI 글씨 · 오탈자 확인', tone: 'ai',      thumb: null },
    { id: 'T03', name: '은은한 색감',   desc: '번진 색 위에 단정한 명조 글씨',                badge: '바로 생성 · 철자 정확', tone: 'instant', thumb: null },
    { id: 'T04', name: '감성 사진',     desc: 'AI 풍경 사진 위에 하얀 글씨',                  badge: 'AI 사진 · 철자 정확',   tone: 'ai',      thumb: null },
  ];

  // 비율 칩에 쓰는 이름과, 비율 모양을 보여 줄 작은 틀의 크기(px)
  const RATIO_INFO: Record<string, { label: string; w: number; h: number }> = {
    '4:5':  { label: '세로 게시물', w: 16, h: 20 },
    '9:16': { label: '휴대폰 배경', w: 13, h: 23 },
    '1:1':  { label: '정사각형',   w: 19, h: 19 },
    '16:9': { label: '가로 화면',   w: 24, h: 14 },
  };

  const renderAutoTemplate = () => {
    const handleGenerate = async () => {
      if (!selectedTemplateId) { toast.error('템플릿을 선택해주세요'); return; }
      if (!user) { navigate('/auth?callback=' + encodeURIComponent(window.location.pathname)); return; }
      // T03 그레인 그라데이션 — AI 호출 없이 코드로 즉시 생성 (토큰 0)
      if (selectedTemplateId === 'T03') {
        setIsGenerating(true);
        startGenerationProgress('auto', 4000);
        try {
          await document.fonts?.ready;
          // 캔버스용 글꼴은 따로 받아와야 한다. 안 그러면 기본 글꼴로 조용히 떨어진다.
          await preloadGrainFonts(verseInput.trim());
          setAutoResult(buildT03Result(verseInput.trim(), meta.ratio));
          setFlowStep('auto-preview');
        } catch (e) {
          console.error('[gen] failed:', e);
          toast.error('생성 실패: ' + (e instanceof Error ? e.message : String(e)));
        } finally {
          setIsGenerating(false);
          stopGenerationProgress('auto');
        }
        return;
      }
      setIsGenerating(true);
      // 새 생성마다 색상 변주를 랜덤하게 시작 (매번 같은 색 방지)
      const startIndex = Math.floor(Math.random() * 100);
      setTemplateIndex(startIndex);
      startGenerationProgress('auto', 45000);
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'auto-complete', verse: verseInput.trim(), templateId: selectedTemplateId, ratio: meta.ratio, templateIndex: startIndex }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: '오류' }));
          if (res.status === 429) { toast.error('API 요청 한도 초과', { description: '잠시 후 다시 시도해주세요.' }); return; }
          throw new Error(err.error || '생성 실패');
        }
        const data = await res.json();
        // 새 생성 → 이전 피사체 기록 초기화 후 현재 피사체 기록
        usedSubjectsRef.current = data?.sceneSubject ? [data.sceneSubject] : [];
        setAutoResult(await buildAdaptiveAutoResult(data));
        setFlowStep('auto-preview');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '카드 생성에 실패했습니다.');
      } finally {
        setIsGenerating(false);
        stopGenerationProgress('auto');
      }
    };

    return (
      <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 bg-white gap-4 overflow-y-auto">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#2E2E2E]">템플릿 선택</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#7E7C78]">분위기에 가까운 스타일을 고르면 AI가 배경과 구도를 만듭니다.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1F1F1F] mb-2">카드 비율</h3>
          <div className="grid grid-cols-4 gap-2">
            {(['4:5', '9:16', '1:1', '16:9'] as Ratio[]).map((ratio) => {
              const { label, w, h } = RATIO_INFO[ratio];
              const on = meta.ratio === ratio;
              return (
                <button
                  key={ratio}
                  disabled={isGenerating}
                  onClick={() => setMeta(m => ({ ...m, ratio }))}
                  className={`flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-colors ${
                    on ? 'border-[#1F1F1F] bg-[#1F1F1F] text-white' : 'border-[#E3E2E0] text-[#4A4A4A] hover:border-[#1F1F1F]/40'
                  }`}
                >
                  {/* 비율 모양을 그대로 보여 주는 작은 틀 */}
                  <span
                    className={`block shrink-0 rounded-[3px] border-[1.5px] ${on ? 'border-white' : 'border-[#9E9C98]'}`}
                    style={{ width: w, height: h }}
                  />
                  <span className="text-[11px] font-semibold leading-tight [word-break:keep-all]">{label}</span>
                  <span className={`text-[10px] leading-none ${on ? 'text-white/60' : 'text-[#B5B3AF]'}`}>{ratio}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1F1F1F] mb-2">어떤 느낌으로 만들까요?</h3>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_INFO.map(({ id, name, desc, badge, tone, thumb }) => {
              const on = selectedTemplateId === id;
              return (
                <button
                  key={id}
                  disabled={isGenerating}
                  onClick={() => setSelectedTemplateId(id)}
                  className={`rounded-2xl border bg-white p-2.5 text-left transition-colors ${
                    on ? 'border-[#1F1F1F] ring-1 ring-[#1F1F1F]' : 'border-[#E3E2E0] hover:border-[#1F1F1F]/40'
                  }`}
                >
                  {/* 고른 비율 그대로의 완성 카드가 들어갈 자리.
                      샘플 이미지는 아직 없다 — 사용자가 나중에 준다.
                      성경 본문을 샘플로 내장하지 않는다(CLAUDE.md 11장). */}
                  <div
                    className="relative w-full overflow-hidden rounded-xl bg-[#F3F2F1]"
                    style={{ aspectRatio: meta.ratio.replace(':', ' / ') }}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] text-[#B5B3AF]">
                        미리보기 준비 중
                      </span>
                    )}
                    {on && (
                      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#1F1F1F] text-[12px] text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  {/* 이름·배지는 한 줄 고정, 설명만 어절 단위로 접는다 */}
                  <p className="mt-2.5 truncate text-[15px] font-semibold text-[#1F1F1F]">{name}</p>
                  {/* 설명이 한 줄인 카드와 두 줄인 카드가 섞여 배지 높이가 어긋났다. 두 줄 자리를 비워 둔다. */}
                  <p className="mt-1 min-h-[35px] text-[12px] leading-[1.45] text-[#7E7C78] [word-break:keep-all]">{desc}</p>
                  <span
                    className={`mt-2 inline-block max-w-full truncate rounded-full px-2 py-1 text-[11px] font-medium ${
                      tone === 'ai' ? 'bg-[#FDF3E3] text-[#9A6A1E]' : 'bg-[#EAF4EE] text-[#2F6B4A]'
                    }`}
                  >
                    {badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedTemplateId}
          className="px-4 py-3 min-h-12 bg-[#1F1F1F] text-white rounded-lg font-medium hover:bg-[#333333] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {renderGenerationContent('auto', 'AI로 카드 만들기', 'AI가 카드를 만드는 중...')}
        </button>
      </div>
    );
  };

  // Auto Preview 화면
  const PREVIEW_FONT: Record<string, string> = {
    'Inter': "'Inter', system-ui, -apple-system, sans-serif",
    'SerifKR': "'Noto Serif KR', serif",
    'NotoSans': "'Noto Sans KR', sans-serif",
    'NanumGothic': "'Nanum Gothic', sans-serif",
    'NanumMyeongjo': "'Nanum Myeongjo', serif",
    'GowunDodum': "'Gowun Dodum', sans-serif",
    'GowunBatang': "'Gowun Batang', serif",
    'SongMyung': "'Song Myung', serif",
    'Hahmlet': "'Hahmlet', serif",
    'KBLJump': "'KBLJump', sans-serif",
    'GangwonTunTun': "'GangwonTunTun', sans-serif",
    'PaperBlack': "'PaperBlack', sans-serif",
    'PaperLight': "'PaperLight', sans-serif",
    'Taenada': "'Taenada', sans-serif",
    'RidiBatang': "'RidiBatang', serif",
    'SeoulHangang': "'SeoulHangang', sans-serif",
    'Hyunok': "'Hyunok', sans-serif",
    'Kkubullim': "'Kkubullim', sans-serif",
    'GangwonModoo': "'GangwonModoo', sans-serif",
    'Keris': "'Keris', sans-serif",
    'JeonnamBarun': "'JeonnamBarun', sans-serif",
    'Incheon': "'Incheon', sans-serif",
    'Gaegu': "'Gaegu', cursive",
    'GamjaFlower': "'Gamja Flower', cursive",
    'HiMelody': "'Hi Melody', cursive",
    'NanumPen': "'Nanum Pen Script', cursive",
    'Dongle': "'Dongle', sans-serif",
    'PoorStory': "'Poor Story', cursive",
    'YeonSung': "'Yeon Sung', cursive",
    'KirangHaerang': "'Kirang Haerang', cursive",
    'SingleDay': "'Single Day', cursive",
    'Limelight': "'Limelight', cursive",
    'CaveatBrush': "'Caveat Brush', cursive",
    'Cafe24SuperMagic': "'Cafe24SuperMagic', sans-serif",
  };

  const AUTO_TYPOGRAPHY: Record<string, AutoTypography> = {
    T01: {
      color: '#355F7A',
      secondaryColor: 'rgba(53,95,122,0.76)',
      referenceColor: 'rgba(53,95,122,0.56)',
      shadow: '0 1px 0 rgba(255,255,255,0.8)',
      editShadow: { x: 0, y: 1, blur: 0, color: 'rgba(255,255,255,.8)' },
      mainSize: 'clamp(1.1rem, 3.9vw, 1.9rem)',
      subSize: 'clamp(0.72rem, 2vw, 0.9rem)',
      refSize: 'clamp(0.62rem, 1.6vw, 0.76rem)',
      lineHeight: 1.28,
      editFontSize: 16,
      weight: 600,
      bold: false,
    },
    T03: {
      color: '#F1E45E',
      secondaryColor: 'rgba(241,228,94,0.9)',
      referenceColor: 'rgba(241,228,94,0.74)',
      shadow: '0 2px 10px rgba(12,18,16,0.28)',
      editShadow: { x: 0, y: 2, blur: 10, color: 'rgba(12,18,16,.28)' },
      mainSize: 'clamp(1.05rem, 3.6vw, 1.82rem)',
      subSize: 'clamp(0.68rem, 1.9vw, 0.9rem)',
      refSize: 'clamp(0.58rem, 1.55vw, 0.74rem)',
      lineHeight: 1.16,
      editFontSize: 14,
      weight: 500,
      bold: false,
    },
    T02: {
      color: '#F2E8D8',
      secondaryColor: 'rgba(242,232,216,0.86)',
      referenceColor: 'rgba(242,232,216,0.7)',
      shadow: '0 2px 8px rgba(20,16,12,0.35)',
      editShadow: { x: 0, y: 2, blur: 8, color: 'rgba(20,16,12,.35)' },
      mainSize: 'clamp(1.55rem, 5.3vw, 2.55rem)',
      subSize: 'clamp(0.8rem, 2.2vw, 0.96rem)',
      refSize: 'clamp(0.7rem, 1.9vw, 0.84rem)',
      lineHeight: 1.15,
      editFontSize: 18,
      weight: 700,
      bold: true,
    },
    T04: {
      color: '#3D3328',
      secondaryColor: 'rgba(61,51,40,0.58)',
      referenceColor: 'rgba(61,51,40,0.44)',
      shadow: 'none',
      editShadow: { x: 0, y: 0, blur: 0, color: 'rgba(0,0,0,0)' },
      mainSize: 'clamp(1.2rem, 4.2vw, 1.92rem)',
      subSize: 'clamp(0.78rem, 2vw, 0.9rem)',
      refSize: 'clamp(0.68rem, 1.8vw, 0.8rem)',
      lineHeight: 1.3,
      editFontSize: 14,
      weight: 400,
      bold: false,
    },
  };

  const getAutoTypography = (template: string) => AUTO_TYPOGRAPHY[template] || AUTO_TYPOGRAPHY.T03;

  const analyzeBackgroundForTypography = (imageSrc: string, base: AutoTypography, template?: string): Promise<AutoTypography> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = 80;
        const height = 80;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(base);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const sampleX = 16;
        const sampleY = 18;
        const sampleW = 48;
        const sampleH = 44;
        const pixels = ctx.getImageData(sampleX, sampleY, sampleW, sampleH).data;
        const luminance: number[] = [];
        let warm = 0;
        let cool = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          luminance.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
          warm += Math.max(0, r - b);
          cool += Math.max(0, b - r);
        }

        const avg = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
        const variance = luminance.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / luminance.length;
        const contrast = Math.sqrt(variance);
        const isBright = avg >= 158;
        const isDark = avg <= 98;
        const isComplex = contrast >= 42;
        const isWarm = warm > cool * 1.15;

        // T03(감성 세리프)는 레퍼런스처럼 어두운 배경엔 버터옐로, 밝은 배경엔 깊은 올리브 잉크를 사용
        const isSerifPoster = template === 'T03';
        const isSimplePhoto = template === 'T04';
        const isChunky = template === 'T02';
        const isCuteCard = template === 'T01';
        const darkInk = isSerifPoster ? '#202817' : (isWarm ? '#332A22' : '#24272B');
        const lightInk = isSerifPoster ? '#F4E66A' : (isWarm ? '#FFF8EA' : '#F8FBFF');
        const useDarkInk = isSerifPoster ? avg >= 145 : (isBright && !isDark);
        const color = useDarkInk ? darkInk : lightInk;
        const secondaryColor = useDarkInk
          ? hexToRgba(color, isSerifPoster ? 0.86 : 0.72)
          : hexToRgba(color, isSerifPoster ? 0.92 : 0.84);
        const referenceColor = useDarkInk
          ? hexToRgba(color, isSerifPoster ? 0.68 : 0.52)
          : hexToRgba(color, isSerifPoster ? 0.78 : 0.66);
        const shadowColor = isBright && !isDark
          ? 'rgba(255,255,255,0.72)'
          : 'rgba(18,14,10,0.52)';
        const shadow = isSerifPoster
          ? (useDarkInk ? '0 1px 4px rgba(255,255,255,0.78)' : '0 2px 12px rgba(0,0,0,0.34)')
          : isComplex
          ? (isBright && !isDark ? '0 2px 10px rgba(255,255,255,0.85)' : '0 3px 16px rgba(0,0,0,0.62)')
          : (isBright && !isDark ? '0 1px 2px rgba(255,255,255,0.7)' : '0 2px 10px rgba(0,0,0,0.42)');

        resolve({
          ...base,
          color,
          secondaryColor,
          referenceColor,
          shadow,
          editShadow: {
            x: 0,
            y: isSerifPoster ? 2 : (isComplex ? 3 : 2),
            blur: isSerifPoster ? 10 : (isComplex ? 16 : 10),
            color: isSerifPoster
              ? (useDarkInk ? 'rgba(255,255,255,.78)' : 'rgba(0,0,0,.34)')
              : shadowColor,
          },
          box: (isSerifPoster || isSimplePhoto || isChunky || isCuteCard)
            ? undefined
            : isComplex
            ? {
                enabled: true,
                color: isBright && !isDark ? '#FFFFFF' : '#000000',
                opacity: isBright && !isDark ? 28 : 32,
                padding: 18,
                radius: 14,
              }
            : undefined,
        });
      };
      img.onerror = () => resolve(base);
      img.src = imageSrc;
    });
  };

  // T04 감성 심플: 절(clause) 단위를 원자로 보고 폭에 맞게 묶어 최소 줄수로 재배치.
  // (절 중간은 절대 자르지 않음) — 자동 생성과 제자리 문구 수정에서 공용.
  // respectBreaks=true면 입력 줄바꿈을 하드 줄로 존중(병합 안 함, 너무 넓을 때만 하위 분할).
  // false(자동 생성)면 절을 폭에 맞게 묶어 최소 줄수로 재배치.
  const wrapSimpleBodyLines = (clauses: string[], primaryKey: string, ratio: string, respectBreaks = false): string[] => {
    const cleaned = clauses.map((c) => String(c).trim()).filter(Boolean);
    if (!cleaned.length) return [];
    const dimMap: Record<string, number> = { '9:16': 900, '16:9': 1600, '1:1': 1200, '4:3': 1200, '4:5': 1000, '3:4': 900, '2:3': 900 };
    const refWidth = dimMap[ratio] || 1000;
    const fontPx = Math.max(20, refWidth * 0.033);
    const maxW = refWidth * 0.86;
    const fam = PREVIEW_FONT[primaryKey] || 'serif';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return cleaned;
    ctx.font = `400 ${fontPx}px ${fam}`;
    // 1) 줄 구성: 존중 모드면 각 입력 줄이 하드 줄(병합 없음), 아니면 폭에 맞게 묶기
    let packed: string[];
    if (respectBreaks) {
      packed = cleaned;
    } else {
      packed = [];
      let cur = '';
      for (const c of cleaned) {
        const t = cur ? `${cur} ${c}` : c;
        if (ctx.measureText(t).width > maxW && cur) { packed.push(cur); cur = c; }
        else cur = t;
      }
      if (cur) packed.push(cur);
    }
    // 2) 혼자서도 폭을 넘는 긴 줄만 어절 단위로 마지막 분할
    const finalLines: string[] = [];
    for (const line of packed) {
      if (ctx.measureText(line).width > maxW) {
        const words = line.split(' ');
        let w = '';
        for (const word of words) {
          const t = w ? `${w} ${word}` : word;
          if (ctx.measureText(t).width > maxW && w) { finalLines.push(w); w = word; }
          else w = t;
        }
        if (w) finalLines.push(w);
      } else finalLines.push(line);
    }
    return finalLines;
  };

  /**
   * T04 감성 심플: 미리보기와 저장본이 같은 줄·같은 크기로 보이게 하는 글씨 배율.
   * 줄을 다시 나누지 않고(그러면 화면 폭마다 줄 수가 달라진다) 글씨만 줄인다.
   * 화면 크기와 무관한 비율이라 작은 미리보기·큰 미리보기·저장본이 모두 같아진다.
   */
  const simpleFontScale = (lines: string[], primaryKey: string, ratio: string): number => {
    if (!lines.length) return 1;
    const dimMap: Record<string, number> = { '9:16': 900, '16:9': 1600, '1:1': 1200, '4:3': 1200, '4:5': 1000, '3:4': 900, '2:3': 900 };
    const refWidth = dimMap[ratio] || 1000;
    const fontPx = Math.max(20, refWidth * 0.033);
    const maxW = refWidth * 0.86;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 1;
    ctx.font = `400 ${fontPx}px ${PREVIEW_FONT[primaryKey] || 'serif'}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxW) return 1;
    return Math.max(0.62, maxW / widest);   // 너무 작아지지는 않게
  };

  // 원문에서 본문/말씀주소 분리 (위치·버전명 무관, 줄바꿈 존중)
  const parseBodyRef = (raw: string) => {
    const { body, reference } = extractReference(raw);
    return { bodyText: body, reference };
  };

  // 제너러티브 카드 결과 생성 (AI 호출 없음). template/스펙픽커만 다르게 공용.
  const buildGenResult = (
    raw: string,
    ratio: Ratio,
    template: string,
    pick: (text: string, seed?: number) => GenerativeSpec,
    seedOverride?: number,
    emphasis?: EmphasisChoice,
  ): any => {
    const { bodyText, reference } = parseBodyRef(raw);
    const base = pick(bodyText, seedOverride);
    const spec: GenerativeSpec = emphasis === undefined ? base : { ...base, emphasis };
    const image = renderGenerativeCard({ text: bodyText, reference, ratio, spec });
    return {
      image,
      template,
      aiText: true, // 글자를 코드가 이미 구웠으므로 오버레이 없음
      fonts: { primary: 'RidiBatang', secondary: 'RidiBatang' },
      lines: [
        { text: bodyText, scale: 1 },
        ...(reference ? [{ text: reference, scale: 0.5 }] : []),
      ],
      textAlign: 'center' as const,
      useBrush: false,
      textZone: 'center' as const,
      mood: '',
      recommendedTemplates: [],
      ratio,
      genSeed: spec.seed,
      genStyle: spec.style,
      genEmphasis: emphasis,      // 사용자가 고른 강조. 문구를 고쳐도 유지한다
      genBodyText: bodyText,      // 강조 후보 개수를 세는 데 쓴다
      simpleLines: [bodyText],
    };
  };
  const buildT03Result = (raw: string, ratio: Ratio, seedOverride?: number, emphasis?: EmphasisChoice) =>
    buildGenResult(raw, ratio, 'T03', pickGrainSpec, seedOverride, emphasis);

  const buildAdaptiveAutoResult = async (data: any) => {
    const resultRatio = (data?.ratio || meta.ratio || '4:5') as Ratio;
    const template = data?.template || selectedTemplateId || 'T03';

    // OpenAI는 9:16을 지원 안 해 2:3(1024x1536)로 생성됨 → 요청 비율로 중앙 크롭해
    // autoResult.image 자체를 실제 비율(예: 9:16)로 만든다. (미리보기/저장/다운로드/클라우드 모두 일치)
    let image = data?.image;
    if (image) {
      try { image = await cropImageToRatio(image, resultRatio); } catch { image = data.image; }
    }

    const base = getAutoTypography(template);
    const typography = image
      ? await analyzeBackgroundForTypography(image, base, template)
      : base;

    // T04 감성 심플: 절(clause) 단위를 원자로 보고 폭에 맞게 묶어 최소 줄수로 재배치.
    // (절 중간은 절대 자르지 않음 → "믿지 / 않는" 같은 어색한 분리 방지)
    let simpleLines: string[] | undefined;
    let simpleScale = 1;
    if (template === 'T04' && Array.isArray(data?.lines) && data.lines.length) {
      const clauses = data.lines
        .filter((l: any) => !isAutoCaptionLine(l.text, l.scale))
        .map((l: any) => String(l.text));
      // 사용자가 넣은 줄바꿈을 그대로 둔다(respectBreaks). 묶어 버리면 입력과 달라진다.
      simpleLines = wrapSimpleBodyLines(clauses, data.fonts?.primary, resultRatio, true);
      simpleScale = simpleFontScale(simpleLines, data.fonts?.primary, resultRatio);
    }

    return {
      ...data,
      image,
      ratio: resultRatio,
      typography,
      simpleLines,
      simpleScale,
    };
  };

  // 제자리 문구 수정 가능 여부: 오버레이(T04) + 코드 렌더(T03 그레인) — 토큰 없이 수정
  const canEditTextInPlace = !!autoResult && (
    (!autoResult.aiText && autoResult.template === 'T04') ||
    autoResult.template === 'T03'
  );

  const openTextEdit = () => {
    if (!autoResult) return;
    const body = (autoResult.simpleLines && autoResult.simpleLines.length)
      ? autoResult.simpleLines
      : (autoResult.lines || []).filter((l) => !isAutoCaptionLine(l.text, l.scale)).map((l) => l.text);
    const captionLine = (autoResult.lines || []).find((l) => isAutoCaptionLine(l.text, l.scale));
    // 한 칸에 본문 + (있으면) 말씀 주소를 마지막 줄로 합쳐 보여줌
    const full = [...body, ...(captionLine ? [captionLine.text] : [])].join('\n');
    setTextEditDraft(full);
  };

  const applyTextEdit = () => {
    if (!autoResult || textEditDraft === null) return;
    // 말씀 주소는 위치(앞/중간/뒤)·버전명 무관하게 통째로 떼어 맨 뒤로. 본문 줄바꿈은 그대로 존중.
    const { body, reference } = extractReference(textEditDraft);
    const clauses = body.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!clauses.length) return;
    // T03 그레인: 같은 시드로 배경 유지, 글자만 다시 구워 재렌더 (토큰 0)
    if (autoResult.template === 'T03') {
      const raw = reference ? `${clauses.join('\n')}\n${reference}` : clauses.join('\n');
      const build = buildT03Result;
      // 글꼴이 아직 안 받아졌으면 기본 글꼴로 다시 구워진다. 받아온 뒤 한 번 더 그린다.
      // 글이 바뀌면 어절 번호가 어긋난다. 강조한 말이 새 문구에도 그대로 있으면 번호만 옮기고,
      // 사라졌으면 자동 강조로 되돌린다.
      const keepEmphasis = remapEmphasis(
        autoResult.genBodyText || '',
        clauses.join('\n'),
        autoResult.genEmphasis,
      );
      if (autoResult.template === 'T03') {
        preloadGrainFonts(raw).then(() => {
          setAutoResult(buildT03Result(raw, autoResult.ratio || meta.ratio, autoResult.genSeed, keepEmphasis));
        });
      }
      setAutoResult(build(raw, autoResult.ratio || meta.ratio, autoResult.genSeed, keepEmphasis));
      setVerseInput(raw);
      setT(current => ({ ...current, content: raw }));
      setTextEditDraft(null);
      return;
    }
    // T03·T04 오버레이: 엔터친 줄바꿈을 그대로 존중(respectBreaks), 너무 넓은 줄만 하위 분할
    const newBody = wrapSimpleBodyLines(clauses, autoResult.fonts.primary, autoResult.ratio || meta.ratio, true);
    if (!newBody.length) return;
    const newLines = [
      ...newBody.map((t) => ({ text: t, scale: 1 })),
      ...(reference ? [{ text: reference, scale: 0.5 }] : []), // 주소는 작은 캡션
    ];
    setAutoResult({
      ...autoResult,
      lines: newLines,
      simpleLines: newBody,
      simpleScale: simpleFontScale(newBody, autoResult.fonts.primary, autoResult.ratio || meta.ratio),
    });
    const raw = reference ? `${clauses.join('\n')}\n${reference}` : clauses.join('\n');
    setVerseInput(raw);
    setT(current => ({ ...current, content: raw }));
    setTextEditDraft(null);
  };

  const renderAutoPreview = () => {
    if (!autoResult) return null;
    const primaryFont = PREVIEW_FONT[autoResult.fonts.primary] || 'sans-serif';
    const secondaryFont = PREVIEW_FONT[autoResult.fonts.secondary] || 'sans-serif';
    const typography = autoResult.typography || getAutoTypography(autoResult.template);
    const previewRatio = autoResult.ratio || meta.ratio;
    // T04(감성 심플)는 항상 가운데 정렬 — 좌측/하단 변주 없이 정가운데 또는 약간 위쪽만
    const previewAlign: 'left' | 'center' = (autoResult.textAlign === 'left' && autoResult.template !== 'T02' && autoResult.template !== 'T01' && autoResult.template !== 'T04') ? 'left' : 'center';
    const simpleVAnchor = autoResult.template === 'T04' ? (autoResult.textZone === 'upper' ? 40 : 50) : null; // % (세로 중심 위치)
    const previewLines = (autoResult.lines && autoResult.lines.length)
      ? autoResult.lines
      : [{ text: verseInput, scale: 1 }];
    const isSerifPoster = autoResult.template === 'T03';
    const isSimple = autoResult.template === 'T04';
    const isChunky = autoResult.template === 'T02';
    const isCute = autoResult.template === 'T01';
    const isProclamationSerif = isSerifPoster && hasProclamationTone(previewLines.map((line) => line.text).join(' '));
    const serifReferenceLine = (isSerifPoster || isSimple || isChunky || isCute) ? previewLines.find((line) => isAutoCaptionLine(line.text, line.scale)) : undefined;
    const serifContentLinesRaw = (isSerifPoster || isSimple || isChunky || isCute) ? previewLines.filter((line) => !isAutoCaptionLine(line.text, line.scale)) : previewLines;
    // T04: 미리 계산된 절-묶음 줄(simpleLines)로 렌더 (절 중간 안 자름)
    const serifContentLines = (isSimple && autoResult.simpleLines && autoResult.simpleLines.length)
      ? autoResult.simpleLines.map((t) => ({ text: t, scale: 1 }))
      : serifContentLinesRaw;
    const posterCaptionFont = secondaryFont || primaryFont;
    // scale 1.0 기준 폰트 크기 (줄별 scale을 곱해 위계 표현)
    // cqw = 카드 너비의 1%. 화면 크기와 무관하게 카드 대비 항상 같은 비율 → 저장 결과(width*계수)와도 일치.
    const previewBase = isSerifPoster
      ? (isProclamationSerif ? '4.6cqw' : '4.2cqw')
      : isSimple
      ? '3.3cqw'
      : isChunky
      ? '7.2cqw'
      : isCute
      ? '5cqw'
      : '4.6cqw';
    const previewMaxWidth = isSerifPoster ? (isProclamationSerif ? '84%' : '80%') : isSimple ? '92%' : isChunky ? '88%' : isCute ? '86%' : '90%';
    const previewPadding = isSerifPoster ? '5cqw' : '4cqw';
    const previewShift = isProclamationSerif ? 'translateY(-4%)' : undefined;

    const getPreviewDimensions = () => {
      switch (previewRatio) {
        case '9:16': return { width: 900, height: 1600 };
        case '16:9': return { width: 1600, height: 900 };
        case '1:1': return { width: 1200, height: 1200 };
        case '4:3': return { width: 1200, height: 900 };
        case '4:5': return { width: 1000, height: 1250 };
        case '3:4': return { width: 900, height: 1200 };
        case '2:3': return { width: 900, height: 1350 };
        default: return { width: 1000, height: 1250 };
      }
    };

    const wrapPreviewText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
      const chunks = text.includes(' ') ? text.split(' ') : Array.from(text);
      const lines: string[] = [];
      let current = '';
      chunks.forEach((chunk) => {
        const test = text.includes(' ') ? (current ? `${current} ${chunk}` : chunk) : current + chunk;
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = chunk;
        } else {
          current = test;
        }
      });
      if (current) lines.push(current);
      return lines;
    };

    const t03HandwritingPrimary = autoResult.fonts.primary === 'KirangHaerang' || autoResult.fonts.primary === 'HiMelody';
    const t03Composition = getT03Composition(
      isSerifPoster ? serifContentLines : [],
      autoResult.textZone,
      templateIndex,
      autoResult.fonts.primary,
      isProclamationSerif,
    );
    const t03SupportFont = t03HandwritingPrimary ? PREVIEW_FONT.GowunBatang : primaryFont;
    const t03ReferenceFont = t03HandwritingPrimary ? PREVIEW_FONT.GowunBatang : primaryFont;
    const t03MeasureCtx = isSerifPoster && typeof document !== 'undefined'
      ? document.createElement('canvas').getContext('2d')
      : null;
    const t03RenderLines: T03RenderLine[] = [];
    if (isSerifPoster) serifContentLines.forEach((line, sourceIndex) => {
      const presentation = getT03LinePresentation(line.scale, sourceIndex, t03Composition, t03HandwritingPrimary);
      const fontFamily = presentation.isHero
        ? primaryFont
        : presentation.isHandAccent
        ? PREVIEW_FONT.KirangHaerang
        : t03SupportFont;
      let wrapped = [line.text];
      if (t03MeasureCtx) {
        t03MeasureCtx.font = `${presentation.fontWeight} ${presentation.fontSizeCqw * 10}px ${fontFamily}`;
        setCanvasLetterSpacing(t03MeasureCtx, presentation.letterSpacingEm);
        wrapped = wrapPreviewText(t03MeasureCtx, line.text, T03_LAYOUT.maxWidthCqw * 10);
      }
      wrapped.forEach((text) => {
        const renderLine: T03RenderLine = {
          ...presentation,
          text,
          sourceIndex,
          fontFamily,
          gapBeforeCqw: 0,
        };
        renderLine.gapBeforeCqw = getT03LineGap(t03RenderLines[t03RenderLines.length - 1], renderLine);
        t03RenderLines.push(renderLine);
      });
    });
    const t03ReferenceHeightCqw = T03_LAYOUT.referenceFontCqw * T03_LAYOUT.referenceLineHeight
      + (T03_LAYOUT.referencePaddingYCqw + T03_LAYOUT.referenceBorderCqw) * 2;
    const t03RawHeightCqw = T03_LAYOUT.ornamentHeightCqw
      + T03_LAYOUT.ornamentGapCqw
      + t03RenderLines.reduce((sum, line) => sum + line.gapBeforeCqw + line.fontSizeCqw * line.lineHeight, 0)
      + T03_LAYOUT.ruleTopGapCqw
      + T03_LAYOUT.ruleThicknessCqw
      + (serifReferenceLine ? T03_LAYOUT.referenceGapCqw + t03ReferenceHeightCqw : 0);
    const t03Dimensions = getPreviewDimensions();
    const t03MaxHeightCqw = (t03Dimensions.height / t03Dimensions.width) * 82;
    const t03FitScale = Math.min(1, t03MaxHeightCqw / Math.max(1, t03RawHeightCqw));

    const applyPreviewEditState = () => {
      const typography = autoResult.typography || getAutoTypography(autoResult.template);
      setMeta(m => ({ ...m, ratio: previewRatio, bgImageUrl: autoResult.image, bgScale: 100 }));
      setT(s => ({
        ...s,
        content: verseInput,
        fontFamily: autoResult.fonts.primary as any,
        fontSize: typography.editFontSize,
        lineHeight: typography.lineHeight,
        color: typography.color,
        bold: typography.bold,
        shadow: {
          enabled: typography.shadow !== 'none',
          x: typography.editShadow.x,
          y: typography.editShadow.y,
          blur: typography.editShadow.blur,
          color: typography.editShadow.color,
        },
        box: typography.box ? {
          enabled: typography.box.enabled,
          color: typography.box.color,
          opacity: typography.box.opacity,
          padding: typography.box.padding,
          radius: typography.box.radius,
        } : {
          ...s.box,
          enabled: false,
        },
      }));
      if (textRef.current) textRef.current.innerText = verseInput;
    };

    const handleSaveAutoPreview = async () => {
      setIsSaving(true);
      try {
        await document.fonts?.ready;
        const { width, height } = getPreviewDimensions();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
          img.src = autoResult.image;
        });

        const sourceRatio = img.width / img.height;
        const targetRatio = width / height;
        let drawW = width;
        let drawH = height;
        let drawX = 0;
        let drawY = 0;
        if (sourceRatio > targetRatio) {
          drawH = height;
          drawW = height * sourceRatio;
          drawX = (width - drawW) / 2;
        } else {
          drawW = width;
          drawH = width / sourceRatio;
          drawY = (height - drawH) / 2;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // AI가 글자를 이미지에 직접 그린 경우, 폰트 오버레이를 그리지 않음
        if (!autoResult.aiText) {
        const centerX = width / 2;
        const scale = width / 1000;
        const align: 'left' | 'center' = (autoResult.textAlign === 'left' && autoResult.template !== 'T02' && autoResult.template !== 'T01' && autoResult.template !== 'T04') ? 'left' : 'center';
        const layoutLines = (autoResult.lines && autoResult.lines.length)
          ? autoResult.lines
          : [{ text: verseInput, scale: 1 }];
        const isSerifPoster = autoResult.template === 'T03';
        const isSimple = autoResult.template === 'T04';
        const isChunky = autoResult.template === 'T02';
        const isCute = autoResult.template === 'T01';
        const isProclamationSerif = isSerifPoster && hasProclamationTone(layoutLines.map((line) => line.text).join(' '));
        const referenceLine = (isSerifPoster || isSimple || isChunky || isCute) ? layoutLines.find((line) => isAutoCaptionLine(line.text, line.scale)) : undefined;
        const contentLines = (isSerifPoster || isSimple || isChunky || isCute) ? layoutLines.filter((line) => !isAutoCaptionLine(line.text, line.scale)) : layoutLines;
        if (isSerifPoster) {
          const pxPerCqw = width / 100 * t03FitScale;
          const blockHeight = t03RawHeightCqw * pxPerCqw;
          let y = height * (t03Composition.anchorPercent / 100) - blockHeight / 2;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = typography.referenceColor;
          ctx.strokeStyle = typography.referenceColor;
          ctx.shadowColor = 'transparent';
          ctx.globalAlpha = 0.72;

          const ornamentCenterY = y + T03_LAYOUT.ornamentHeightCqw * pxPerCqw * 0.48;
          ctx.lineWidth = Math.max(1, T03_LAYOUT.ruleThicknessCqw * pxPerCqw);
          ctx.beginPath();
          ctx.moveTo(centerX - T03_LAYOUT.ruleWidthCqw * pxPerCqw / 2, ornamentCenterY);
          ctx.lineTo(centerX + T03_LAYOUT.ruleWidthCqw * pxPerCqw / 2, ornamentCenterY);
          ctx.stroke();

          const accentDirection = t03Composition.accentDirection;
          ctx.textBaseline = 'middle';
          ctx.font = `400 ${1.55 * pxPerCqw}px ${t03ReferenceFont}`;
          setCanvasLetterSpacing(ctx, 0);
          ctx.fillText('✦', centerX - 6.15 * accentDirection * pxPerCqw, y + 0.85 * pxPerCqw);
          ctx.font = `400 ${1.2 * pxPerCqw}px ${t03ReferenceFont}`;
          ctx.fillText('✧', centerX + 5.8 * accentDirection * pxPerCqw, y + 0.45 * pxPerCqw);
          ctx.font = `400 ${0.78 * pxPerCqw}px ${t03ReferenceFont}`;
          ctx.fillText('✦', centerX + 7.15 * accentDirection * pxPerCqw, y + 1.75 * pxPerCqw);

          y += (T03_LAYOUT.ornamentHeightCqw + T03_LAYOUT.ornamentGapCqw) * pxPerCqw;
          ctx.globalAlpha = 1;
          ctx.textBaseline = 'top';
          ctx.shadowColor = typography.editShadow.color;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0.2 * pxPerCqw;
          ctx.shadowBlur = 1.0 * pxPerCqw;

          t03RenderLines.forEach((line) => {
            y += line.gapBeforeCqw * pxPerCqw;
            const fontSize = line.fontSizeCqw * pxPerCqw;
            ctx.font = `${line.fontWeight} ${fontSize}px ${line.fontFamily}`;
            setCanvasLetterSpacing(ctx, line.letterSpacingEm);
            ctx.fillStyle = line.isHero ? typography.color : typography.secondaryColor;
            ctx.fillText(line.text, centerX, y);
            y += fontSize * line.lineHeight;
          });

          y += T03_LAYOUT.ruleTopGapCqw * pxPerCqw;
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = typography.referenceColor;
          ctx.globalAlpha = 0.68;
          ctx.lineWidth = Math.max(1, T03_LAYOUT.ruleThicknessCqw * pxPerCqw);
          ctx.beginPath();
          ctx.moveTo(centerX - T03_LAYOUT.ruleWidthCqw * pxPerCqw / 2, y);
          ctx.lineTo(centerX + T03_LAYOUT.ruleWidthCqw * pxPerCqw / 2, y);
          ctx.stroke();
          y += T03_LAYOUT.ruleThicknessCqw * pxPerCqw;

          if (referenceLine) {
            y += T03_LAYOUT.referenceGapCqw * pxPerCqw;
            const referenceFontSize = T03_LAYOUT.referenceFontCqw * pxPerCqw;
            const pillHeight = t03ReferenceHeightCqw * pxPerCqw;
            ctx.font = `500 ${referenceFontSize}px ${t03ReferenceFont}`;
            setCanvasLetterSpacing(ctx, 0.055);
            const textWidth = ctx.measureText(referenceLine.text).width;
            const pillWidth = textWidth
              + (T03_LAYOUT.referencePaddingXCqw + T03_LAYOUT.referenceBorderCqw) * 2 * pxPerCqw;

            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = typography.referenceColor;
            ctx.lineWidth = Math.max(1, T03_LAYOUT.referenceBorderCqw * pxPerCqw);
            ctx.beginPath();
            ctx.roundRect(centerX - pillWidth / 2, y, pillWidth, pillHeight, pillHeight / 2);
            ctx.stroke();

            ctx.fillStyle = typography.referenceColor;
            ctx.textBaseline = 'middle';
            ctx.fillText(referenceLine.text, centerX, y + pillHeight / 2);
          }
          ctx.restore();
        } else {
        const maxTextWidth = width * (isSerifPoster ? (isProclamationSerif ? 0.78 : (align === 'left' ? 0.74 : 0.76)) : isSimple ? 0.9 : isChunky ? 0.86 : isCute ? 0.82 : (align === 'left' ? 0.82 : 0.8));
        // T04 는 미리보기와 같은 배율을 써야 줄바꿈과 크기가 어긋나지 않는다
        const simpleScale = isSimple ? (autoResult.simpleScale ?? 1) : 1;
        const baseFontPx = isSerifPoster ? Math.max(28, width * (isProclamationSerif ? 0.046 : 0.042)) : isSimple ? Math.max(20, width * 0.033) * simpleScale : isChunky ? Math.max(38, width * 0.072) : isCute ? Math.max(30, width * 0.05) : Math.max(28, width * 0.046);
        const lineGap = baseFontPx * (isSerifPoster ? 0.16 : isSimple ? 0.4 : isChunky ? 0.2 : isCute ? 0.3 : 0.16);
        const defaultWeight = typography.bold ? 700 : 500;
        const posterCaptionFont = secondaryFont || primaryFont;

        // 각 줄을 자기 크기(scale)로 줄바꿈 처리해 렌더 라인 생성
        // T04: 미리 계산된 절-묶음 줄을 그대로 사용 (절 중간 안 자름)
        const sourceLines = (isSimple && autoResult.simpleLines && autoResult.simpleLines.length)
          ? autoResult.simpleLines.map((t) => ({ text: t, scale: 1 }))
          : contentLines;
        const renderLines: { text: string; size: number; caption: boolean; prominent: boolean }[] = [];
        sourceLines.forEach((l) => {
          // T04 감성 심플: scale 무시하고 전 줄 동일 크기
          const size = isSimple ? baseFontPx : baseFontPx * (l.scale || 1);
          const caption = false;
          const prominent = !isSimple && (l.scale || 1) >= 1.45;
          const support = isSerifPoster && !caption && !prominent;
          const weight = isSimple ? 400 : isChunky ? 800 : isSerifPoster ? (caption ? 600 : prominent ? 500 : 700) : defaultWeight;
          const font = caption ? posterCaptionFont : (support ? posterCaptionFont : primaryFont);
          const displaySize = isSerifPoster ? (prominent ? size * 1.12 : size * 0.9) : size;
          ctx.font = `${weight} ${displaySize}px ${font}`;
          if (isSimple) {
            renderLines.push({ text: l.text, size: displaySize, caption, prominent });
          } else {
            wrapPreviewText(ctx, l.text, maxTextWidth).forEach((wl) => renderLines.push({ text: wl, size: displaySize, caption, prominent }));
          }
        });

        const lh = (s: number, prominent = false) => s * (isSerifPoster ? (prominent ? 1.0 : 1.12) : isSimple ? 1.4 : isChunky ? 1.16 : Math.min(typography.lineHeight || 1.2, 1.2));
        const totalH = renderLines.reduce((sum, rl, i) => sum + lh(rl.size, rl.prominent) + (i > 0 ? lineGap : 0), 0);
        const maxH = height * 0.82;
        const shrink = totalH > maxH ? maxH / totalH : 1;
        const textX = align === 'left' ? (width - maxTextWidth) / 2 : centerX;

        ctx.textAlign = align;
        ctx.textBaseline = 'top';

        if (!isSerifPoster && typography.box?.enabled) {
          const padding = typography.box.padding * 2.2 * scale;
          const boxW = maxTextWidth + padding * 2;
          const boxH = totalH * shrink + padding * 2;
          ctx.fillStyle = hexToRgba(typography.box.color, typography.box.opacity / 100);
          ctx.beginPath();
          ctx.roundRect(centerX - boxW / 2, (height - totalH * shrink) / 2 - padding, boxW, boxH, typography.box.radius * 2 * scale);
          ctx.fill();
        }

        ctx.shadowColor = typography.editShadow.color;
        ctx.shadowOffsetX = typography.editShadow.x * scale;
        ctx.shadowOffsetY = typography.editShadow.y * scale;
        ctx.shadowBlur = typography.editShadow.blur * scale;

        const blockH = totalH * shrink;
        const zonePad = height * 0.1; // 상/하단 배치 시 가장자리 여백
        // T04(감성 심플): 정가운데(50%) 또는 약간 위쪽(40%)만 — 블록 중심을 앵커에 맞춤
        const simpleAnchorFrac = isSimple ? (autoResult.textZone === 'upper' ? 0.40 : 0.50) : null;
        let y = simpleAnchorFrac !== null
          ? (height * simpleAnchorFrac - blockH / 2)
          : isProclamationSerif
          ? (height * 0.45 - blockH / 2)
          : autoResult.textZone === 'upper'
          ? zonePad
          : autoResult.textZone === 'lower'
          ? (height - blockH - zonePad)
          : (height - blockH) / 2;
        renderLines.forEach((rl, i) => {
          if (i > 0) y += lineGap * shrink;
          const size = rl.size * shrink;
          const support = isSerifPoster && !rl.caption && !rl.prominent;
          const weight = isSimple ? 400 : isChunky ? 800 : isSerifPoster ? (rl.caption ? 600 : rl.prominent ? 500 : 700) : defaultWeight;
          const font = rl.caption ? posterCaptionFont : (support ? posterCaptionFont : primaryFont);
          ctx.font = `${weight} ${size}px ${font}`;
          ctx.fillStyle = (isSimple || isChunky) ? typography.color : rl.caption ? typography.referenceColor : (rl.prominent ? typography.color : typography.secondaryColor);
          ctx.fillText(rl.text, textX, y);
          y += lh(size, rl.prominent);
        });

        if (referenceLine) {
          const refSize = Math.max(16, width * 0.021) * shrink;
          y += baseFontPx * 0.42 * shrink;
          ctx.textAlign = align;
          ctx.textBaseline = 'top';
          ctx.font = `600 ${refSize}px ${posterCaptionFont}`;
          ctx.fillStyle = typography.referenceColor;
          ctx.shadowColor = typography.editShadow.color;
          ctx.shadowOffsetX = typography.editShadow.x * scale;
          ctx.shadowOffsetY = typography.editShadow.y * scale;
          ctx.shadowBlur = typography.editShadow.blur * scale;
          ctx.fillText(referenceLine.text, textX, y);
          // T03: 주소를 얇은 오벌 알약 테두리로 (레퍼런스 디자인 요소)
          if (isSerifPoster) {
            const tw = ctx.measureText(referenceLine.text).width;
            const pcx = align === 'center' ? textX : textX + tw / 2;
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = typography.referenceColor;
            ctx.lineWidth = Math.max(1, width * 0.0013);
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            ctx.ellipse(pcx, y + refSize * 0.42, tw / 2 + width * 0.04, refSize * 1.0, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
        }
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        // 먼저 보관함에 저장하고 완료 창에서 기기 저장·공유를 선택합니다.

        await saveCard({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ratio: previewRatio,
          bg: autoResult.image,
          text: verseInput,
          ref: '',
          tags: [],
          imageDataUrl: dataUrl,
          editorState: {
            meta: {
              ...meta,
              ratio: previewRatio,
              bgImageUrl: autoResult.image,
              bgScale: 100,
            },
            textStyle: {
              ...t,
              content: verseInput,
              fontFamily: autoResult.fonts.primary,
              fontSize: typography.editFontSize,
              lineHeight: typography.lineHeight,
              color: typography.color,
              bold: typography.bold,
              shadow: {
                enabled: typography.shadow !== 'none',
                ...typography.editShadow,
              },
              box: typography.box || { ...t.box, enabled: false },
            },
          },
        });
        setSavedCardData({ imageDataUrl: dataUrl, text: verseInput });
        setSaveSuccessOpen(true);
        toast.success('카드가 저장되었어요!');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '저장에 실패했습니다.');
      } finally {
        setIsSaving(false);
      }
    };

    // ── 요청 4: 어디를 크게 쓸지 사용자가 고른다 ──
    // 배경(팔레트·시드)은 그대로 두고 글 배치만 다시 굽는다. AI 호출 없음.
    const emphasisBody = autoResult?.genBodyText || autoResult?.simpleLines?.[0] || verseInput.trim();
    const emphasisCanPick = autoResult?.template === 'T03' && canEmphasize(emphasisBody);
    const emphasisWordList = emphasisCanPick ? emphasisWords(emphasisBody) : [];

    const applyEmphasis = async (next: EmphasisChoice | undefined) => {
      if (!autoResult || autoResult.template !== 'T03') return;
      const ref = (autoResult.lines || []).find((l) => isAutoCaptionLine(l.text, l.scale))?.text || '';
      const raw = ref ? `${emphasisBody}\n${ref}` : emphasisBody;
      await preloadGrainFonts(raw).catch(() => undefined);
      setAutoResult(buildT03Result(raw, autoResult.ratio || meta.ratio, autoResult.genSeed, next));
    };

    // 첫 탭은 그 단어 하나를 바로 크게 만든다. 이어서 다른 단어를 누르면 그 사이까지 넓힌다.
    // 예전에는 첫 탭이 아무것도 바꾸지 않아 "안 눌렸나" 싶어 다시 누르게 됐고,
    // 그 두 번째 탭이 새 시작점이 돼 버렸다. 그래서 매 탭마다 결과를 보여 준다.
    const openEmphasisPicker = () => {
      setTextEditDraft(null);
      // 사용자가 직접 고른 적이 있을 때만 칠해 보여 준다. 자동 상태에서 자동 후보를
      // 칠하면 카드에는 강조가 안 보이는데 패널만 칠해져 어긋난다.
      const now = autoResult?.genEmphasis;
      const span = now && now !== 'none' ? now : null;
      setEmphasisPick({ from: span ? span.from : null, applied: span });
    };
    /**
     * 탭 한 번에 결과가 바로 보인다. 숨은 단계가 없다.
     *  · 아무것도 없을 때   → 그 단어 하나
     *  · 단어 하나만 있을 때 → 그 단어와 누른 단어 사이 전체
     *  · 이미 범위가 있을 때 → 어디를 누르든 그 단어 하나로 새로 시작
     * 마지막 규칙이 없으면 범위가 한 번 잡힌 뒤로는 계속 옛 시작점에서만 늘어나,
     * 가운데 구간을 고를 수가 없다.
     */
    const tapWord = async (i: number) => {
      if (emphasisBusy) return;                    // 그리는 중에 또 누르면 순서가 엉킨다
      const now = emphasisPick?.applied ?? null;
      // 이미 고른 칸을 다시 누르면 해제한다. 한 어절이든 범위든 같다 —
      // 칠해진 걸 누르는 건 "이거 취소"라는 뜻이지 "여기서 다시 시작"이 아니다.
      if (now && i >= now.from && i <= now.to) {
        setEmphasisPick({ from: null, applied: null });
        setEmphasisBusy(true);
        try { await applyEmphasis('none'); } finally { setEmphasisBusy(false); }
        return;
      }
      const span = !now || now.from !== now.to
        ? { from: i, to: i }
        : { from: Math.min(now.from, i), to: Math.max(now.from, i) };
      setEmphasisPick({ from: span.from, applied: span });
      setEmphasisBusy(true);
      try { await applyEmphasis(span); } finally { setEmphasisBusy(false); }
    };

    const handleRegenerate = async () => {
      setTextEditDraft(null);
      // T03 그레인: 새 시드로 즉시 재생성 (AI 호출 없음, 토큰 0)
      if (autoResult?.template === 'T03') {
        setIsGenerating(true);
        try {
          await document.fonts?.ready;
          await preloadGrainFonts(verseInput.trim());
          const body = autoResult.simpleLines?.[0] || verseInput.trim();
          const ref = (autoResult.lines || []).find((l) => isAutoCaptionLine(l.text, l.scale))?.text || '';
          const raw = ref ? `${body}\n${ref}` : body;
          const newSeed = Math.floor(Math.random() * 0xffffffff);
          const build = buildT03Result;
          // 다시 생성은 배경만 바꾸는 것이다. 글은 그대로이므로 고른 강조도 그대로 둔다.
          setAutoResult(build(raw, autoResult.ratio || meta.ratio, newSeed, autoResult.genEmphasis));
        } catch {
          toast.error('재생성에 실패했습니다.');
        } finally {
          setIsGenerating(false);
        }
        return;
      }
      setIsGenerating(true);
      const nextIndex = templateIndex + 1;
      setTemplateIndex(nextIndex);
      startGenerationProgress('regenerate', 42000);
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'auto-complete',
            verse: verseInput.trim(),
            ratio: previewRatio,
            templateId: autoResult.template || selectedTemplateId,
            templateIndex: nextIndex,
            // 다양성 규칙: 재생성마다 새로 분석해 다른 아트디렉션 생성
            regenerate: true,
            avoidFontMood: autoResult.fontMood,
            avoidAlign: autoResult.textAlign,
            previousSubjects: usedSubjectsRef.current,
            previousLines: autoResult.lines,
            typographyVersion: autoResult.typographyVersion,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: '오류' }));
          if (res.status === 429) { toast.error('API 요청 한도 초과'); return; }
          throw new Error(err.error || '생성 실패');
        }
        const rdata = await res.json();
        if (rdata?.sceneSubject) usedSubjectsRef.current = [...usedSubjectsRef.current, rdata.sceneSubject].slice(-6);
        setAutoResult(await buildAdaptiveAutoResult(rdata));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '재생성에 실패했습니다.');
      } finally {
        setIsGenerating(false);
        stopGenerationProgress('regenerate');
      }
    };

    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-gray-200 overflow-hidden">
          <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ aspectRatio: ratioToAspect(previewRatio), maxHeight: '100%', maxWidth: '100%' }}>
            <img src={autoResult.image} alt="card" className="w-full h-full object-cover" />
            {!autoResult.aiText && (
            <div
              className="absolute inset-0 flex flex-col p-8"
              style={{
                containerType: 'inline-size', // cqw(카드 너비 기준) 단위가 오버레이 글자에 해석되도록
                justifyContent: simpleVAnchor !== null ? 'center' : (autoResult.textZone === 'upper' ? 'flex-start' : autoResult.textZone === 'lower' ? 'flex-end' : 'center'),
                alignItems: previewAlign === 'left' ? 'flex-start' : 'center',
                padding: previewPadding,
              }}
            >
              <div
                style={{
                  maxWidth: isSerifPoster ? undefined : previewMaxWidth,
                  width: isSerifPoster ? `${T03_LAYOUT.maxWidthCqw}cqw` : undefined,
                  textAlign: isSerifPoster ? 'center' : previewAlign,
                  ...(isSerifPoster ? {
                    position: 'absolute' as const,
                    top: `${t03Composition.anchorPercent}%`,
                    left: '50%',
                  } : simpleVAnchor !== null ? {
                    position: 'absolute' as const,
                    top: `${simpleVAnchor}%`,
                    left: '50%',
                  } : {}),
                  borderRadius: !isSerifPoster && typography.box?.enabled ? typography.box.radius : undefined,
                  padding: !isSerifPoster && typography.box?.enabled ? typography.box.padding : undefined,
                  backgroundColor: !isSerifPoster && typography.box?.enabled ? hexToRgba(typography.box.color, typography.box.opacity / 100) : undefined,
                  backdropFilter: !isSerifPoster && typography.box?.enabled ? 'blur(2px)' : undefined,
                  // T04 앵커 시 가로 정중앙(translateX -50%) + 세로 중심 정렬(translateY -50%)
                  transform: isSerifPoster
                    ? `translate(-50%, -50%) scale(${t03FitScale})`
                    : simpleVAnchor !== null
                    ? 'translate(-50%, -50%)'
                    : previewShift,
                  transformOrigin: isSerifPoster ? 'center' : undefined,
                }}
              >
                {isSerifPoster ? (
                  <>
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: `${T03_LAYOUT.ornamentHeightCqw}cqw`,
                        marginBottom: `${T03_LAYOUT.ornamentGapCqw}cqw`,
                        color: typography.referenceColor,
                        opacity: 0.72,
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        left: '50%',
                        top: '48%',
                        width: `${T03_LAYOUT.ruleWidthCqw}cqw`,
                        height: `${T03_LAYOUT.ruleThicknessCqw}cqw`,
                        backgroundColor: typography.referenceColor,
                        transform: 'translate(-50%, -50%)',
                      }} />
                      <span style={{
                        position: 'absolute',
                        left: `calc(50% + ${-6.15 * t03Composition.accentDirection}cqw)`,
                        top: '0.85cqw',
                        transform: 'translate(-50%, -50%)',
                        fontFamily: t03ReferenceFont,
                        fontSize: '1.55cqw',
                        lineHeight: 1,
                      }}>✦</span>
                      <span style={{
                        position: 'absolute',
                        left: `calc(50% + ${5.8 * t03Composition.accentDirection}cqw)`,
                        top: '0.45cqw',
                        transform: 'translate(-50%, -50%)',
                        fontFamily: t03ReferenceFont,
                        fontSize: '1.2cqw',
                        lineHeight: 1,
                      }}>✧</span>
                      <span style={{
                        position: 'absolute',
                        left: `calc(50% + ${7.15 * t03Composition.accentDirection}cqw)`,
                        top: '1.75cqw',
                        transform: 'translate(-50%, -50%)',
                        fontFamily: t03ReferenceFont,
                        fontSize: '0.78cqw',
                        lineHeight: 1,
                      }}>✦</span>
                    </div>
                    {t03RenderLines.map((line, i) => (
                      <p
                        key={`${line.sourceIndex}-${i}`}
                        style={{
                          fontFamily: line.fontFamily,
                          fontSize: `${line.fontSizeCqw}cqw`,
                          lineHeight: line.lineHeight,
                          color: line.isHero ? typography.color : typography.secondaryColor,
                          textShadow: `0 0.2cqw 1cqw ${typography.editShadow.color}`,
                          fontWeight: line.fontWeight,
                          letterSpacing: `${line.letterSpacingEm}em`,
                          whiteSpace: 'nowrap',
                          margin: `${line.gapBeforeCqw}cqw 0 0`,
                        }}
                      >
                        {line.text}
                      </p>
                    ))}
                    <div
                      aria-hidden="true"
                      style={{
                        width: `${T03_LAYOUT.ruleWidthCqw}cqw`,
                        height: `${T03_LAYOUT.ruleThicknessCqw}cqw`,
                        margin: `${T03_LAYOUT.ruleTopGapCqw}cqw auto 0`,
                        backgroundColor: typography.referenceColor,
                        opacity: 0.68,
                      }}
                    />
                    {serifReferenceLine && (
                      <p
                        style={{
                          width: 'fit-content',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          fontFamily: t03ReferenceFont,
                          fontSize: `${T03_LAYOUT.referenceFontCqw}cqw`,
                          lineHeight: T03_LAYOUT.referenceLineHeight,
                          color: typography.referenceColor,
                          fontWeight: 500,
                          letterSpacing: '0.055em',
                          margin: `${T03_LAYOUT.referenceGapCqw}cqw auto 0`,
                          border: `${T03_LAYOUT.referenceBorderCqw}cqw solid ${typography.referenceColor}`,
                          borderRadius: '999px',
                          padding: `${T03_LAYOUT.referencePaddingYCqw}cqw ${T03_LAYOUT.referencePaddingXCqw}cqw`,
                          opacity: 0.9,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {serifReferenceLine.text}
                      </p>
                    )}
                  </>
                ) : (<>
                {serifContentLines.map((line, i) => {
                  const caption = false;
                  const prominent = line.scale >= 1.45;
                  const support = isSerifPoster && !caption && !prominent;
                  // T02 스트릿: 청키 볼드, 도입부만 살짝 작게(scale), 균일 큰 크기
                  if (isChunky) {
                    return (
                      <p
                        key={i}
                        style={{
                          fontFamily: primaryFont,
                          fontSize: `calc(${previewBase} * ${line.scale})`,
                          lineHeight: 1.16,
                          color: typography.color,
                          textShadow: typography.shadow,
                          fontWeight: 800,
                          wordBreak: 'keep-all',
                          letterSpacing: '-0.01em',
                          margin: 0,
                        }}
                      >
                        {line.text}
                      </p>
                    );
                  }
                  // T04 감성 심플: 강조 없이 전 줄 동일 크기·동일 색·세리프
                  if (isSimple) {
                    return (
                      <p
                        key={i}
                        style={{
                          fontFamily: primaryFont,
                          // 저장본과 같은 배율. 줄은 이미 정해져 있으니 크기만 맞춘다.
                          fontSize: `calc(${previewBase} * ${autoResult.simpleScale ?? 1})`,
                          lineHeight: 1.8,
                          color: typography.color,
                          textShadow: typography.shadow,
                          fontWeight: 400,
                          // CSS 가 줄을 또 나누면 화면 폭마다 줄 수가 달라진다. 정해진 줄 그대로 둔다.
                          whiteSpace: 'pre',
                          letterSpacing: '0.01em',
                          margin: 0,
                        }}
                      >
                        {line.text}
                      </p>
                    );
                  }
                  const lineColor = caption ? typography.referenceColor : (prominent ? typography.color : typography.secondaryColor);
                  return (
                    <p
                      key={i}
                      style={{
                        fontFamily: caption ? posterCaptionFont : (support ? posterCaptionFont : primaryFont),
                        fontSize: `calc(${previewBase} * ${isSerifPoster ? (prominent ? line.scale * 1.12 : line.scale * 0.9) : line.scale})`,
                        lineHeight: isSerifPoster ? (prominent ? 0.98 : 1.12) : (line.scale >= 1.4 ? 1.0 : Math.min(typography.lineHeight, 1.2)),
                        color: lineColor,
                        textShadow: typography.shadow,
                        fontWeight: isSerifPoster ? (caption ? 600 : prominent ? 500 : 700) : typography.weight,
                        wordBreak: 'keep-all',
                        letterSpacing: isSerifPoster ? (caption ? '0.05em' : support ? '0.01em' : 0) : 0,
                        margin: isSerifPoster && prominent ? '0.04rem 0' : 0,
                      }}
                    >
                      {line.text}
                    </p>
                  );
                })}
                {serifReferenceLine && (
                  <p
                    style={{
                      fontFamily: posterCaptionFont,
                      fontSize: '3cqw',
                      lineHeight: 1.1,
                      color: typography.referenceColor,
                      textShadow: typography.shadow,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      margin: '3cqw auto 0',
                      ...(isSerifPoster ? {
                        display: 'inline-block',
                        border: `0.28cqw solid ${typography.referenceColor}`,
                        borderRadius: '999px',
                        padding: '1cqw 4cqw',
                        opacity: 0.85,
                      } : {}),
                    }}
                  >
                    {serifReferenceLine.text}
                  </p>
                )}
                </>)}
              </div>
            </div>
            )}
          </div>
        </div>
        {autoResult.aiText && autoResult.template !== 'T03' && (
          <div className="shrink-0 px-4 pt-2 text-center text-[12px] text-[#B0772E] [word-break:keep-all]">
            AI가 글씨까지 그렸어요. 저장 전에 글자를 한 번 확인해 주세요.
          </div>
        )}
                {autoResult.template === 'T03' && (
          <div className="shrink-0 px-4 pt-2 text-center text-[12px] text-[#3E7C5A] [word-break:keep-all]">
            코드로 그려서 철자가 정확해요. 다시 생성과 문구 수정 모두 바로 반영돼요.
          </div>
        )}
        {emphasisPick !== null ? (
          <div className="shrink-0 px-4 py-3 bg-white border-t">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-[#7E7C78]">
                {emphasisBusy
                  ? '카드를 다시 그리는 중…'
                  : emphasisPick.applied && emphasisPick.applied.from === emphasisPick.applied.to
                  ? '다른 단어를 누르면 거기까지 넓어져요. 다시 누르면 해제돼요.'
                  : emphasisPick.applied
                  ? '고른 단어를 누르면 해제, 밖을 누르면 새로 골라요.'
                  : '크게 쓸 단어를 눌러요.'}
              </p>
            </div>
            <div className={`max-h-48 overflow-y-auto rounded-xl border border-[#E3E2E0] p-2 ${emphasisBusy ? 'opacity-50' : ''}`}>
              <div className="flex flex-wrap gap-1.5">
                {emphasisWordList.map((word, i) => {
                  const applied = emphasisPick.applied;
                  const inSpan = !!applied && i >= applied.from && i <= applied.to;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={emphasisBusy}
                      onClick={() => tapWord(i)}
                      className={`min-h-11 rounded-lg px-2.5 py-2 text-base transition-colors ${
                        inSpan
                          ? 'bg-[#1F1F1F] text-white font-medium'
                          : 'bg-[#F7F6F5] text-[#4A4845] active:bg-[#EDEBE9]'
                      }`}
                    >{word}</button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setEmphasisPick({ from: null, applied: null }); applyEmphasis('none'); }}
                className="px-4 py-2 min-h-11 border border-[#D8D6D2] text-[#1F1F1F] rounded-xl font-medium"
              >강조 없음</button>
              <button
                onClick={() => setEmphasisPick(null)}
                className="px-4 py-2 min-h-11 bg-[#1F1F1F] text-white rounded-xl font-medium"
              >완료</button>
            </div>
          </div>
        ) : textEditDraft !== null ? (
          <div className="shrink-0 px-4 py-3 bg-white border-t">
            <p className="mb-2 text-xs text-[#7E7C78]">배경은 그대로, 문구만 바꿔요. <b>Enter로 줄바꿈</b>하면 그대로 반영돼요. 말씀 주소(예: 시편 119:105)는 자동으로 작게 표시돼요.</p>
            <textarea
              value={textEditDraft}
              onChange={(e) => setTextEditDraft(e.target.value)}
              rows={4}
              autoFocus
              className="w-full p-3 border border-[#D8D6D2] rounded-xl text-sm resize-none focus:outline-none focus:border-[#1F1F1F]"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => setTextEditDraft(null)} className="px-4 py-2 min-h-11 border border-[#D8D6D2] text-[#1F1F1F] rounded-xl font-medium">취소</button>
              <button onClick={applyTextEdit} className="px-4 py-2 min-h-11 bg-[#1F1F1F] text-white rounded-xl font-medium">문구 적용</button>
            </div>
          </div>
        ) : (
        <div className="shrink-0 px-4 py-2 bg-white text-center">
          {/* 셋 다 "이 카드를 고치는" 동작이라 한 묶음으로 보인다 */}
          <div className="flex rounded-xl bg-[#F3F2F1] p-[3px]">
            <button
              disabled={isGenerating || isSaving}
              onClick={() => (canEditTextInPlace ? openTextEdit() : setFlowStep('record'))}
              className="flex-1 rounded-[9px] py-2.5 text-[13px] text-[#4A4845] transition-colors hover:bg-white/70 disabled:opacity-40"
            >문구 수정</button>
            <button
              disabled={isGenerating || isSaving}
              onClick={() => { setTextEditDraft(null); setFlowStep('auto-template'); }}
              className="flex-1 rounded-[9px] py-2.5 text-[13px] text-[#4A4845] transition-colors hover:bg-white/70 disabled:opacity-40"
            >스타일 변경</button>
            {emphasisCanPick && (
              <button
                disabled={isGenerating || isSaving}
                onClick={openEmphasisPicker}
                className="flex-1 rounded-[9px] py-2.5 text-[13px] text-[#4A4845] transition-colors hover:bg-white/70 disabled:opacity-40"
              >강조 고르기</button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-[#7E7C78]">
            {canEditTextInPlace
              ? '문구는 이 배경 그대로 바로 수정돼요. 스타일을 바꾸면 다시 생성해요.'
              : '문구나 스타일을 바꾸면 카드를 다시 생성해야 해요.'}
          </p>
        </div>
        )}
        <div className="shrink-0 grid grid-cols-[1fr,1.35fr] gap-2 p-4 border-t bg-white">
          <button
            onClick={handleRegenerate}
            disabled={isGenerating || isSaving}
            className="flex-1 px-4 py-2 min-h-12 border border-[#1F1F1F] text-[#1F1F1F] rounded-xl font-medium disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {renderGenerationContent('regenerate', '다시 생성', '다시 만드는 중...', undefined, false, true)}
          </button>
          <button
            onClick={handleSaveAutoPreview}
            disabled={isGenerating || isSaving}
            className="px-4 py-2 bg-[#1F1F1F] text-white rounded-xl font-medium disabled:opacity-40"
          >
            {isSaving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    );
  };

  // 로그인 창은 App 의 전역 LoginModal 하나만 띄운다. 여기서 또 렌더하면 두 개가 겹친다.
  const renderLoginModal = () => null;

  const renderSaveSuccessModal = () => (
    <>
      {/* Save Success Modal */}
      {savedCardData && (
        <CardSaveSuccessModal
          open={saveSuccessOpen}
          onClose={() => {
            setSaveSuccessOpen(false);
            setSavedCardData(null);
          }}
          cardData={savedCardData}
          onCreateNew={() => {
            setFlowStep('entry');
            setVerseInput('');
            setAutoResult(null);
            setSelectedTemplateId('');
            setBgOpen(false);
            // Reset canvas to initial state
            setMeta({
              ratio: '9:16',
              safeGuide: true,
              bgColor: '#1F1F1F',
              bgImageUrl: '',
              bgScale: 150,
              bgPositionX: 50,
              bgPositionY: 50,
              bgFilter: 'none',
              bgDarken: 0,
              bgBlur: 0,
            });
            setT({
              content: '텍스트를 입력하세요.',
              fontFamily: 'Inter',
              fontSize: 18,
              lineHeight: 1.35,
              letterSpacing: 0,
              color: '#FFFFFF',
              bold: false,
              italic: false,
              underline: false,
              stroke: { enabled: false, width: 2, color: '#000000' },
              shadow: { enabled: false, x: 0, y: 2, blur: 8, color: 'rgba(0,0,0,.35)' },
              box: { enabled: false, color: '#000000', opacity: 0, padding: 20, radius: 12 },
              align: 'center',
              x: 50,
              y: 50,
              w: 85,
              h: 40,
            });
            setBgPrompt('');
            setExpandedPrompt('');
            setSelectedStyle('');
            sessionStorage.removeItem('edit_card_id');
            sessionStorage.removeItem('edit_card_state');
            setIsEditMode(false);
            toast.success('새 카드를 만들 준비가 되었어요!');
          }}
        />
      )}
    </>
  );

  // 멀티스텝 플로우 - entry, record, auto-style, auto-preview일 때 간단한 구조 표시
  if (flowStep !== 'edit') {
    return (
      <>
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-100">
          <header className="flex-none h-12 bg-white border-b border-[#EDEDED] z-10 flex items-center gap-2 px-4 sm:px-5">
            <button onClick={goBack} className="p-1.5 sm:p-2 -ml-1.5 sm:-ml-2 flex-shrink-0">
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#2E2E2E]" />
            </button>
            <div className="flex-1 flex items-center justify-center">
              <h1 className="text-sm sm:text-base font-medium text-[#2E2E2E]">
                {flowStep === 'entry' ? '말씀카드 만들기' :
                 flowStep === 'record' ? '카드 내용 입력' :
                 flowStep === 'auto-template' ? '템플릿 선택' :
                 flowStep === 'auto-preview' ? '미리보기' :
                 flowStep === 'photo-upload' ? '사진 + AI 텍스트' : ''}
              </h1>
            </div>
            <div className="w-12" />
          </header>
          {flowStep !== 'entry' && renderFlowProgress(flowStep)}
          {flowStep === 'entry' && renderEntry()}
          {flowStep === 'photo-upload' && renderPhotoUpload()}
          {flowStep === 'record' && renderRecord()}
          {flowStep === 'auto-template' && renderAutoTemplate()}
          {flowStep === 'auto-preview' && renderAutoPreview()}
        </div>
        {renderLoginModal()}
        {renderSaveSuccessModal()}
        <RecordSelectorModal
          open={recordSelectorOpen}
          onClose={() => setRecordSelectorOpen(false)}
          records={availableRecords}
          onConfirm={useSelectedRecordText}
          purpose={recordPickerTarget === 'manual-bg' ? 'background' : 'text'}
        />
      </>
    );
  }

  // edit step - 기존의 전체 안정적인 구조
  return (
    <div
      className="flex flex-col overflow-hidden bg-gray-100"
      style={{ position: 'fixed', inset: 0, paddingBottom: keyboardHeight }}
    >
      {/* 1. Fixed Header (Top) */}
      <header className="flex-none h-12 bg-white border-b border-[#EDEDED] z-10 flex items-center gap-2 sm:gap-3 px-4 sm:px-5">
        <button
          onClick={() => {
            if (activeTrack === 'manual') goBack();
            else navigate('/');
          }}
          className="p-1.5 sm:p-2 -ml-1.5 sm:-ml-2 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#2E2E2E]" />
        </button>
        
        <div className="flex-1 flex items-center justify-center gap-2">
          <h1 className="text-sm sm:text-base font-medium text-[#2E2E2E]">
            말씀카드 만들기
          </h1>
          <select
            className="text-xs px-2 py-1 rounded-md bg-white text-[#2E2E2E] border border-[#E8E7E5]"
            value={meta.ratio}
            onChange={(e)=>setMeta(m=>({...m, ratio: e.target.value as Ratio}))}
          >
            <option value="9:16">9:16</option>
            <option value="16:9">16:9</option>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="4:5">4:5</option>
            <option value="3:4">3:4</option>
            <option value="2:3">2:3</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {meta.bgImageUrl && (
            <button
              onClick={() => setIsBgEditMode(!isBgEditMode)}
              className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border-2 text-xs sm:text-sm font-medium transition-colors ${
                isBgEditMode 
                  ? 'border-[#1F1F1F] bg-[#1F1F1F] text-white' 
                  : 'border-[#1F1F1F] bg-white text-[#1F1F1F] hover:bg-[#1F1F1F]/10'
              }`}
            >
              {isBgEditMode ? '완료' : '배경 조정'}
            </button>
          )}
          <button
            onClick={() => openBackgroundSheet('ai')}
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border-2 border-[#1F1F1F] bg-white text-[#1F1F1F] hover:bg-[#1F1F1F]/10 text-xs sm:text-sm font-medium transition-colors"
          >
            배경
          </button>
          <button
            className="h-8 sm:h-9 px-3 sm:px-4 rounded-full bg-[#1F1F1F] hover:bg-[#333333] text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
            onClick={async () => {
              requireAuth(async () => {
                setIsSaving(true);
                try {
                  // Get canvas dimensions based on ratio (optimized for faster save)
                  const getDimensions = () => {
                    switch(meta.ratio) {
                      case '9:16': return { width: 900, height: 1600 };
                      case '16:9': return { width: 1600, height: 900 };
                      case '1:1': return { width: 1200, height: 1200 };
                      case '4:3': return { width: 1200, height: 900 };
                      case '4:5': return { width: 1000, height: 1250 };
                      case '3:4': return { width: 900, height: 1200 };
                      case '2:3': return { width: 900, height: 1350 };
                      default: return { width: 900, height: 1600 };
                    }
                  };
                  
                  const { width, height } = getDimensions();
                  
                  // Create high-resolution canvas
                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  
                  if (!ctx) {
                    throw new Error('Canvas context not available');
                  }
                  
                  // ===== STEP 1: Draw Background Color =====
                  ctx.fillStyle = meta.bgColor;
                  ctx.fillRect(0, 0, width, height);
                  // ===== STEP 2: Draw Background Image =====
                  if (meta.bgImageUrl) {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    
                    await new Promise<void>((resolve, reject) => {
                      const timeout = setTimeout(() => {
                        console.warn('⚠️ Image load timeout');
                        resolve(); // Continue without image
                      }, 5000);
                      
                      img.onload = () => {
                        clearTimeout(timeout);
                        try {
                          // Save context state
                          ctx.save();
                          
                          // Apply filter first
                          if (meta.bgFilter && meta.bgFilter !== 'none') {
                            ctx.filter = meta.bgFilter;
                          }
                          
                          // CSS backgroundSize: X% - 너비를 캔버스 너비의 X%로 설정
                          const imgRatio = img.width / img.height;
                          const scaledWidth = width * (meta.bgScale / 100);
                          const scaledHeight = scaledWidth / imgRatio; // 비율 유지
                          
                          // CSS backgroundPosition: X% Y% - 이미지의 X% 지점을 캔버스의 X% 위치에 정렬
                          const x = (width * meta.bgPositionX / 100) - (scaledWidth * meta.bgPositionX / 100);
                          const y = (height * meta.bgPositionY / 100) - (scaledHeight * meta.bgPositionY / 100);
                          
                          // Draw image at calculated position and size
                          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                          
                          // Reset filter
                          ctx.filter = 'none';
                          
                          // Restore context
                          ctx.restore();
                          
                          // Apply darken overlay (after restore, so it covers entire canvas)
                          if (meta.bgDarken > 0) {
                            ctx.fillStyle = `rgba(0, 0, 0, ${meta.bgDarken / 100})`;
                            ctx.fillRect(0, 0, width, height);
                          }
                          
                        } catch (err) {
                          console.error('Error drawing image:', err);
                        }
                        
                        resolve();
                      };
                      
                      img.onerror = (err) => {
                        clearTimeout(timeout);
                        console.error('❌ Image load failed:', err);
                        resolve(); // Continue without image
                      };
                      
                      img.src = meta.bgImageUrl;
                    });
                  }
                  
                  // ===== STEP 3: Draw Text =====
                  if (t.content && t.content.trim()) {
                    // Calculate text position and size
                    const textX = (width * t.x) / 100;
                    const textY = (height * t.y) / 100;
                    const textMaxWidth = (width * t.w) / 100;
                    
                    // Optimized font size scaling
                    const scaleFactor = width / 900; // Base scale for 900px width
                    const fontSize = t.fontSize * scaleFactor * 2.2; // Optimized multiplier
                    const lineHeight = fontSize * t.lineHeight;
                    
                    // Set font properties
                    const fontFamily = 
                      t.fontFamily === 'Inter' ? 'Inter, sans-serif' :
                      t.fontFamily === 'SerifKR' ? 'Noto Serif KR, serif' :
                      t.fontFamily === 'NotoSans' ? 'Noto Sans KR, sans-serif' :
                      t.fontFamily === 'NanumGothic' ? 'Nanum Gothic, sans-serif' :
                      t.fontFamily === 'NanumMyeongjo' ? 'Nanum Myeongjo, serif' :
                      t.fontFamily === 'Jua' ? 'Jua, sans-serif' :
                      t.fontFamily === 'BlackHanSans' ? 'Black Han Sans, sans-serif' :
                      t.fontFamily === 'DoHyeon' ? 'Do Hyeon, sans-serif' :
                      t.fontFamily === 'NanumPen' ? 'Nanum Pen Script, cursive' :
                      t.fontFamily === 'Sunflower' ? 'Sunflower, sans-serif' :
                      t.fontFamily === 'GothicA1' ? 'Gothic A1, sans-serif' :
                      t.fontFamily === 'GamjaFlower' ? 'Gamja Flower, cursive' :
                      t.fontFamily === 'GowunDodum' ? 'Gowun Dodum, sans-serif' :
                      t.fontFamily === 'GowunBatang' ? 'Gowun Batang, serif' :
                      t.fontFamily === 'NanumBrush' ? 'Nanum Brush Script, cursive' :
                      t.fontFamily === 'HiMelody' ? 'Hi Melody, cursive' :
                      t.fontFamily === 'Gaegu' ? 'Gaegu, cursive' :
                      t.fontFamily === 'Dongle' ? 'Dongle, sans-serif' :
                      t.fontFamily === 'SongMyung' ? 'Song Myung, serif' :
                      t.fontFamily === 'Hahmlet' ? 'Hahmlet, serif' :
                      t.fontFamily === 'Playfair' ? 'Playfair Display, serif' :
                      t.fontFamily === 'Montserrat' ? 'Montserrat, sans-serif' :
                      t.fontFamily === 'Roboto' ? 'Roboto, sans-serif' :
                      t.fontFamily === 'KBLJump' ? 'KBLJump, sans-serif' :
                      t.fontFamily === 'GangwonTunTun' ? 'GangwonTunTun, sans-serif' :
                      t.fontFamily === 'PaperBlack' ? 'PaperBlack, sans-serif' :
                      t.fontFamily === 'PaperLight' ? 'PaperLight, sans-serif' :
                      t.fontFamily === 'Taenada' ? 'Taenada, sans-serif' :
                      t.fontFamily === 'RidiBatang' ? 'RidiBatang, serif' :
                      t.fontFamily === 'SeoulHangang' ? 'SeoulHangang, sans-serif' :
                      t.fontFamily === 'Hyunok' ? 'Hyunok, sans-serif' :
                      t.fontFamily === 'Kkubullim' ? 'Kkubullim, sans-serif' :
                      t.fontFamily === 'GangwonModoo' ? 'GangwonModoo, sans-serif' :
                      t.fontFamily === 'Keris' ? 'Keris, sans-serif' :
                      t.fontFamily === 'JeonnamBarun' ? 'JeonnamBarun, sans-serif' :
                      t.fontFamily === 'Incheon' ? 'Incheon, sans-serif' :
                      t.fontFamily === 'Limelight' ? 'Limelight, cursive' :
                      t.fontFamily === 'CaveatBrush' ? 'Caveat Brush, cursive' :
                      t.fontFamily === 'Cafe24SuperMagic' ? 'Cafe24SuperMagic, sans-serif' :
                      'Lora, serif';
                    
                    const fontWeight = t.bold ? 'bold' : 'normal';
                    const fontStyle = t.italic ? 'italic' : 'normal';
                    
                    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
                    ctx.fillStyle = t.color;
                    ctx.textAlign = t.align;
                    ctx.textBaseline = 'top';
                    
                    // Apply stroke
                    if (t.stroke.enabled) {
                      ctx.strokeStyle = t.stroke.color;
                      ctx.lineWidth = t.stroke.width * scaleFactor * 2;
                    }
                    
                    // Apply shadow
                    if (t.shadow.enabled) {
                      ctx.shadowColor = t.shadow.color;
                      ctx.shadowOffsetX = t.shadow.x * scaleFactor;
                      ctx.shadowOffsetY = t.shadow.y * scaleFactor;
                      ctx.shadowBlur = t.shadow.blur * scaleFactor;
                    }
                    
                    // Advanced text wrapping: Handle newlines AND word wrapping
                    const paragraphs = t.content.split('\n');
                    const allLines: string[] = [];
                    
                    paragraphs.forEach(paragraph => {
                      if (!paragraph.trim()) {
                        // Empty line - preserve it
                        allLines.push('');
                        return;
                      }
                      
                      const words = paragraph.split(' ');
                      let currentLine = '';
                      
                      for (const word of words) {
                        const testLine = currentLine ? `${currentLine} ${word}` : word;
                        const metrics = ctx.measureText(testLine);
                        
                        if (metrics.width > textMaxWidth && currentLine) {
                          allLines.push(currentLine);
                          currentLine = word;
                        } else {
                          currentLine = testLine;
                        }
                      }
                      
                      if (currentLine) {
                        allLines.push(currentLine);
                      }
                    });
                    
                    // Calculate total text block height
                    const totalTextHeight = allLines.length * lineHeight;
                    
                    // Calculate starting Y to center text vertically
                    const startY = textY - (totalTextHeight / 2);
                    
                    // Adjust X based on alignment
                    let drawX = textX;
                    if (t.align === 'left') {
                      drawX = textX - (textMaxWidth / 2);
                    } else if (t.align === 'right') {
                      drawX = textX + (textMaxWidth / 2);
                    }
                    
                    // Draw each line
                    allLines.forEach((line, index) => {
                      const lineY = startY + (index * lineHeight);
                      
                      // Draw stroke first if enabled
                      if (t.stroke.enabled) {
                        ctx.strokeText(line, drawX, lineY);
                      }
                      
                      // Draw fill text
                      ctx.fillText(line, drawX, lineY);
                    });
                    
                  }
                  
                  // ===== STEP 4: Convert to Data URL =====
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                  
                  // Verify not blank
                  if (dataUrl.length < 1000) {
                    throw new Error('Generated image appears to be blank');
                  }
                  
                  // ===== STEP 5: Save to Database =====
                  const editCardId = sessionStorage.getItem('edit_card_id');
                  
                  if (editCardId) {
                    const existingCard = await getCardById(editCardId);
                    if (existingCard) {
                      await saveCard({
                        ...existingCard,
                        imageDataUrl: dataUrl,
                        text: t.content,
                        ratio: meta.ratio,
                        bg: meta.bgImageUrl || meta.bgColor,
                        editorState: {
                          meta: JSON.parse(JSON.stringify(meta)),
                          textStyle: JSON.parse(JSON.stringify(t)),
                        },
                        updatedAt: new Date().toISOString(),
                      });
                    }
                    sessionStorage.removeItem('edit_card_id');
                    sessionStorage.removeItem('edit_card_state');
                    setIsEditMode(false);
                  } else {
                    await saveCard({
                      id: crypto.randomUUID(),
                      createdAt: new Date().toISOString(),
                      ratio: meta.ratio,
                      bg: meta.bgImageUrl || meta.bgColor,
                      text: t.content,
                      ref: '',
                      tags: [],
                      imageDataUrl: dataUrl,
                      editorState: {
                        meta: JSON.parse(JSON.stringify(meta)),
                        textStyle: JSON.parse(JSON.stringify(t)),
                      },
                    });
                  }
                  
                  // ===== STEP 6: Show Success =====
                  setSavedCardData({
                    imageDataUrl: dataUrl,
                    text: t.content,
                  });
                  setSaveSuccessOpen(true);
                  toast.success(isEditMode ? '카드가 업데이트되었어요!' : '카드가 저장되었어요!');
                } catch (error) {
                  console.error('❌ Save Failed:', error);
                  const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
                  toast.error(`저장 실패: ${errorMessage}`);
                } finally {
                  setIsSaving(false);
                }
              });
            }}
          >
            {isSaving ? '저장 중...' : (isEditMode ? '업데이트' : '저장')}
          </button>
        </div>
      </header>

      {activeTrack && (
        <div className="flex-none border-b border-[#EDEDED]">
          {renderFlowProgress(flowStep)}
        </div>
      )}

      {/* 2. Canvas Area (Middle) - FILLS ALL REMAINING SPACE */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center px-4 bg-gray-200 overflow-hidden"
      >
        {/* Card Preview - aspect-ratio with full width and max height */}
        <RatioBox
          ratio={meta.ratio}
          className="shadow-2xl"
          style={(() => {
            const [w, h] = meta.ratio.split(':').map(Number);
            return h > w
              ? { height: '100%', width: 'auto', maxWidth: '100%' }
              : { width: '100%', height: 'auto', maxHeight: '100%' };
          })()}
        >
            <div
              id="card-preview"
              ref={canvasRef}
              className="relative w-full h-full rounded-[28px] shadow-xl overflow-hidden"
              style={{
                background: meta.bgColor,
              }}
            >
                {/* 배경 이미지 레이어 */}
                {meta.bgImageUrl && (
                  <div
                    className={`absolute inset-0 rounded-[28px] overflow-hidden ${isBgEditMode ? 'cursor-move' : ''}`}
                    style={{
                      backgroundImage: `url(${meta.bgImageUrl})`,
                      backgroundPosition: `${meta.bgPositionX}% ${meta.bgPositionY}%`,
                      backgroundSize: `${meta.bgScale}%`,
                      backgroundRepeat: 'no-repeat',
                      filter: meta.bgFilter,
                      transition: isBgEditMode ? 'none' : 'all 0.3s ease',
                    }}
                    onMouseDown={(e) => {
                      if (!isBgEditMode) return;
                      e.preventDefault();
                      e.stopPropagation();
                      bgDragRef.current = {
                        startX: e.clientX,
                        startY: e.clientY,
                        startScale: meta.bgScale,
                        startPosX: meta.bgPositionX,
                        startPosY: meta.bgPositionY,
                      };
                      const doc = e.currentTarget.ownerDocument;
                      doc.addEventListener('mousemove', onBgDragging);
                      doc.addEventListener('mouseup', onBgDragEnd);
                    }}
                    onTouchStart={(e) => {
                      if (!isBgEditMode) return;
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (e.touches.length === 2) {
                        // Two-finger pinch: store initial distance
                        const touch1 = e.touches[0];
                        const touch2 = e.touches[1];
                        const distance = Math.hypot(
                          touch2.clientX - touch1.clientX,
                          touch2.clientY - touch1.clientY
                        );
                        bgDragRef.current = {
                          startX: 0,
                          startY: 0,
                          startScale: meta.bgScale,
                          startPosX: meta.bgPositionX,
                          startPosY: meta.bgPositionY,
                          pinchStartDistance: distance,
                        };
                      } else if (e.touches.length === 1) {
                        // Single-finger drag
                        bgDragRef.current = {
                          startX: e.touches[0].clientX,
                          startY: e.touches[0].clientY,
                          startScale: meta.bgScale,
                          startPosX: meta.bgPositionX,
                          startPosY: meta.bgPositionY,
                        };
                      }
                      
                      const doc = e.currentTarget.ownerDocument;
                      doc.addEventListener('touchmove', onBgTouchDragging, { passive: false });
                      doc.addEventListener('touchend', onBgDragEnd);
                    }}
                    onWheel={(e) => {
                      if (!isBgEditMode) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const delta = e.deltaY > 0 ? -5 : 5;
                      setMeta(m => ({ ...m, bgScale: clamp(m.bgScale + delta, 50, 400) }));
                    }}
                  />
                )}
                
                {/* 배경 어둡게 오버레이 */}
                {meta.bgDarken > 0 && (
                  <div
                    className="absolute inset-0 bg-black pointer-events-none rounded-[28px]"
                    style={{ opacity: meta.bgDarken / 100 }}
                  />
                )}

                {/* 배경 흐리게 (backdrop-filter는 최종 캡처에 적용) */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-[28px]"
                  style={{
                    backdropFilter: meta.bgBlur > 0 ? `blur(${meta.bgBlur}px)` : 'none',
                    WebkitBackdropFilter: meta.bgBlur > 0 ? `blur(${meta.bgBlur}px)` : 'none',
                  }}
                />
                
                {/* 배경 편집 모드 안내 */}
                {isBgEditMode && meta.bgImageUrl && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white text-xs rounded-full z-10">
                    드래그로 이동 • 핀치로 확대/축소
                  </div>
                )}

                {/* 배경 선택 안내 — 첫 진입부터 보인다. 배경을 고르거나 글씨를 넣으면 사라진다 */}
                {showBgPrompt && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center px-6 pointer-events-none">
                    <div className="w-full max-w-[280px] pointer-events-auto">
                      <div className="text-center text-white mb-4 bg-black/45 backdrop-blur-sm rounded-xl px-4 py-3">
                        <p className="text-[17px] font-semibold">배경을 먼저 선택하세요</p>
                        <p className="mt-1 text-[12px] leading-5 text-white/78">AI 생성, 사진 업로드, 단색 배경 중 선택할 수 있습니다.</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => openBackgroundSheet('ai')}
                          className="h-16 rounded-lg bg-white/92 backdrop-blur text-[#1F1F1F] text-[12px] font-semibold flex flex-col items-center justify-center gap-1 shadow-sm"
                        >
                          <Wand2 className="w-4 h-4" />
                          AI
                        </button>
                        <button
                          onClick={() => openBackgroundSheet('photo')}
                          className="h-16 rounded-lg bg-white/92 backdrop-blur text-[#1F1F1F] text-[12px] font-semibold flex flex-col items-center justify-center gap-1 shadow-sm"
                        >
                          <Upload className="w-4 h-4" />
                          사진
                        </button>
                        <button
                          onClick={() => openBackgroundSheet('color')}
                          className="h-16 rounded-lg bg-white/92 backdrop-blur text-[#1F1F1F] text-[12px] font-semibold flex flex-col items-center justify-center gap-1 shadow-sm"
                        >
                          <Palette className="w-4 h-4" />
                          컬러
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 세이프 가이드 - 드래그 중일 때만 표시 */}
                {meta.safeGuide && !isEditing && !!dragRef.current && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-[6%] rounded-[22px] border-2 border-white/35"/>
                    <div className="absolute top-1/2 left-0 right-0 border-t border-white/25"/>
                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-white/25"/>
                  </div>
                )}

                {/* 텍스트 박스 (드래그 이동 및 리사이즈) */}
                <div
                  id="text-container"
                  className="absolute text-box-wrapper"
                  style={{
                    left: textBoxStyle.left,
                    top: textBoxStyle.top,
                    width: textBoxStyle.width,
                    minHeight: '100px',
                    height: 'auto',
                    maxWidth: textBoxStyle.maxWidth,
                    transform: textBoxStyle.transform,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                    boxSizing: 'border-box',
                    pointerEvents: isBgEditMode ? 'none' : 'auto',
                    cursor: isEditing || isTextEmpty ? 'text' : (isBgEditMode ? 'default' : 'grab'),
                  }}
                  onMouseDown={(e) => {
                    if (isBgEditMode || isEditing) return;
                    if (isTextEmpty) {
                      e.preventDefault();
                      e.stopPropagation();
                      startTextEditing();
                      return;
                    }
                    onDragStart(e, 'move');
                  }}
                  onTouchStart={(e) => {
                    if (isBgEditMode || isEditing) return;
                    if (isTextEmpty) {
                      e.preventDefault();
                      e.stopPropagation();
                      startTextEditing();
                      return;
                    }
                    onDragStart(e, 'move');
                  }}
                >
                  {/* 선택 시 Dashed Border — 배경 선택 안내가 떠 있을 땐 안내 문구를 가로질러서 숨긴다 */}
                  {!isEditing && !isBgEditMode && !showBgPrompt && (
                    <div className="ui-control dashed-border absolute inset-0 border-2 border-dashed border-white/60 rounded-lg pointer-events-none" />
                  )}

                  {/* 박스 배경 */}
                  {t.box.enabled && (
                    <div
                      className="absolute inset-0 -z-10"
                      style={{
                        backgroundColor: boxBg,
                        borderRadius: t.box.radius
                      }}
                    />
                  )}

                  {/* 텍스트 더블탭 영역 wrapper */}
                  <div
                    className="relative w-full"
                    onDoubleClick={(e) => {
                      if (!isEditing) {
                        e.stopPropagation();
                        startTextEditing();
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (isEditing) return;
                      const now = Date.now();
                      if (now - lastTapRef.current < 300) {
                        e.preventDefault();
                        startTextEditing();
                      }
                      lastTapRef.current = now;
                    }}
                    style={{ cursor: isEditing || isTextEmpty ? 'text' : 'grab' }}
                  >
                    {/* 실제 텍스트 (contenteditable) */}
                    <div
                      ref={textRef}
                      className="relative outline-none z-10"
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="off"
                      style={{
                        ...textBoxStyle,
                        userSelect: isEditing ? 'text' : 'none',
                        padding: 0,
                        minHeight: 'fit-content',
                        width: '100%',
                        margin: '0 !important',
                        display: 'block',
                        left: 'auto',
                        top: 'auto',
                        transform: 'none',
                        position: 'relative',
                      }}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={(e) => {
                        setIsComposing(false);
                        setT(s => ({ ...s, content: (e.target as HTMLElement).innerText || '' }));
                      }}
                      onInput={(e) => {
                        if (!isComposing) {
                          setT(s => ({ ...s, content: (e.target as HTMLElement).innerText || '' }));
                        }
                      }}
                      onFocus={() => setIsEditing(true)}
                      onBlur={() => setIsEditing(false)}
                    />
                  </div>

                  {/* 빈 상태 힌트 — 배경 선택 안내가 떠 있을 땐 버튼과 겹쳐서 숨긴다 */}
                  {!isEditing && isTextEmpty && !showBgPrompt ? (
                    <div
                      className="ui-control absolute -bottom-7 left-0 right-0 flex items-center justify-center"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startTextEditing();
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startTextEditing();
                      }}
                    >
                      <span className="text-white/60 text-[11px] bg-black/20 px-2 py-0.5 rounded-full">탭하여 텍스트 입력</span>
                    </div>
                  ) : null}

                  {/* 코너 리사이즈 핸들 - 편집/배경편집 모드가 아니고, 배경 선택 안내가 없을 때만 표시 */}
                  {!isEditing && !isBgEditMode && !showBgPrompt && (
                    <>
                      {/* Top-Left */}
                      <div
                        className="ui-control resize-handle absolute -top-1 -left-1 cursor-nwse-resize z-30"
                        style={{ padding: '16px' }}
                        onMouseDown={(e) => onDragStart(e, 'resize-tl')}
                        onTouchStart={(e) => onDragStart(e, 'resize-tl')}
                      >
                        <div className="w-3 h-3 bg-white border-2 border-[#1F1F1F] rounded-full" />
                      </div>
                      {/* Top-Right */}
                      <div
                        className="ui-control resize-handle absolute -top-1 -right-1 cursor-nesw-resize z-30"
                        style={{ padding: '16px' }}
                        onMouseDown={(e) => onDragStart(e, 'resize-tr')}
                        onTouchStart={(e) => onDragStart(e, 'resize-tr')}
                      >
                        <div className="w-3 h-3 bg-white border-2 border-[#1F1F1F] rounded-full" />
                      </div>
                      {/* Bottom-Left */}
                      <div
                        className="ui-control resize-handle absolute -bottom-1 -left-1 cursor-nesw-resize z-30"
                        style={{ padding: '16px' }}
                        onMouseDown={(e) => onDragStart(e, 'resize-bl')}
                        onTouchStart={(e) => onDragStart(e, 'resize-bl')}
                      >
                        <div className="w-3 h-3 bg-white border-2 border-[#1F1F1F] rounded-full" />
                      </div>
                      {/* Bottom-Right */}
                      <div
                        className="ui-control resize-handle absolute -bottom-1 -right-1 cursor-nwse-resize z-30"
                        style={{ padding: '16px' }}
                        onMouseDown={(e) => onDragStart(e, 'resize-br')}
                        onTouchStart={(e) => onDragStart(e, 'resize-br')}
                      >
                        <div className="w-3 h-3 bg-white border-2 border-[#1F1F1F] rounded-full" />
                      </div>
                    </>
                  )}
                </div>
            </div>
          </RatioBox>
      </div>

      {/* ── 하단 편집 패널 ── */}
      <div
        className={`flex-none bg-white/70 backdrop-blur-xl border-t border-white/30 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] flex flex-col transition-all duration-200 overflow-hidden ${
          isPanelCollapsed ? 'h-8' : 'h-[280px]'
        }`}>
          {/* Handlebar */}
          <div
            className="shrink-0 flex items-center justify-center py-2.5 cursor-grab active:cursor-grabbing touch-none"
            onClick={() => {
              if (!panelSwipeRef.current?.didSwipe) setIsPanelCollapsed(prev => !prev);
            }}
            onMouseDown={handlePanelSwipeStart}
            onTouchStart={handlePanelSwipeStart}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {!isPanelCollapsed && (
            <div className="flex-1 min-h-0">
              <Toolbar
                active={activeTab}
                setActive={setActiveTab}
                t={t}
                setT={setT}
                meta={meta}
                setMeta={setMeta}
                onPanelOpen={() => setIsPanelCollapsed(false)}
                onOpenFontPicker={() => setFontPickerOpen(true)}
                onImportRecord={() => openRecordSelector('manual-text')}
              />
            </div>
          )}
        </div>

      {/* Hidden file input */}
      <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* 배경 만들기 전체 화면 모달 with Tabs */}
        {bgOpen && (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col h-[100dvh]">
            {/* Header (outside Tabs) */}
            <header className="shrink-0 flex items-center px-5 py-4 border-b border-[#EDEDED] bg-white z-50">
              <button
                onClick={() => setBgOpen(false)}
                disabled={isGenerating || isExpandingPrompt}
                className="p-2 -ml-2"
              >
                <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
              </button>
              <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
                배경 만들기
              </h1>
            </header>

            {/* Tabs (with TabsList inside) */}
            <Tabs value={bgTab} onValueChange={(v) => { if (!isGenerating && !isExpandingPrompt) setBgTab(v as typeof bgTab); }} className="flex-1 min-h-0 flex flex-col">
              {/* TabsList */}
              <div className="shrink-0 px-5 py-3 bg-white border-b border-[#EDEDED] z-50">
                <TabsList className="w-full grid grid-cols-3 h-10 bg-[#F3F2F1] p-1 rounded-xl">
                  <TabsTrigger 
                    value="ai" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#2E2E2E] text-[13px] font-medium text-[#7E7C78] rounded-lg transition-all"
                  >
                    AI 생성
                  </TabsTrigger>
                  <TabsTrigger 
                    value="photo" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#2E2E2E] text-[13px] font-medium text-[#7E7C78] rounded-lg transition-all"
                  >
                    사진/필터
                  </TabsTrigger>
                  <TabsTrigger 
                    value="color" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#2E2E2E] text-[13px] font-medium text-[#7E7C78] rounded-lg transition-all"
                  >
                    컬러
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: AI 생성 */}
              <TabsContent value="ai" className="flex-1 mt-0 pt-4 pb-40 overflow-y-auto hide-scrollbar">
                {/* Content Area */}
                <div className="px-4 space-y-2.5">
                  {/* 1. 스타일을 선택하세요 */}
                  <section>
                  <h2 className="text-[13px] font-semibold text-[#2E2E2E] mb-1.5">
                    1. 스타일을 선택하세요
                  </h2>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      '맑은 수채화',
                      '따뜻한 동화',
                      '심플 낙서',
                      '감성 사진',
                      '미니멀감성',
                      '빈티지 필름'
                    ].map((style, idx) => (
                      <button
                        key={idx}
                        disabled={isGenerating || isExpandingPrompt}
                        onClick={() => { setSelectedStyle(style); setExpandedPrompt(''); }}
                        className={`px-3 py-2 rounded-lg border text-[#2E2E2E] text-[13px] font-medium transition-colors text-left ${
                          selectedStyle === style
                            ? 'border-[#1F1F1F] bg-[#1F1F1F]/10'
                            : 'border-[#E8E7E5] bg-white hover:border-[#1F1F1F] hover:bg-[#1F1F1F]/5'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                  {selectedStyle && (
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-[#1F1F1F]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1F1F1F]" />
                      선택됨: {selectedStyle}
                    </div>
                   )}
                 </section>

                 {/* 2. 원하는 장면을 적어주세요 */}
                 <section>
                  <div className="flex items-center justify-between mb-1.5">
                    <h2 className="text-[13px] font-semibold text-[#2E2E2E]">
                      2. 배경에 담을 분위기나 내용을 적어주세요
                    </h2>
                    <button
                      type="button"
                      onClick={() => openRecordSelector('manual-bg')}
                      disabled={isGenerating || isExpandingPrompt}
                      className="shrink-0 text-[12px] font-semibold text-[#4F8A5B]"
                    >
                      ✨ 내 기록에서 가져오기
                    </button>
                  </div>
                  <textarea
                    value={bgPrompt}
                    disabled={isGenerating || isExpandingPrompt}
                    onChange={(e) => {
                      setBgPrompt(e.target.value);
                      setExpandedPrompt('');
                    }}
                    placeholder="예: 비 오는 창밖, 노을 지는 바다, 푸른 밤하늘"
                    className="w-full h-20 px-3 py-2.5 rounded-lg border border-[#E8E7E5] bg-white text-[#2E2E2E] text-[13px] resize-none focus:outline-none focus:border-[#1F1F1F] focus:ring-2 focus:ring-[#1F1F1F]/20"
                  />
                  <p className="mt-1.5 text-[11px] leading-4 text-[#9B9B9B]">
                    짧게 적어도 AI가 장면을 유지하며 빛·색감·구도를 다듬어줘요. 기록이나 카드 글씨 없이도 만들 수 있어요. 개인정보는 입력하지 마세요.
                  </p>
                </section>

                {!expandedPrompt && (
                  <button onClick={() => expandPrompt(false)}
                    disabled={isGenerating || isExpandingPrompt || (!bgPrompt.trim() && !selectedStyle)}
                    className="text-sm underline disabled:opacity-40">
                    배경 설명 먼저 확인·수정 (선택)
                  </button>
                )}
                {/* 확장된 프롬프트 확인 */}
                {expandedPrompt && (
                  <section>
                    <div className="flex items-center justify-between mb-1.5">
                      <h2 className="text-[13px] font-semibold text-[#2E2E2E]">
                        배경 설명 수정 (선택)
                      </h2>
                      <button
                        onClick={() => setExpandedPrompt('')}
                        disabled={isGenerating || isExpandingPrompt}
                        className="text-[12px] text-[#1F1F1F] hover:text-[#333333] font-medium"
                      >
                        다시 작성
                      </button>
                    </div>
                    <div className="p-3 rounded-lg bg-white border-2 border-[#1F1F1F] shadow-sm">
                      <textarea
                        value={expandedPrompt}
                        disabled={isGenerating || isExpandingPrompt}
                        onChange={(e) => setExpandedPrompt(e.target.value)}
                        placeholder="배경 설명을 자유롭게 수정하세요..."
                        className="w-full h-24 bg-transparent text-[#2E2E2E] text-[13px] leading-relaxed resize-none focus:outline-none placeholder:text-[#ACACAC]"
                      />
                    </div>
                  </section>
                )}

                  {/* AI 생성된 이미지에 대한 필터 적용 */}
                  {meta.bgImageUrl && bgTab === 'ai' && (
                    <section>
                      <h2 className="text-[13px] font-semibold text-[#2E2E2E] mb-1.5">
                        색감 필터
                      </h2>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {[
                          { name: '원본', filter: 'none' },
                          { name: '따뜻한', filter: 'sepia(0.3) saturate(1.2) brightness(1.05)' },
                          { name: '차가운', filter: 'brightness(0.95) saturate(0.9) hue-rotate(200deg)' },
                          { name: '빈티지', filter: 'sepia(0.5) contrast(0.9) brightness(1.1)' },
                          { name: '흑백', filter: 'grayscale(1) contrast(1.1)' },
                          { name: '파스텔', filter: 'brightness(1.15) saturate(0.8) contrast(0.9)' },
                        ].map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => setMeta(m => ({ ...m, bgFilter: preset.filter }))}
                            className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
                              meta.bgFilter === preset.filter
                                ? 'border-[#1F1F1F] bg-[#1F1F1F]/10'
                                : 'border-[#E8E7E5] bg-white hover:border-[#1F1F1F]'
                            }`}
                          >
                            <div
                              className="w-12 h-12 rounded-lg bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${meta.bgImageUrl})`,
                                filter: preset.filter,
                              }}
                            />
                            <span className="text-[11px] font-medium text-[#2E2E2E]">
                              {preset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Bottom Button - Fixed */}
                <div className="fixed bottom-0 left-0 w-full p-3 bg-white border-t z-[110]">
                  <Button
                    onClick={() => expandedPrompt ? generateBackground() : expandPrompt(true)}
                    disabled={isGenerating || isExpandingPrompt || (!bgPrompt.trim() && !selectedStyle)}
                    className="w-full min-h-11 py-2 bg-[#1F1F1F] hover:bg-[#333333] text-white rounded-xl text-[14px] font-medium"
                  >
                    {isExpandingPrompt && !isGenerating
                      ? renderGenerationContent('prompt', '배경 만들기', '배경 준비 중...')
                      : renderGenerationContent('background', meta.bgImageUrl ? '새 배경 만들기' : '배경 만들기', '이미지 생성 중...')}
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 2: 사진/필터 */}
              <TabsContent value="photo" className="flex-1 mt-0 pt-4 pb-40 overflow-y-auto hide-scrollbar">
                <div className="px-4 space-y-2.5">
                  {/* 배경 이미지가 없을 때: 업로드 버튼 */}
                  {!meta.bgImageUrl && (
                    <section>
                      <h2 className="text-[13px] font-semibold text-[#2E2E2E] mb-1.5">
                        사진 업로드
                      </h2>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-[#D1D0CE] bg-[#F9F8F6] hover:border-[#1F1F1F] hover:bg-[#1F1F1F]/5 transition-colors flex flex-col items-center justify-center gap-1.5"
                      >
                        <Upload className="w-6 h-6 text-[#1F1F1F]" />
                        <span className="text-[13px] text-[#2E2E2E] font-medium">
                          사진 선택하기
                        </span>
                      </button>
                    </section>
                  )}

                  {/* 배경 이미지가 있을 때: 이미지 교체 버튼 + 필터 */}
                  {meta.bgImageUrl && (
                    <>
                      {/* 이미지 교체 버튼 */}
                      <section>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-[#1F1F1F] bg-[#1F1F1F]/5 hover:bg-[#1F1F1F]/10 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                              <Upload className="w-5 h-5 text-[#1F1F1F]" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-[13px] font-semibold text-[#2E2E2E]">
                                🔄 이미지 교체
                              </h3>
                              <p className="text-[11px] text-[#7E7C78]">
                                새로운 사진으로 변경하기
                              </p>
                            </div>
                          </div>
                          <ChevronLeft className="w-5 h-5 text-[#1F1F1F] rotate-180 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </section>

                      {/* 필터 섹션 */}
                      <section>
                        <h2 className="text-[13px] font-semibold text-[#2E2E2E] mb-1.5">
                          색감 필터
                        </h2>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {[
                            { name: '원본', filter: 'none' },
                            { name: '따뜻한', filter: 'sepia(0.3) saturate(1.2) brightness(1.05)' },
                            { name: '차가운', filter: 'brightness(0.95) saturate(0.9) hue-rotate(200deg)' },
                            { name: '빈티지', filter: 'sepia(0.5) contrast(0.9) brightness(1.1)' },
                            { name: '흑백', filter: 'grayscale(1) contrast(1.1)' },
                            { name: '파스텔', filter: 'brightness(1.15) saturate(0.8) contrast(0.9)' },
                          ].map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => setMeta(m => ({ ...m, bgFilter: preset.filter }))}
                              className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
                                meta.bgFilter === preset.filter
                                  ? 'border-[#1F1F1F] bg-[#1F1F1F]/10'
                                  : 'border-[#E8E7E5] bg-white hover:border-[#1F1F1F]'
                              }`}
                            >
                              <div
                                className="w-12 h-12 rounded-lg bg-cover bg-center"
                                style={{
                                  backgroundImage: `url(${meta.bgImageUrl})`,
                                  filter: preset.filter,
                                }}
                              />
                              <span className="text-[11px] font-medium text-[#2E2E2E]">
                                {preset.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>

                {/* Bottom Button - Fixed */}
                {meta.bgImageUrl && (
                  <div className="fixed bottom-0 left-0 w-full p-3 bg-white border-t z-[110]">
                    <Button
                      onClick={() => setBgOpen(false)}
                      className="w-full h-11 bg-[#1F1F1F] hover:bg-[#333333] text-white rounded-xl text-[14px] font-medium"
                    >
                      완료
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: 컬러 */}
              <TabsContent value="color" className="flex-1 mt-0 pt-4 pb-40 overflow-y-auto hide-scrollbar">
                <div className="px-4 space-y-3">
                  <section>
                  <h2 className="text-[13px] font-semibold text-[#2E2E2E] mb-1.5">
                    단색 배경
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Custom Color Picker - First Item */}
                    <label className="relative aspect-square rounded-lg border-2 border-[#E8E7E5] hover:scale-105 transition-all cursor-pointer overflow-hidden group">
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: 'conic-gradient(from 0deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000)'
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                          <svg className="w-4 h-4 text-[#1F1F1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </div>
                      <input
                        type="color"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => setMeta(m => ({ ...m, bgColor: e.target.value, bgImageUrl: undefined }))}
                      />
                    </label>
                    
                    {/* Curated Emotional Palette */}
                    {[
                      { name: 'Cream Paper', color: '#FDFBF7' },
                      { name: 'Warm Beige', color: '#F5E6D3' },
                      { name: 'Dusty Rose', color: '#E6C9C9' },
                      { name: 'Sage Green', color: '#C1D7AE' },
                      { name: 'Serenity Blue', color: '#B5C7D3' },
                      { name: 'Lavender Mist', color: '#D8D4E6' },
                      { name: 'Muted Coral', color: '#EBBFBA' },
                      { name: 'Deep Charcoal', color: '#2D3436' },
                    ].map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => setMeta(m => ({ ...m, bgColor: preset.color, bgImageUrl: undefined }))}
                        className={`aspect-square rounded-lg border-2 transition-all ${
                          meta.bgColor === preset.color && !meta.bgImageUrl
                            ? 'border-[#1F1F1F] scale-110 shadow-md'
                            : 'border-[#E8E7E5] hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.color }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-[13px] font-semibold text-[#2E2E2E] mb-1.5">
                    그라데이션
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Holy Morning', gradient: 'linear-gradient(135deg, #FFF1EB 0%, #ACE0F9 100%)' },
                      { name: 'Graceful Sunset', gradient: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)' },
                      { name: 'Peaceful Mind', gradient: 'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)' },
                      { name: 'Deep Prayer', gradient: 'linear-gradient(to top, #30cfd0 0%, #330867 100%)' },
                      { name: 'Spring Breeze', gradient: 'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)' },
                      { name: 'Cotton Candy', gradient: 'linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%)' },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setMeta(m => ({ ...m, bgColor: preset.gradient, bgImageUrl: undefined }))}
                        className={`aspect-video rounded-lg border-2 transition-all relative overflow-hidden ${
                          meta.bgColor === preset.gradient && !meta.bgImageUrl
                            ? 'border-[#1F1F1F] scale-105 shadow-md'
                            : 'border-[#E8E7E5] hover:scale-105'
                        }`}
                        style={{ background: preset.gradient }}
                        title={preset.name}
                      >
                        <span className="absolute bottom-0.5 right-1.5 text-[9px] text-white/80 font-medium bg-black/20 px-1.5 py-0.5 rounded-full backdrop-blur">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
                </div>
                <div className="fixed bottom-0 left-0 w-full p-3 bg-white border-t z-[110]">
                  <Button
                    onClick={() => setBgOpen(false)}
                    className="w-full h-11 bg-[#1F1F1F] hover:bg-[#333333] text-white rounded-xl text-[14px] font-medium"
                  >
                    완료
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {renderLoginModal()}

      {/* Record Selector Modal */}
      <RecordSelectorModal
        open={recordSelectorOpen}
        onClose={() => {
          setRecordSelectorOpen(false);
        }}
        records={availableRecords}
        onConfirm={useSelectedRecordText}
        purpose={recordPickerTarget === 'manual-bg' ? 'background' : 'text'}
      />

      {renderSaveSuccessModal()}

      {/* Analysis Loading Overlay */}
      {isExpandingPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-[#1F1F1F]/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#1F1F1F] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              기록 분석 중
            </h3>
            <p className="text-sm text-gray-600">
              AI가 기록을 분석하여<br />
              배경 이미지 프롬프트를 생성하고 있습니다
            </p>
          </div>
        </div>
      )}

      {/* 폰트 선택 바텀시트 - 최대 50vh, 카드 상단 절반 항상 보임 */}
      {fontPickerOpen && (
        <>
          {/* 투명 오버레이: 시트 위 영역 터치 시 닫힘 */}
          <div className="fixed inset-0 z-40" onClick={() => setFontPickerOpen(false)} />

          {/* 폰트 선택 시트 */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[50vh] flex flex-col shadow-[0_-4px_30px_rgba(0,0,0,0.2)]">

            {/* 헤더 */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#EDEDED]">
              <h2 className="text-base font-medium text-[#2E2E2E]">폰트 선택</h2>
              <button
                onClick={() => setFontPickerOpen(false)}
                className="p-2 text-[#7E7C78] hover:text-[#2E2E2E]"
              >
                ✕
              </button>
            </div>

            {/* 폰트 목록 - 세로 스크롤, 각 항목 해당 서체로 렌더링 */}
            <div className="flex-1 overflow-y-auto">
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  style={{ fontFamily: font.family }}
                  onClick={() => setT(s => ({ ...s, fontFamily: font.value }))}
                  className={`w-full flex items-center justify-between px-5 min-h-[48px] transition-colors ${
                    t.fontFamily === font.value
                      ? 'text-[#1F1F1F] bg-[#1F1F1F]/5'
                      : 'text-[#2E2E2E] hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{font.label}</span>
                  {t.fontFamily === font.value && (
                    <Check className="w-5 h-5 text-[#1F1F1F] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


/** ─────────────────────────────────────────────────────────
 * 하단 툴바 (텍스트/스타일/정렬/간격)
 * ───────────────────────────────────────────────────────── */
function Toolbar({
  active, setActive,
  t, setT, meta, setMeta, onPanelOpen, onOpenFontPicker, onImportRecord
}:{
  active: 'text'|'font'|'color'|'size';
  setActive: (a:any)=>void;
  t: TextStyle; setT: React.Dispatch<React.SetStateAction<TextStyle>>;
  meta: Meta; setMeta: React.Dispatch<React.SetStateAction<Meta>>;
  onPanelOpen?: () => void;
  onOpenFontPicker?: () => void;
  onImportRecord?: () => void;
}) {
  return (
    <div className="h-full min-h-0 flex flex-col bg-transparent">
      <Tabs
        value={active}
        onValueChange={(v) => {
          setActive(v as any);
          onPanelOpen?.();
        }}
        className="h-full min-h-0 flex flex-col"
      >
        {/* 탭 메뉴 - 44x44px 최소 터치 영역 */}
        <TabsList className="shrink-0 h-auto p-1 bg-white mx-1 sm:mx-3 my-2 rounded-full border border-[#E3E2E0] flex gap-0.5 sm:gap-1 overflow-x-auto whitespace-nowrap sm:grid sm:grid-cols-5">
          <TabsTrigger
            value="text"
            title="텍스트"
            className="px-4 py-3 rounded-full data-[state=active]:bg-[#1F1F1F] data-[state=active]:text-white data-[state=inactive]:text-[#7E7C78] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Type className="w-6 h-6" />
          </TabsTrigger>
          <TabsTrigger
            value="font"
            title="폰트"
            className="px-4 py-3 rounded-full data-[state=active]:bg-[#1F1F1F] data-[state=active]:text-white data-[state=inactive]:text-[#7E7C78] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span className="text-lg font-bold">가</span>
          </TabsTrigger>
          <TabsTrigger
            value="color"
            title="색상"
            className="px-4 py-3 rounded-full data-[state=active]:bg-[#1F1F1F] data-[state=active]:text-white data-[state=inactive]:text-[#7E7C78] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Palette className="w-6 h-6" />
          </TabsTrigger>
          <TabsTrigger
            value="size"
            title="크기"
            className="px-4 py-3 rounded-full data-[state=active]:bg-[#1F1F1F] data-[state=active]:text-white data-[state=inactive]:text-[#7E7C78] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Ruler className="w-6 h-6" />
          </TabsTrigger>
        </TabsList>

        {/* 컨텐츠 영역 - 고정 높이로 탭 전환 시 흔들림 방지 */}
        <div className="px-2 sm:px-4 py-2 sm:py-3 pb-4 sm:pb-6 flex-1 min-h-0 overflow-y-auto">
          {/* 텍스트 탭: B/I/U 버튼만 */}
          <TabsContent value="text" className="mt-0 space-y-2 sm:space-y-3 pb-0">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (!t.content || t.content === '텍스트를 입력하세요.') {
                    setT(s => ({ ...s, content: '' }));
                  }
                  onPanelOpen?.();
                }}
                className="h-10 rounded-lg border border-[#E3E2E0] bg-white text-[12px] font-semibold text-[#2E2E2E] hover:border-[#1F1F1F]"
              >
                직접 입력
              </button>
              <button
                onClick={onImportRecord}
                className="h-10 rounded-lg border border-[#D9DDD5] bg-[#F7F8F4] text-[12px] font-semibold text-[#4F8A5B] hover:bg-[#F1F4ED]"
              >
                내 기록에서 가져오기
              </button>
            </div>

            {/* B/I/U 버튼 */}
            <div className="flex gap-1.5 p-1.5 rounded-xl bg-[#F7F6F5]">
              <button
                onClick={() => setT(s => ({ ...s, bold: !s.bold }))}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                  t.bold
                    ? 'bg-[#1F1F1F] text-white shadow-sm'
                    : 'bg-transparent text-[#2E2E2E] hover:bg-white'
                }`}
                title="굵게"
              >
                <Bold className="w-5 h-5" />
              </button>
              <button
                onClick={() => setT(s => ({ ...s, italic: !s.italic }))}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                  t.italic
                    ? 'bg-[#1F1F1F] text-white shadow-sm'
                    : 'bg-transparent text-[#2E2E2E] hover:bg-white'
                }`}
                title="기울임"
              >
                <Italic className="w-5 h-5" />
              </button>
              <button
                onClick={() => setT(s => ({ ...s, underline: !s.underline }))}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                  t.underline
                    ? 'bg-[#1F1F1F] text-white shadow-sm'
                    : 'bg-transparent text-[#2E2E2E] hover:bg-white'
                }`}
                title="밑줄"
              >
                <Underline className="w-5 h-5" />
              </button>
            </div>

            {/* 글자크기 슬라이더 */}
            <LabeledSlider label={`크기: ${t.fontSize}px`} min={1} max={72} step={1} value={t.fontSize} onChange={(v)=>setT(s=>({...s,fontSize:v}))} dark={false}/>

            {/* 중앙 배치 버튼 */}
            <button
              className="w-full py-3 rounded-xl border-2 border-[#1F1F1F] bg-[#1F1F1F]/10 text-[#1F1F1F] hover:bg-[#1F1F1F]/20 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              onClick={() => setT(s => ({ ...s, x: 50, y: 50 }))}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
              중앙 배치
            </button>
          </TabsContent>

          {/* 폰트 탭: 현재 선택 폰트명 표시 */}
          <TabsContent value="font" className="mt-0 pb-0">
            <button
              onClick={() => {
                onOpenFontPicker?.();
              }}
              className="w-full py-3 px-4 rounded-xl border border-[#E3E2E0] bg-white text-[#2E2E2E] text-sm hover:border-[#1F1F1F] transition-colors"
            >
              <span style={{ fontFamily: t.fontFamily === 'Inter' ? 'Inter' : t.fontFamily === 'SerifKR' ? 'Noto Serif KR' : t.fontFamily === 'NotoSans' ? 'Noto Sans KR' : t.fontFamily === 'NanumGothic' ? 'Nanum Gothic' : t.fontFamily === 'NanumMyeongjo' ? 'Nanum Myeongjo' : t.fontFamily === 'GothicA1' ? 'Gothic A1' : t.fontFamily === 'GowunDodum' ? 'Gowun Dodum' : t.fontFamily === 'GowunBatang' ? 'Gowun Batang' : t.fontFamily === 'SongMyung' ? 'Song Myung' : t.fontFamily === 'Hahmlet' ? 'Hahmlet' : t.fontFamily === 'NanumPen' ? 'Nanum Pen Script' : t.fontFamily === 'NanumBrush' ? 'Nanum Brush Script' : t.fontFamily === 'GamjaFlower' ? 'Gamja Flower' : t.fontFamily === 'HiMelody' ? 'Hi Melody' : t.fontFamily === 'Gaegu' ? 'Gaegu' : t.fontFamily === 'Jua' ? 'Jua' : t.fontFamily === 'BlackHanSans' ? 'Black Han Sans' : t.fontFamily === 'DoHyeon' ? 'Do Hyeon' : t.fontFamily === 'Sunflower' ? 'Sunflower' : t.fontFamily === 'Dongle' ? 'Dongle' : t.fontFamily === 'Roboto' ? 'Roboto' : t.fontFamily === 'Montserrat' ? 'Montserrat' : t.fontFamily === 'Playfair' ? 'Playfair Display' : 'Lora' }}>
                {t.fontFamily === 'Inter' ? 'Inter' : t.fontFamily === 'SerifKR' ? 'Noto Serif' : t.fontFamily === 'NotoSans' ? 'Noto Sans' : t.fontFamily === 'NanumGothic' ? '나눔고딕' : t.fontFamily === 'NanumMyeongjo' ? '나눔명조' : t.fontFamily === 'GothicA1' ? 'Gothic A1' : t.fontFamily === 'GowunDodum' ? '고운도둠' : t.fontFamily === 'GowunBatang' ? '고운바탕' : t.fontFamily === 'SongMyung' ? '송명조' : t.fontFamily === 'Hahmlet' ? '함릿체' : t.fontFamily === 'NanumPen' ? '나눔손글씨' : t.fontFamily === 'NanumBrush' ? '나눔붓' : t.fontFamily === 'GamjaFlower' ? '감자꽃' : t.fontFamily === 'HiMelody' ? '하이멜로디' : t.fontFamily === 'Gaegu' ? '개구쟁이' : t.fontFamily === 'Jua' ? 'Jua' : t.fontFamily === 'BlackHanSans' ? '검은고딕' : t.fontFamily === 'DoHyeon' ? '도현체' : t.fontFamily === 'Sunflower' ? '해바라기' : t.fontFamily === 'Dongle' ? '동글체' : t.fontFamily === 'Roboto' ? 'Roboto' : t.fontFamily === 'Montserrat' ? 'Montserrat' : t.fontFamily === 'Playfair' ? 'Playfair' : 'Lora'}
              </span>
            </button>
          </TabsContent>

          {/* 색상 탭: 텍스트 색상 + 외곽선/그림자/박스 토글 */}
          <TabsContent value="color" className="mt-0 space-y-2 sm:space-y-3 pb-2 sm:pb-4">
            <ColorRow label="텍스트 색상" value={t.color} onPick={(c)=>setT(s=>({...s,color:c}))} dark={false}/>

            {/* 외곽선 */}
            <div className="space-y-1.5">
              <ToggleRow label="외곽선" checked={t.stroke.enabled} onChange={(v)=>setT(s=>({...s,stroke:{...s.stroke,enabled:v}}))} dark={false}/>
              {t.stroke.enabled && (
                <div className="space-y-1.5 px-3 py-2 rounded-lg bg-[#F7F6F5]">
                  <ColorRow label="색상" value={t.stroke.color} onPick={(c)=>setT(s=>({...s,stroke:{...s.stroke,color:c}}))} dark={false}/>
                  <LabeledSlider label={`두께: ${t.stroke.width}px`} min={0} max={8} step={1} value={t.stroke.width} onChange={(v)=>setT(s=>({...s,stroke:{...s.stroke,width:v}}))} dark={false}/>
                </div>
              )}
            </div>

            {/* 그림자 */}
            <div className="space-y-1.5">
              <ToggleRow label="그림자" checked={t.shadow.enabled} onChange={(v)=>setT(s=>({...s,shadow:{...s.shadow,enabled:v}}))} dark={false}/>
              {t.shadow.enabled && (
                <div className="space-y-1.5 px-3 py-2 rounded-lg bg-[#F7F6F5]">
                  <ColorRow label="색상" value={t.shadow.color} onPick={(c)=>setT(s=>({...s,shadow:{...s.shadow,color:c}}))} dark={false}/>
                  <LabeledSlider label={`흐림: ${t.shadow.blur}px`} min={0} max={40} step={1} value={t.shadow.blur} onChange={(v)=>setT(s=>({...s,shadow:{...s.shadow,blur:v}}))} dark={false}/>
                </div>
              )}
            </div>

            {/* 텍스트 박스 */}
            <div className="space-y-1.5">
              <ToggleRow label="박스" checked={t.box.enabled} onChange={(v)=>setT(s=>({...s,box:{...s.box,enabled:v}}))} dark={false}/>
              {t.box.enabled && (
                <div className="space-y-1.5 px-3 py-2 rounded-lg bg-[#F7F6F5]">
                  <ColorRow label="색상" value={t.box.color} onPick={(c)=>setT(s=>({...s,box:{...s.box,color:c}}))} dark={false}/>
                  <LabeledSlider label={`투명도: ${t.box.opacity}%`} min={0} max={100} step={1} value={t.box.opacity} onChange={(v)=>setT(s=>({...s,box:{...s.box,opacity:v}}))} dark={false}/>
                  <LabeledSlider label={`모서리: ${t.box.radius}px`} min={0} max={32} step={1} value={t.box.radius} onChange={(v)=>setT(s=>({...s,box:{...s.box,radius:v}}))} dark={false}/>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 크기 탭: 글자크기 + 행간 + 자간 */}
          <TabsContent value="size" className="mt-0 space-y-2 sm:space-y-3 pb-2 sm:pb-4">
            <LabeledSlider label={`글자 크기: ${t.fontSize}px`} min={1} max={72} step={1} value={t.fontSize} onChange={(v)=>setT(s=>({...s,fontSize:v}))} dark={false}/>
            <LabeledSlider label={`행간: ${t.lineHeight.toFixed(2)}`} min={1.2} max={1.8} step={0.01} value={t.lineHeight} onChange={(v)=>setT(s=>({...s,lineHeight:v}))} dark={false}/>
            <LabeledSlider label={`자간: ${t.letterSpacing}px`} min={-1} max={2} step={0.1} value={t.letterSpacing} onChange={(v)=>setT(s=>({...s,letterSpacing:v}))} dark={false}/>

            {/* 가독성 조정 */}
            <div className="space-y-1.5 pt-2 border-t border-[#E3E2E0]">
              <div className="text-[11px] sm:text-xs text-[#7E7C78] font-medium">가독성</div>
              <LabeledSlider label={`배경 어둡게: ${meta.bgDarken}%`} min={0} max={60} step={1} value={meta.bgDarken} onChange={(v)=>setMeta(m=>({...m,bgDarken:v}))} dark={false}/>
              <LabeledSlider label={`배경 흐리게: ${meta.bgBlur}px`} min={0} max={8} step={1} value={meta.bgBlur} onChange={(v)=>setMeta(m=>({...m,bgBlur:v}))} dark={false}/>
            </div>
          </TabsContent>

          {/* 정렬 탭 */}

        </div>
      </Tabs>
    </div>
  );
}

/** ─────────────────────────────────────────────────────────
 * 공용 UI
 * ───────────────────────────────────────────────────────── */
function LabeledSlider({label,min,max,step,value,onChange,dark}:{label:string;min:number;max:number;step:number;value:number;onChange:(v:number)=>void;dark?:boolean}){
  return (
    <div>
      <div className={`text-xs text-[#7E7C78] mb-1.5 flex items-center justify-between ${dark?'text-white':''}`}>
        <span>{label}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e)=>onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 ${dark?'accent-white':'accent-[#1F1F1F]'} appearance-none rounded-full bg-[#E3E2E0] cursor-pointer`}
        style={{
          background: `linear-gradient(to right, #1F1F1F 0%, #1F1F1F ${((value-min)/(max-min)*100)}%, #E3E2E0 ${((value-min)/(max-min)*100)}%, #E3E2E0 100%)`
        }}
      />
    </div>
  );
}

function ColorRow({label,value,onPick,dark}:{label:string; value:string; onPick:(c:string)=>void;dark?:boolean}){
  const colors = PALETTE;
  return (
    <div>
      {label && <div className={`text-xs text-[#7E7C78] mb-1.5 ${dark?'text-white':''}`}>{label}</div>}
      <div className="flex gap-1.5 items-center px-3 py-2.5 rounded-xl bg-[#F7F6F5]">
        {colors.map(c=>(
          <button
            key={c}
            className={`w-7 h-7 rounded-full transition-all flex-shrink-0 ${
              value === c ? 'ring-2 ring-[#1F1F1F] ring-offset-2 scale-110' : 'ring-1 ring-black/10 hover:scale-105'
            }`}
            style={{background:c}}
            onClick={()=>onPick(c)}
          />
        ))}
        {/* Rainbow gradient custom color picker button */}
        <label
          className="relative w-7 h-7 rounded-full cursor-pointer ring-1 ring-black/10 hover:ring-2 hover:ring-[#1F1F1F] transition-all overflow-hidden flex-shrink-0"
          title="커스텀 색상"
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000)'
            }}
          />
          <input
            type="color"
            value={value}
            onChange={(e)=>onPick(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
}

function ToggleRow({label,checked,onChange,dark}:{label:string;checked:boolean;onChange:(v:boolean)=>void;dark?:boolean}){
  return (
    <label className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#F7F6F5] hover:bg-[#EDEDED] transition-colors cursor-pointer">
      <span className={`text-sm font-medium ${dark?'text-white':'text-[#2E2E2E]'}`}>{label}</span>
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="sr-only peer" />
        <div className={`w-10 h-[22px] rounded-full transition-colors ${checked ? 'bg-[#1F1F1F]' : 'bg-[#D4D3D1]'}`} />
        <div className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : ''}`} />
      </div>
    </label>
  );
}
