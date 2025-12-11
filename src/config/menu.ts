import { routes, RouteKey } from './routes';
import { IconName } from '@/components/ui/AppIcon';

export type MenuItem = {
  label: string;
  icon: IconName;
  route?: RouteKey;
  indent?: boolean;
  accent?: boolean;
  requiresAuth?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  iconColor?: string;
  divider?: boolean;
};

export const drawerMenu: MenuItem[] = [
  // 메인
  { label: '홈', icon: 'home', route: 'home', highlighted: true },
  { label: '캘린더', icon: 'calendar', route: 'calendar' },

  { divider: true, label: '', icon: 'home' },

  // 기록 허브
  { label: '전체 기록', icon: 'book', route: 'records' },
  { label: '말씀카드', icon: 'image', route: 'cardsVault' },
  { label: '검색', icon: 'search', route: 'search' },

  { divider: true, label: '', icon: 'home' },

  // 관리
  { label: '카테고리 관리', icon: 'plus' },
  { label: '설정', icon: 'settings', route: 'settings' },
];
