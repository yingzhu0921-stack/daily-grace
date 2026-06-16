import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Wand2, Upload, ImageIcon, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Paintbrush, Ruler, Palette, Check, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLoginNudge } from '@/hooks/useLoginNudge';
import { RecordSelectorModal } from '@/components/RecordSelectorModal';
import { CardSaveSuccessModal } from '@/components/CardSaveSuccessModal';
import { LoginModal } from '@/components/LoginModal';
import { FontPicker, fontOptions } from '@/components/FontPicker';
import { toast } from 'sonner';

import { saveCard, getCardById, type VerseCard } from '@/utils/verseCardDB';

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
  fontFamily: 'Inter' | 'SerifKR' | 'NotoSans' | 'NanumGothic' | 'NanumMyeongjo' | 'Jua' | 'BlackHanSans' | 'DoHyeon' | 'NanumPen' | 'Sunflower' | 'GothicA1' | 'GamjaFlower' | 'GowunDodum' | 'GowunBatang' | 'NanumBrush' | 'HiMelody' | 'Gaegu' | 'Dongle' | 'SongMyung' | 'Hahmlet' | 'Playfair' | 'Montserrat' | 'Roboto' | 'Lora' | 'KBLJump' | 'GangwonTunTun' | 'PaperBlack' | 'PaperLight' | 'Taenada' | 'RidiBatang' | 'SeoulHangang' | 'Hyunok' | 'Kkubullim' | 'GangwonModoo' | 'Keris' | 'JeonnamBarun' | 'Incheon' | 'Limelight' | 'CaveatBrush';
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

