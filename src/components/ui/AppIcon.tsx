import React from 'react';
import {
  Home,
  Sun,
  Calendar,
  Search,
  Book,
  BookOpen,
  Heart,
  Sparkles,
  PencilLine,
  Image,
  Plus,
  Download,
  Upload,
  Bell,
  Settings,
  HelpCircle,
  Palette,
  Star,
  Moon,
  Cloud,
  Music,
  Gift,
  Lightbulb,
  Target,
  Flag,
  Anchor,
  Award,
  Coffee,
  Flower,
  Hand,
  ArrowRight,
  Archive,
  LucideIcon,
} from 'lucide-react';
import { LineIcon, isLineIconName, type LineIconName } from './LineIcon';

export type IconName =
  | 'home'
  | 'sun'
  | 'calendar'
  | 'search'
  | 'book'
  | 'bookOpen'
  | 'heart'
  | 'sparkles'
  | 'pencilLine'
  | 'image'
  | 'plus'
  | 'download'
  | 'upload'
  | 'bell'
  | 'settings'
  | 'helpCircle'
  | 'palette'
  | 'star'
  | 'moon'
  | 'cloud'
  | 'music'
  | 'gift'
  | 'lightbulb'
  | 'target'
  | 'flag'
  | 'anchor'
  | 'award'
  | 'coffee'
  | 'flower'
  | 'hand'
  | 'arrowRight'
  | 'archive'
  | 'prayingHands'
  | LineIconName;


/**
 * 2026-11-13 UI 개편: 앱 아이콘을 하루은혜 선 아이콘(LineIcon)으로 바꾼다.
 * 저장된 카테고리 아이콘 이름(bookOpen 등)은 그대로 두고, 그림만 새 선 아이콘으로 이어 준다.
 */
const LEGACY_TO_LINE: Partial<Record<string, LineIconName>> = {
  bookOpen: 'book',
  book: 'bible',
  sparkles: 'sparkle',
  pencilLine: 'pencil',
  upload: 'share',
  lightbulb: 'bulb',
  award: 'trophy',
  hand: 'hands',
  prayingHands: 'hands',
  archive: 'box',
};

const iconMap: Partial<Record<string, LucideIcon>> = {
  home: Home,
  sun: Sun,
  calendar: Calendar,
  search: Search,
  book: Book,
  bookOpen: BookOpen,
  heart: Heart,
  sparkles: Sparkles,
  pencilLine: PencilLine,
  image: Image,
  plus: Plus,
  download: Download,
  upload: Upload,
  bell: Bell,
  settings: Settings,
  helpCircle: HelpCircle,
  palette: Palette,
  star: Star,
  moon: Moon,
  cloud: Cloud,
  music: Music,
  gift: Gift,
  lightbulb: Lightbulb,
  target: Target,
  flag: Flag,
  anchor: Anchor,
  award: Award,
  coffee: Coffee,
  flower: Flower,
  hand: Hand,
  arrowRight: ArrowRight,
  archive: Archive,
};

interface AppIconProps {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 24,
  className = '',
  color = 'currentColor',
}) => {
  const line = LEGACY_TO_LINE[name] ?? (isLineIconName(name) ? name : undefined);
  if (line) {
    return <LineIcon name={line} size={size} className={className} color={color} />;
  }

  const Icon = iconMap[name];
  if (!Icon) {
    return null;
  }
  return <Icon size={size} className={className} color={color} strokeWidth={2} />;
};
