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
  LucideIcon,
} from 'lucide-react';
import { PrayingHandsIcon } from './PrayingHandsIcon';

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
  | 'prayingHands';

type LucideIconName = Exclude<IconName, 'prayingHands'>;

const iconMap: Record<LucideIconName, LucideIcon> = {
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
  strokeWidth = 1.75,
}) => {
  // Handle custom icon
  if (name === 'prayingHands') {
    return (
      <PrayingHandsIcon
        size={size}
        className={className}
        color={color}
        strokeWidth={strokeWidth}
      />
    );
  }

  const Icon = iconMap[name];

  if (!Icon) {
    return null;
  }

  return (
    <Icon
      size={size}
      className={className}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};