// 카드 이미지를 기기에 저장. 모바일은 공유 시트("이미지 저장")로 사진 앱 저장 유도, 그 외는 다운로드.
// 주의: 공유 시트는 사용자 제스처가 필요하므로 긴 await 이전(클릭 직후)에 호출해야 함.
async function downloadCardToDevice(dataUrl: string) {
  const filename = `말씀카드-${Date.now()}.jpg`;
  try {
    if (navigator.share && navigator.canShare) {
      const blob = await fetch(dataUrl).then(r => r.blob());
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '말씀카드' });
        return; // 공유 시트로 처리됨
      }
    }
  } catch (e: any) {
    // 사용자가 공유를 취소한 경우는 정상 동작 — 폴백하지 않음
    if (e?.name === 'AbortError') return;
    console.warn('Share failed, falling back to download:', e);
  }
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Download failed:', e);
  }
}

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
  const [activeTrack, setActiveTrack] = useState<'auto' | 'manual' | 'photo' | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoText, setPhotoText] = useState('');
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [verseInput, setVerseInput] = useState('');
  const [autoResult, setAutoResult] = useState<{
    image: string;
    template: string;
    fonts: { primary: string; secondary: string };
    mainPhrase: string;
    secondaryPhrase: string;
    reference: string;
    mood: string;
    recommendedTemplates: string[];
    backgroundConcept?: string;
    visualMotifs?: string[];
    palette?: string;
    lighting?: string;
    composition?: string;
    typographyTone?: string;
    fontMood?: string;
    avoidImagery?: string[];
    ratio?: Ratio;
    typography?: AutoTypography;
  } | null>(null);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Mobile: start collapsed by default
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);  // 진입 시 패널 닫혀있음
  const panelCollapsedBeforeEdit = useRef(true);

  const isPlaceholderText = t.content === '텍스트를 입력하세요.';
  const isTextEmpty = !t.content.trim() || isPlaceholderText;

  const openBackgroundSheet = (tab: typeof bgTab = 'ai') => {
    setBgTab(tab);
    setBgOpen(true);
  };
  const showCardLoginNudge = useCallback(() => setShowLoginModal(true), [setShowLoginModal]);

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
    dark = true
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

  useLoginNudge({
    user,
    loading,
    storageKey: 'login_nudge_card_designer',
    show: showCardLoginNudge,
    delay: 700,
  });

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
    }, window.location.pathname);
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
        console.log('Loading card state:', state);
        
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
      console.log('🔄 Fetching records...');

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

      // 정렬 후 최근 12개
      const allRecords = Array.from(recordMap.values())
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.createdAt || a.date).getTime();
          const dateB = new Date(b.created_at || b.createdAt || b.date).getTime();
          return dateB - dateA;
        })
        .slice(0, 12);

      console.log('✅ Total merged records:', allRecords.length);
      console.log('📋 Latest 3 records:', allRecords.slice(0, 3).map(r => ({
        type: r.type,
        date: r.date,
        title: r.title,
        created: r.created_at || r.createdAt
      })));

      // 상태 업데이트
      setAvailableRecords(allRecords);
    } catch (error) {
      console.error('❌ Error fetching records:', error);
      toast.error('기록을 불러오는데 실패했습니다.');
    }
  }, []); // 빈 배열: 컴포넌트 생명주기 동안 함수 참조 유지

  const openRecordSelector = async () => {
    await fetchRecordsForSelector();
    setRecordSelectorOpen(true);
  };

  const analyzeSelectedRecord = async (record: any) => {
    setRecordSelectorOpen(false);
    setIsExpandingPrompt(true); // Use existing loading state

    const loadingToast = toast.loading('기록을 분석하여 프롬프트를 생성하는 중입니다...', {
      description: '잠시만 기다려주세요',
    });

    try {
      const response = await fetch('/api/analyze-records', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [record] }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
        console.error('❌ analyze-records API error:', response.status, errorData);
        throw new Error(errorData.error || 'AI 분석에 실패했습니다');
      }

      const data = await response.json();
      console.log('✅ analyze-records success:', data);
      setBgPrompt(data.prompt);
      toast.dismiss(loadingToast);
      toast.success('기록 분석이 완료되었습니다!');

      // Auto-expand prompt after analysis
      setTimeout(() => expandPrompt(), 500);
    } catch (error) {
      console.error('❌ analyzeSelectedRecord error:', error);
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : '기록 분석에 실패했습니다.');
    } finally {
      setIsExpandingPrompt(false);
    }
  };

  const expandPrompt = async () => {
    console.log('🚀 expandPrompt called', { bgPrompt, selectedStyle, user: !!user });

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
      console.log('❌ No user, redirecting to auth');
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

      console.log('📥 Response status:', response.status);

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
      console.log('✅ expandPrompt success:', data);
      setExpandedPrompt(data.expandedPrompt);
      toast.success('프롬프트가 생성되었습니다!');
    } catch (error) {
      console.error('❌ Expand prompt error:', error);
      toast.error(error instanceof Error ? error.message : '프롬프트 확장에 실패했습니다.');
    } finally {
      setIsExpandingPrompt(false);
      stopGenerationProgress('prompt');
    }
  };

  const generateBackground = async () => {
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
    setIsGenerating(true);
    startGenerationProgress('background', 38000);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-image', prompt: expandedPrompt, style: selectedStyle, ratio: meta.ratio, text: t.content }),
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
        console.log('Cropping image from API response to ratio:', meta.ratio);
        try {
          finalImage = await cropImageToRatio(data.image, meta.ratio);
          console.log('Image cropped successfully');
        } catch (error) {
          console.error('Failed to crop image:', error);
          // Use original image if cropping fails
        }
      } else {
        console.log('Skipping crop - requestedRatio:', data.requestedRatio, 'meta.ratio:', meta.ratio);
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
    switch (flowStep) {
      case 'record':        setFlowStep('entry'); break;
      case 'photo-upload':  setFlowStep('entry'); setPhotoData(null); setPhotoText(''); break;
      case 'auto-template': setFlowStep('record'); break;
      case 'auto-preview':  setFlowStep('auto-template'); break;
      case 'edit':
        if (activeTrack === 'manual') setFlowStep('entry');
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
          { id: 'edit', label: '편집' },
        ]
      : activeTrack === 'photo'
      ? [
          { id: 'photo-upload', label: '사진' },
          { id: 'edit', label: '편집' },
        ]
      : [
          { id: 'edit', label: '편집' },
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
        <p className="mt-2 text-[14px] leading-6 text-[#7E7C78]">시작 방식을 고르면 바로 제작 화면으로 이어집니다.</p>
      </div>

      <div className="w-full max-w-md mx-auto px-5 pb-8 space-y-2.5">
        <button
          onClick={() => startCardFlow('auto')}
          className="w-full flex items-center gap-4 p-4 border border-[#1F1F1F] bg-[#1F1F1F] text-white rounded-lg text-left transition-colors hover:bg-[#333333]"
        >
          <div className="h-10 w-10 rounded-lg bg-white/12 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold">자동 완성</p>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/16">추천</span>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-white/72">문구 입력, 템플릿 선택, AI 배경 생성까지 한 흐름으로 진행합니다.</p>
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
            <p className="mt-1 text-[12px] leading-5 text-[#7E7C78]">빈 캔버스에서 배경, 문구, 글꼴을 직접 조정합니다.</p>
          </div>
        </button>

        <button
          onClick={() => startCardFlow('photo')}
          className="w-full flex items-center gap-4 p-4 border border-[#E3E2E0] bg-white rounded-lg text-left transition-colors hover:border-[#1F1F1F]"
        >
          <div className="h-10 w-10 rounded-lg bg-[#F3F2F1] flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5 text-[#1F1F1F]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#2E2E2E]">사진으로 시작</p>
            <p className="mt-1 text-[12px] leading-5 text-[#7E7C78]">사진을 올리고 문구를 얹어 카드로 다듬습니다.</p>
          </div>
        </button>
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
          <label className="text-sm font-semibold text-[#1F1F1F] mb-2 block">넣고 싶은 구절 / 문구</label>
          <textarea
            value={photoText}
            onChange={e => setPhotoText(e.target.value)}
            placeholder={"예) 주는 나의 목자시니 내가 부족함이 없으리로다\n시편 23:1"}
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
        <p className="mt-1 text-[13px] leading-5 text-[#7E7C78]">카드에 들어갈 핵심 문구를 넣어주세요.</p>
      </div>
      <textarea
        value={verseInput}
        onChange={(e) => {
          setVerseInput(e.target.value);
          setT(s => ({ ...s, content: e.target.value }));
          if (textRef.current) textRef.current.innerText = e.target.value;
        }}
        placeholder="말씀, 찬양 가사, 기도, 감사 내용을 입력해주세요"
        className="flex-1 min-h-[190px] p-4 border border-[#E3E2E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F1F1F] resize-none text-[15px] leading-7"
      />
      <div className="grid grid-cols-[auto,1fr] gap-2">
        <button
          onClick={openRecordSelector}
          className="px-4 py-3 text-sm font-medium border border-[#1F1F1F] text-[#1F1F1F] rounded-lg hover:bg-[#1F1F1F]/5"
        >
          내 기록
        </button>
        <button
          onClick={() => {
            if (!verseInput.trim()) { toast.error('내용을 입력해주세요'); return; }
            if (!selectedTemplateId) setSelectedTemplateId('T13');
            setFlowStep('auto-template');
          }}
          className="px-4 py-3 bg-[#1F1F1F] text-white rounded-lg font-medium hover:bg-[#333333]"
        >
          템플릿 선택
        </button>
      </div>
    </div>
  );

  // Auto Template 선택 화면
  const TEMPLATE_INFO = [
    {
      id: 'T01',
      name: 'Bold Poster',
      mood: '담대함 · 선포 · 믿음 · 승리',
      example: '믿음으로 서다',
      hint: '강한 문장, 포스터 느낌',
      preview: {
        background: 'linear-gradient(135deg, #F8F5ED 0%, #ECE6D9 58%, #252525 59%, #252525 100%)',
        color: '#1F1F1F',
        accent: '#1F1F1F',
        font: "'PaperBlack', sans-serif",
      },
    },
    {
      id: 'T03',
      name: 'Magazine',
      mood: '시편 · 묵상 · 평안 · 은혜',
      example: '은혜가 머무는 곳',
      hint: '고급 잡지, 부드러운 여백',
      preview: {
        background: 'linear-gradient(145deg, #F7F0E5 0%, #FEFCF8 55%, #D8C8AD 100%)',
        color: '#4C3B2A',
        accent: '#C8A96A',
        font: "'RidiBatang', serif",
      },
    },
    {
      id: 'T09',
      name: 'Modern Worship',
      mood: '소망 · 회복 · 빛 · 예배',
      example: '다시 빛으로',
      hint: '빛, 컬러, 예배 앨범',
      preview: {
        background: 'radial-gradient(circle at 25% 20%, #FFE6A7 0%, transparent 32%), linear-gradient(135deg, #3F2E7E 0%, #C56DA3 52%, #68A4D9 100%)',
        color: '#FFFFFF',
        accent: '#FFE6A7',
        font: "'Taenada', sans-serif",
      },
    },
    {
      id: 'T13',
      name: 'Daily Grace',
      mood: 'QT · 묵상 · 일상 · 감사',
      example: '오늘의 작은 은혜',
      hint: '저널, 따뜻한 일상',
      preview: {
        background: 'linear-gradient(135deg, #FBF3E8 0%, #F3DFC3 100%)',
        color: '#5A4635',
        accent: '#D0A56E',
        font: "'Hyunok', sans-serif",
      },
    },
    {
      id: 'T17',
      name: 'Beige Minimal',
      mood: '은혜 · 쉼 · 평안',
      example: '잠잠히 머물다',
      hint: '절제된 베이지, 차분함',
      preview: {
        background: 'linear-gradient(135deg, #EFE7D8 0%, #FAF7EF 100%)',
        color: '#3D3328',
        accent: '#CBB994',
        font: "'PaperLight', sans-serif",
      },
    },
    {
      id: 'T20',
      name: 'Light & Shadow',
      mood: '묵상 · 기도 · 고요함',
      example: '빛 가운데 고요히',
      hint: '창가 빛, 그림자, 기도',
      preview: {
        background: 'linear-gradient(115deg, #F8EBD7 0%, #FFFDF8 42%, #B79569 43%, #5A4632 100%)',
        color: '#FFF8EA',
        accent: '#8E6A45',
        font: "'RidiBatang', serif",
      },
    },
  ];

  const renderAutoTemplate = () => {
    const handleGenerate = async () => {
      if (!selectedTemplateId) { toast.error('템플릿을 선택해주세요'); return; }
      if (!user) { navigate('/auth?callback=' + encodeURIComponent(window.location.pathname)); return; }
      setIsGenerating(true);
      setTemplateIndex(0);
      startGenerationProgress('auto', 45000);
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'auto-complete', verse: verseInput.trim(), templateId: selectedTemplateId, ratio: meta.ratio }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: '오류' }));
          if (res.status === 429) { toast.error('API 요청 한도 초과', { description: '잠시 후 다시 시도해주세요.' }); return; }
          throw new Error(err.error || '생성 실패');
        }
        const data = await res.json();
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
            {(['4:5', '9:16', '1:1', '16:9'] as Ratio[]).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setMeta(m => ({ ...m, ratio }))}
                className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                  meta.ratio === ratio
                    ? 'border-[#1F1F1F] bg-[#1F1F1F] text-white'
                    : 'border-[#E3E2E0] text-[#4A4A4A] hover:border-[#1F1F1F]/40'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATE_INFO.map(({ id, name, mood, example, hint, preview }) => (
            <button
              key={id}
              onClick={() => setSelectedTemplateId(id)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedTemplateId === id
                  ? 'border-[#1F1F1F] bg-[#1F1F1F]/5'
                  : 'border-[#E3E2E0] hover:border-[#1F1F1F]/40'
              }`}
            >
              <div
                className="relative h-24 rounded-md overflow-hidden mb-3 shadow-sm"
                style={{ background: preview.background }}
              >
                <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #000 1px, transparent 1px)', backgroundSize: '9px 9px' }} />
                <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2">
                  <p
                    className="text-[14px] leading-tight"
                    style={{ color: preview.color, fontFamily: preview.font, textShadow: id === 'T09' || id === 'T20' ? '0 2px 8px rgba(0,0,0,.24)' : 'none' }}
                  >
                    {example}
                  </p>
                  <div className="mt-2 h-1 w-10 rounded-full" style={{ backgroundColor: preview.accent }} />
                </div>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#7E7C78] mb-0.5">{id}</p>
                  <p className="text-sm font-semibold text-[#1F1F1F] leading-tight">{name}</p>
                </div>
                <span className="shrink-0 max-w-[82px] text-[10px] leading-3 px-1.5 py-0.5 rounded-md bg-[#F3F2F1] text-[#7E7C78] text-right">
                  {hint}
                </span>
              </div>
              <p className="text-xs text-[#9E9C98] mt-2 leading-relaxed">{mood}</p>
            </button>
          ))}
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
    'Limelight': "'Limelight', cursive",
    'CaveatBrush': "'Caveat Brush', cursive",
  };

  const AUTO_TYPOGRAPHY: Record<string, AutoTypography> = {
    T01: {
      color: '#171717',
      secondaryColor: 'rgba(23,23,23,0.72)',
      referenceColor: 'rgba(23,23,23,0.52)',
      shadow: '0 1px 0 rgba(255,255,255,0.8)',
      editShadow: { x: 0, y: 1, blur: 0, color: 'rgba(255,255,255,.8)' },
      mainSize: 'clamp(1.65rem, 5.8vw, 2.75rem)',
      subSize: 'clamp(0.78rem, 2.1vw, 0.96rem)',
      refSize: 'clamp(0.7rem, 1.8vw, 0.82rem)',
      lineHeight: 1.12,
      editFontSize: 20,
      weight: 800,
      bold: true,
    },
    T03: {
      color: '#473728',
      secondaryColor: 'rgba(71,55,40,0.68)',
      referenceColor: 'rgba(71,55,40,0.5)',
      shadow: '0 1px 2px rgba(255,255,255,0.55)',
      editShadow: { x: 0, y: 1, blur: 2, color: 'rgba(255,255,255,.55)' },
      mainSize: 'clamp(1.35rem, 4.7vw, 2.15rem)',
      subSize: 'clamp(0.82rem, 2.2vw, 0.96rem)',
      refSize: 'clamp(0.72rem, 1.9vw, 0.84rem)',
      lineHeight: 1.32,
      editFontSize: 17,
      weight: 600,
      bold: false,
    },
    T09: {
      color: '#FFFFFF',
      secondaryColor: 'rgba(255,255,255,0.86)',
      referenceColor: 'rgba(255,255,255,0.7)',
      shadow: '0 3px 14px rgba(27,12,60,0.38)',
      editShadow: { x: 0, y: 3, blur: 14, color: 'rgba(27,12,60,.38)' },
      mainSize: 'clamp(1.55rem, 5.3vw, 2.55rem)',
      subSize: 'clamp(0.8rem, 2.2vw, 0.96rem)',
      refSize: 'clamp(0.7rem, 1.9vw, 0.84rem)',
      lineHeight: 1.18,
      editFontSize: 19,
      weight: 700,
      bold: true,
    },
    T13: {
      color: '#4E3D2D',
      secondaryColor: 'rgba(78,61,45,0.66)',
      referenceColor: 'rgba(78,61,45,0.48)',
      shadow: '0 1px 1px rgba(255,255,255,0.45)',
      editShadow: { x: 0, y: 1, blur: 1, color: 'rgba(255,255,255,.45)' },
      mainSize: 'clamp(1.45rem, 5vw, 2.35rem)',
      subSize: 'clamp(0.82rem, 2.25vw, 0.98rem)',
      refSize: 'clamp(0.72rem, 1.9vw, 0.84rem)',
      lineHeight: 1.34,
      editFontSize: 18,
      weight: 500,
      bold: false,
    },
    T17: {
      color: '#3D3328',
      secondaryColor: 'rgba(61,51,40,0.58)',
      referenceColor: 'rgba(61,51,40,0.44)',
      shadow: 'none',
      editShadow: { x: 0, y: 0, blur: 0, color: 'rgba(0,0,0,0)' },
      mainSize: 'clamp(1.2rem, 4.2vw, 1.92rem)',
      subSize: 'clamp(0.78rem, 2vw, 0.9rem)',
      refSize: 'clamp(0.68rem, 1.8vw, 0.8rem)',
      lineHeight: 1.48,
      editFontSize: 15,
      weight: 400,
      bold: false,
    },
    T20: {
      color: '#FDF9F1',
      secondaryColor: 'rgba(253,249,241,0.82)',
      referenceColor: 'rgba(253,249,241,0.66)',
      shadow: '0 2px 10px rgba(48,34,22,0.32)',
      editShadow: { x: 0, y: 2, blur: 10, color: 'rgba(48,34,22,.32)' },
      mainSize: 'clamp(1.28rem, 4.5vw, 2.08rem)',
      subSize: 'clamp(0.82rem, 2.15vw, 0.96rem)',
      refSize: 'clamp(0.72rem, 1.85vw, 0.82rem)',
      lineHeight: 1.36,
      editFontSize: 16,
      weight: 600,
      bold: false,
    },
  };

  const getAutoTypography = (template: string) => AUTO_TYPOGRAPHY[template] || AUTO_TYPOGRAPHY.T13;

  const analyzeBackgroundForTypography = (imageSrc: string, base: AutoTypography): Promise<AutoTypography> => {
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

        const darkInk = isWarm ? '#332A22' : '#24272B';
        const lightInk = isWarm ? '#FFF8EA' : '#F8FBFF';
        const color = isBright && !isDark ? darkInk : lightInk;
        const secondaryColor = isBright && !isDark
          ? hexToRgba(color, 0.72)
          : hexToRgba(color, 0.84);
        const referenceColor = isBright && !isDark
          ? hexToRgba(color, 0.52)
          : hexToRgba(color, 0.66);
        const shadowColor = isBright && !isDark
          ? 'rgba(255,255,255,0.72)'
          : 'rgba(18,14,10,0.52)';
        const shadow = isComplex
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
            y: isComplex ? 3 : 2,
            blur: isComplex ? 16 : 10,
            color: shadowColor,
          },
          box: isComplex
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

  const buildAdaptiveAutoResult = async (data: any) => {
    const resultRatio = (data?.ratio || meta.ratio || '4:5') as Ratio;
    const base = getAutoTypography(data?.template || selectedTemplateId || 'T13');
    const typography = data?.image
      ? await analyzeBackgroundForTypography(data.image, base)
      : base;

    return {
      ...data,
      ratio: resultRatio,
      typography,
    };
  };

  const renderAutoPreview = () => {
    if (!autoResult) return null;
    const primaryFont = PREVIEW_FONT[autoResult.fonts.primary] || 'sans-serif';
    const secondaryFont = PREVIEW_FONT[autoResult.fonts.secondary] || 'sans-serif';
    const typography = autoResult.typography || getAutoTypography(autoResult.template);
    const previewRatio = autoResult.ratio || meta.ratio;

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

        const centerX = width / 2;
        const maxTextWidth = width * 0.76;
        const scale = width / 1000;
        const mainSize = Math.max(42, typography.editFontSize * 2.35 * scale);
        const subSize = Math.max(24, mainSize * 0.38);
        const refSize = Math.max(20, mainSize * 0.32);
        const mainLineHeight = mainSize * typography.lineHeight;
        const subLineHeight = subSize * 1.55;
        const refLineHeight = refSize * 1.35;
        const mainFont = `${typography.bold ? 700 : 500} ${mainSize}px ${primaryFont}`;
        const subFont = `400 ${subSize}px ${secondaryFont}`;
        const refFont = `400 ${refSize}px ${secondaryFont}`;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = mainFont;
        const mainLines = wrapPreviewText(ctx, autoResult.mainPhrase, maxTextWidth);
        ctx.font = subFont;
        const subLines = autoResult.secondaryPhrase ? wrapPreviewText(ctx, autoResult.secondaryPhrase, maxTextWidth * 0.82) : [];
        ctx.font = refFont;
        const refLines = autoResult.reference ? wrapPreviewText(ctx, autoResult.reference, maxTextWidth * 0.7) : [];
        const gap1 = subLines.length ? mainSize * 0.34 : 0;
        const gap2 = refLines.length ? mainSize * 0.18 : 0;
        const textHeight =
          mainLines.length * mainLineHeight +
          gap1 +
          subLines.length * subLineHeight +
          gap2 +
          refLines.length * refLineHeight;
        const startY = (height - textHeight) / 2;

        if (typography.box?.enabled) {
          const padding = typography.box.padding * 2.2 * scale;
          const boxW = maxTextWidth + padding * 2;
          const boxH = textHeight + padding * 2;
          ctx.fillStyle = hexToRgba(typography.box.color, typography.box.opacity / 100);
          ctx.beginPath();
          ctx.roundRect(centerX - boxW / 2, startY - padding, boxW, boxH, typography.box.radius * 2 * scale);
          ctx.fill();
        }

        ctx.shadowColor = typography.editShadow.color;
        ctx.shadowOffsetX = typography.editShadow.x * scale;
        ctx.shadowOffsetY = typography.editShadow.y * scale;
        ctx.shadowBlur = typography.editShadow.blur * scale;

        let y = startY;
        ctx.font = mainFont;
        ctx.fillStyle = typography.color;
        mainLines.forEach((line) => {
          ctx.fillText(line, centerX, y);
          y += mainLineHeight;
        });
        y += gap1;
        ctx.font = subFont;
        ctx.fillStyle = typography.secondaryColor;
        subLines.forEach((line) => {
          ctx.fillText(line, centerX, y);
          y += subLineHeight;
        });
        y += gap2;
        ctx.font = refFont;
        ctx.fillStyle = typography.referenceColor;
        refLines.forEach((line) => {
          ctx.fillText(line, centerX, y);
          y += refLineHeight;
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        // 핸드폰에도 저장 (보관함과 동시에)
        await downloadCardToDevice(dataUrl);
        await saveCard({
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          ratio: previewRatio,
          bg: autoResult.image,
          text: verseInput,
          ref: autoResult.reference || '',
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

    const handleRegenerate = async () => {
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
            templateIndex: nextIndex,
            cachedAnalysis: {
              mainPhrase: autoResult.mainPhrase,
              secondaryPhrase: autoResult.secondaryPhrase,
              reference: autoResult.reference,
              mood: autoResult.mood,
              templates: autoResult.recommendedTemplates,
              backgroundConcept: autoResult.backgroundConcept,
              visualMotifs: autoResult.visualMotifs,
              palette: autoResult.palette,
              lighting: autoResult.lighting,
              composition: autoResult.composition,
              typographyTone: autoResult.typographyTone,
              fontMood: autoResult.fontMood,
              avoidImagery: autoResult.avoidImagery,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: '오류' }));
          if (res.status === 429) { toast.error('API 요청 한도 초과'); return; }
          throw new Error(err.error || '생성 실패');
        }
        setAutoResult(await buildAdaptiveAutoResult(await res.json()));
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
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <div
                style={{
                  maxWidth: '88%',
                  borderRadius: typography.box?.enabled ? typography.box.radius : undefined,
                  padding: typography.box?.enabled ? typography.box.padding : undefined,
                  backgroundColor: typography.box?.enabled ? hexToRgba(typography.box.color, typography.box.opacity / 100) : undefined,
                  backdropFilter: typography.box?.enabled ? 'blur(2px)' : undefined,
                }}
              >
                <p style={{ fontFamily: primaryFont, fontSize: typography.mainSize, lineHeight: typography.lineHeight, color: typography.color, textShadow: typography.shadow, whiteSpace: 'pre-line', wordBreak: 'keep-all', fontWeight: typography.weight, letterSpacing: 0 }}>
                  {autoResult.mainPhrase}
                </p>
                {autoResult.secondaryPhrase && (
                  <p style={{ fontFamily: secondaryFont, fontSize: typography.subSize, marginTop: '0.8rem', color: typography.secondaryColor, textShadow: typography.shadow, wordBreak: 'keep-all', lineHeight: 1.55, letterSpacing: 0 }}>
                    {autoResult.secondaryPhrase}
                  </p>
                )}
                {autoResult.reference && (
                  <p style={{ fontFamily: secondaryFont, fontSize: typography.refSize, marginTop: '0.45rem', color: typography.referenceColor, textShadow: typography.shadow, letterSpacing: 0 }}>
                    {autoResult.reference}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="shrink-0 grid grid-cols-[1fr,0.72fr,1.35fr] gap-2 p-4 border-t bg-white">
          <button
            onClick={handleRegenerate}
            disabled={isGenerating || isSaving}
            className="flex-1 px-4 py-2 min-h-12 border border-[#1F1F1F] text-[#1F1F1F] rounded-xl font-medium disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {renderGenerationContent('regenerate', '다시 생성', '다시 만드는 중...', undefined, false)}
          </button>
          <button
            onClick={() => {
              applyPreviewEditState();
              setFlowStep('edit');
            }}
            disabled={isGenerating || isSaving}
            className="px-3 py-2 bg-white border border-[#D8D6D2] text-[#2E2E2E] rounded-xl font-medium disabled:opacity-40"
          >
            편집
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
        <RecordSelectorModal
          open={recordSelectorOpen}
          onClose={() => setRecordSelectorOpen(false)}
          records={availableRecords}
          onConfirm={analyzeSelectedRecord}
          onRefetch={fetchRecordsForSelector}
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
                console.log('🎨 Starting native canvas save...');
                
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
                  
                  console.log(`📐 Canvas size: ${width}x${height}`);
                  
                  // ===== STEP 1: Draw Background Color =====
                  ctx.fillStyle = meta.bgColor;
                  ctx.fillRect(0, 0, width, height);
                  console.log('✅ Background color drawn');
                  
                  // ===== STEP 2: Draw Background Image =====
                  if (meta.bgImageUrl) {
                    console.log('📦 Loading background image...');
                    
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    
                    await new Promise<void>((resolve, reject) => {
                      const timeout = setTimeout(() => {
                        console.warn('⚠️ Image load timeout');
                        resolve(); // Continue without image
                      }, 5000);
                      
                      img.onload = () => {
                        clearTimeout(timeout);
                        console.log('✅ Image loaded successfully');
                        
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
                          
                          console.log('✅ Background image drawn with user adjustments');
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
                    console.log('✍️ Drawing text...');
                    
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
                    
                    console.log(`✅ Text drawn (${allLines.length} lines)`);
                  }
                  
                  // ===== STEP 4: Convert to Data URL =====
                  console.log('📸 Converting to image...');
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                  
                  // Verify not blank
                  if (dataUrl.length < 1000) {
                    throw new Error('Generated image appears to be blank');
                  }
                  
                  console.log('✅ Image generated successfully');

                  // ===== STEP 5a: Save to Device (핸드폰에도 저장) =====
                  await downloadCardToDevice(dataUrl);

                  // ===== STEP 5: Save to Database =====
                  console.log('💾 Saving to database...');
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
                      id: Date.now().toString(),
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
                  
                  console.log('✅ Saved to database');
                  
                  // ===== STEP 6: Show Success =====
                  setSavedCardData({
                    imageDataUrl: dataUrl,
                    text: t.content,
                  });
                  setSaveSuccessOpen(true);
                  toast.success(isEditMode ? '카드가 업데이트되었어요!' : '카드가 저장되었어요!');
                  console.log('🎉 Save complete!');
                  
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

                {!meta.bgImageUrl && !t.content.trim() && !isEditing && !isBgEditMode && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center px-6 pointer-events-none">
                    <div className="w-full max-w-[280px] pointer-events-auto">
                      <div className="text-center text-white drop-shadow mb-4">
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
                  {/* 선택 시 Dashed Border */}
                  {!isEditing && !isBgEditMode && (
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

                  {/* 빈 상태 힌트 */}
                  {!isEditing && isTextEmpty ? (
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

                  {/* 코너 리사이즈 핸들 - 편집 모드와 배경 편집 모드가 아닐 때만 표시 */}
                  {!isEditing && !isBgEditMode && (
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
                className="p-2 -ml-2"
              >
                <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
              </button>
              <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
                배경 만들기
              </h1>
            </header>

            {/* Tabs (with TabsList inside) */}
            <Tabs value={bgTab} onValueChange={(v) => setBgTab(v as typeof bgTab)} className="flex-1 min-h-0 flex flex-col">
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
                        onClick={() => setSelectedStyle(style)}
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
                  <h2 className="text-[13px] font-semibold text-[#2E2E2E] mb-1.5">
                    2. 원하는 장면을 적어주세요
                  </h2>
                  <textarea
                    value={bgPrompt}
                    onChange={(e) => {
                      setBgPrompt(e.target.value);
                      setExpandedPrompt('');
                    }}
                    placeholder="예: 호수, 새벽 햇살, 어린양..."
                    className="w-full h-20 px-3 py-2.5 rounded-lg border border-[#E8E7E5] bg-white text-[#2E2E2E] text-[13px] resize-none focus:outline-none focus:border-[#1F1F1F] focus:ring-2 focus:ring-[#1F1F1F]/20"
                  />
                </section>

                {/* 확장된 프롬프트 확인 */}
                {expandedPrompt && (
                  <section>
                    <div className="flex items-center justify-between mb-1.5">
                      <h2 className="text-[13px] font-semibold text-[#2E2E2E]">
                        AI가 확장한 프롬프트
                      </h2>
                      <button
                        onClick={() => setExpandedPrompt('')}
                        className="text-[12px] text-[#1F1F1F] hover:text-[#333333] font-medium"
                      >
                        다시 작성
                      </button>
                    </div>
                    <div className="p-3 rounded-lg bg-white border-2 border-[#1F1F1F] shadow-sm">
                      <textarea
                        value={expandedPrompt}
                        onChange={(e) => setExpandedPrompt(e.target.value)}
                        placeholder="프롬프트를 자유롭게 수정하세요..."
                        className="w-full h-24 bg-transparent text-[#2E2E2E] text-[13px] leading-relaxed resize-none focus:outline-none placeholder:text-[#ACACAC]"
                      />
                    </div>
                  </section>
                )}

                {/* 내 기록으로 배경 만들기 */}
                <button
                  onClick={openRecordSelector}
                  disabled={isGenerating || isExpandingPrompt}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#E8E7E5] bg-[#F9F8F6] hover:bg-[#F3F2F1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                      <Upload className="w-3.5 h-3.5 text-[#1F1F1F]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-[12px] font-semibold text-[#2E2E2E]">
                        내 기록으로 배경 만들기
                      </h3>
                      <p className="text-[10px] text-[#7E7C78]">
                        최근 Q.T·기도·감사 기록 기반
                      </p>
                    </div>
                  </div>
                     <ChevronLeft className="w-4 h-4 text-[#D1D0CE] rotate-180" />
                   </button>

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
                  {!expandedPrompt ? (
                    <Button
                      onClick={expandPrompt}
                      disabled={isExpandingPrompt || (!bgPrompt.trim() && !selectedStyle)}
                      className="w-full min-h-11 py-2 bg-[#1F1F1F] hover:bg-[#333333] text-white rounded-xl text-[14px] font-medium"
                    >
                      {renderGenerationContent('prompt', '프롬프트 미리보기', '프롬프트 만드는 중...', <Wand2 className="w-4 h-4 mr-2" />)}
                    </Button>
                  ) : meta.bgImageUrl && bgTab === 'ai' ? (
                    <Button
                      onClick={() => setBgOpen(false)}
                      className="w-full h-11 bg-[#1F1F1F] hover:bg-[#333333] text-white rounded-xl text-[14px] font-medium"
                    >
                      완료
                    </Button>
                  ) : (
                    <Button
                      onClick={generateBackground}
                      disabled={isGenerating}
                      className="w-full min-h-11 py-2 bg-[#1F1F1F] hover:bg-[#333333] text-white rounded-xl text-[14px] font-medium"
                    >
                      {renderGenerationContent('background', '배경 이미지 생성하기', '이미지 생성 중...', <Wand2 className="w-4 h-4 mr-2" />)}
                    </Button>
                  )}
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

      {/* Login Modal */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        callbackUrl={loginCallbackUrl}
        title="로그인이 필요해요"
        description="카드를 만들고 저장하려면 먼저 로그인해주세요."
      />

      {/* Record Selector Modal */}
      <RecordSelectorModal 
        open={recordSelectorOpen}
        onClose={() => {
          console.log('🚪 Closing modal');
          setRecordSelectorOpen(false);
        }}
        records={availableRecords}
        onConfirm={analyzeSelectedRecord}
        onRefetch={fetchRecordsForSelector}
      />

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
  t, setT, meta, setMeta, onPanelOpen, onOpenFontPicker
}:{
  active: 'text'|'font'|'color'|'size';
  setActive: (a:any)=>void;
  t: TextStyle; setT: React.Dispatch<React.SetStateAction<TextStyle>>;
  meta: Meta; setMeta: React.Dispatch<React.SetStateAction<Meta>>;
  onPanelOpen?: () => void;
  onOpenFontPicker?: () => void;
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
                console.log('Font button clicked');
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
