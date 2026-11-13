import React from 'react';

/**
 * 하루은혜 선 아이콘 (2026-11-13 UI 개편 시안 3).
 * 24px 격자, 굵고 둥근 선 + 필요한 곳만 한 부분 채움. 얼굴 없이(사용자 결정).
 * 모양은 직접 그렸다 — 외부 아이콘 세트를 가져오지 않았다.
 *
 * 문자열은 이 파일 안의 고정값만 쓴다(사용자 입력이 들어가지 않는다).
 */
const F = 'fill="currentColor"';

export const LINE_ICONS = {
  // 신앙
  book: '<path d="M3 6.2c3-1.1 6-.8 9 1.3v12.3c-3-2-6-2.3-9-1.2z"/><path d="M21 6.2c-3-1.1-6-.8-9 1.3v12.3c3-2 6-2.3 9-1.2z"/>',
  bible: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M5 17.2h14"/><path d="M12 6.8v6.4M9.4 9h5.2"/>',
  hands: '<path d="M12 3.4C10.4 4.6 9.2 6.9 8.8 9.4L8.3 12.6C8.1 13.9 7.5 15 6.6 15.9L5.6 17L8.6 20L12 16.8L15.4 20L18.4 17L17.4 15.9C16.5 15 15.9 13.9 15.7 12.6L15.2 9.4C14.8 6.9 13.6 4.6 12 3.4Z"/><path d="M12 3.4V16.8"/><path d="M4.3 18.3L7.3 21.3M19.7 18.3L16.7 21.3"/>',
  cross: '<path d="M10.4 3.5h3.2v5.1h4.9v3.2h-4.9v8.7h-3.2v-8.7H5.5V8.6h4.9z"/>',
  church: '<path d="M12 2.5v4M10.3 4.3h3.4"/><path d="M5 21V11.5l7-5 7 5V21z"/><path d="M10 21v-3.6a2 2 0 0 1 4 0V21"/>',
  candle: `<rect x="8" y="11" width="8" height="9" rx="1.6"/><path d="M5.5 20.5h13"/><path d="M12 8.6c-2-1.3-2.1-3.4 0-5.8 2.1 2.4 2 4.5 0 5.8z" ${F}/>`,
  bubble: `<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z"/><path d="M12 13.6l-2.6-2.5a1.6 1.6 0 0 1 2.3-2.3l.3.3.3-.3a1.6 1.6 0 0 1 2.3 2.3z" ${F}/>`,
  sprout: '<path d="M12 21v-8"/><path d="M12 13c0-3.4 2.4-5.8 6-5.8 0 3.4-2.4 5.8-6 5.8z"/><path d="M12 13c0-3.4-2.4-5.8-6-5.8 0 3.4 2.4 5.8 6 5.8z"/>',
  card: '<rect x="4" y="2.8" width="16" height="18.4" rx="3.2"/><path d="M12 17.2v-4.6"/><path d="M12 12.6c0-2.4 1.7-4.1 4.2-4.1 0 2.4-1.7 4.1-4.2 4.1z"/><path d="M12 12.6c0-2.4-1.7-4.1-4.2-4.1 0 2.4 1.7 4.1 4.2 4.1z"/>',
  // 마음·자연
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
  smile: `<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="10.5" r="1.1" ${F} stroke="none"/><circle cx="15" cy="10.5" r="1.1" ${F} stroke="none"/><path d="M8.8 14.2c1.8 2 4.6 2 6.4 0"/>`,
  star: '<path d="M12 3.5l2.5 5.2 5.6.8-4 4 1 5.6L12 16.5l-5.1 2.6 1-5.6-4-4 5.6-.8z"/>',
  sparkle: `<path d="M11 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" ${F}/><path d="M18.5 15.5v4M16.5 17.5h4"/>`,
  sun: `<circle cx="12" cy="12" r="4.2" ${F}/><path d="M12 2.8v1.8M12 19.4v1.8M2.8 12h1.8M19.4 12h1.8M5.5 5.5l1.3 1.3M17.2 17.2l1.3 1.3M18.5 5.5l-1.3 1.3M6.8 17.2l-1.3 1.3"/>`,
  moon: '<path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z"/><path d="M16.5 4v3M15 5.5h3"/>',
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 7 9.5a4.5 4.5 0 0 0 0 9z"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/><path d="M9.4 14.6a2.7 2.7 0 0 0 2.4 2.6"/>',
  flower: `<circle cx="12" cy="7" r="2.8"/><circle cx="17" cy="12" r="2.8"/><circle cx="12" cy="17" r="2.8"/><circle cx="7" cy="12" r="2.8"/><circle cx="12" cy="12" r="2.1" ${F}/>`,
  leaf: '<path d="M12 3.5c4.5 3 6.5 6.5 6.5 9.8a6.5 6.5 0 0 1-13 0c0-3.3 2-6.8 6.5-9.8z"/><path d="M12 9.5v11.3"/>',
  tree: `<path d="M12 21v-6"/><path d="M12 3.5c3.5 0 6 2.6 6 5.8 0 3.2-2.7 5.7-6 5.7s-6-2.5-6-5.7c0-3.2 2.5-5.8 6-5.8z" ${F}/>`,
  mountain: '<path d="M3 19.5l6-10 4 6 2.5-3.5 5.5 7.5z"/>',
  // 생활
  coffee: '<path d="M5 9h11v5.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5z"/><path d="M16 10.5h1.3a2.5 2.5 0 0 1 0 5H16"/><path d="M9 3.5c-.8 1 .8 2 0 3M12.5 3.5c-.8 1 .8 2 0 3"/>',
  bowl: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M8.5 4.2c-.8 1.2.8 2.4 0 3.6M12 3.6c-.8 1.2.8 2.4 0 3.6M15.5 4.2c-.8 1.2.8 2.4 0 3.6"/>',
  music: `<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.8" cy="17.5" r="2.3" ${F}/><circle cx="16.8" cy="15.5" r="2.3" ${F}/>`,
  headphones: `<path d="M4.5 15v-2.5a7.5 7.5 0 0 1 15 0V15"/><rect x="3.5" y="14" width="4" height="6.2" rx="1.6" ${F}/><rect x="16.5" y="14" width="4" height="6.2" rx="1.6" ${F}/>`,
  camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8.5 7l1.4-2.6h4.2L15.5 7"/><circle cx="12" cy="13.4" r="3.3"/>',
  image: `<rect x="3.5" y="4.5" width="17" height="15" rx="2.6"/><path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5"/><circle cx="15.5" cy="9" r="1.6" ${F} stroke="none"/>`,
  palette: `<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.9 1.4-2-.5-1.3.4-2.5 1.7-2.5H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9z"/><circle cx="8" cy="11" r="1.3" ${F} stroke="none"/><circle cx="10.5" cy="7.4" r="1.3" ${F} stroke="none"/><circle cx="15" cy="7.8" r="1.3" ${F} stroke="none"/>`,
  gift: `<rect x="4" y="9" width="16" height="4" rx="1"/><path d="M5.5 13v6.5A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V13"/><path d="M12 9v12"/><path d="M12 9C10 5 6.8 5.5 7.6 7.6 8.2 9 12 9 12 9zM12 9c2-4 5.2-3.5 4.4-1.4C15.8 9 12 9 12 9z" ${F}/>`,
  wallet: `<rect x="3.5" y="6.5" width="17" height="13" rx="2.6"/><path d="M3.5 10.5h17"/><circle cx="16.5" cy="14.8" r="1.3" ${F} stroke="none"/>`,
  paw: `<circle cx="6.8" cy="10" r="1.8" ${F} stroke="none"/><circle cx="10" cy="6.6" r="1.8" ${F} stroke="none"/><circle cx="14" cy="6.6" r="1.8" ${F} stroke="none"/><circle cx="17.2" cy="10" r="1.8" ${F} stroke="none"/><path d="M12 11.5c2.6 0 4.6 2.6 4.6 4.8 0 1.6-1.2 2.4-2.6 2.4-.8 0-1.3-.4-2-.4s-1.2.4-2 .4c-1.4 0-2.6-.8-2.6-2.4 0-2.2 2-4.8 4.6-4.8z"/>`,
  people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9" r="2.4"/><path d="M16 14.2a4.6 4.6 0 0 1 5 4.6"/>',
  anchor: '<circle cx="12" cy="5.5" r="2"/><path d="M12 7.5v13M8.5 11h7"/><path d="M4.5 13.5c0 4 3.4 7 7.5 7s7.5-3 7.5-7"/>',
  // 활동·기록
  pencil: `<path d="M14.6 5.6l3.8 3.8L9 18.8l-4.6.8.8-4.6z"/><path d="M14.6 5.6l1.7-1.7a1.6 1.6 0 0 1 2.2 0l1.6 1.6a1.6 1.6 0 0 1 0 2.2l-1.7 1.7z" ${F}/>`,
  note: '<rect x="5" y="3.5" width="14" height="17" rx="2.4"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>',
  bookmark: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
  calendar: `<rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 10h17M8 3v4M16 3v4"/><rect x="13.5" y="13.5" width="3" height="3" rx=".6" ${F} stroke="none"/>`,
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  target: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.6" ${F}/>`,
  flag: `<path d="M5 21V4"/><path d="M5 4.5h11.5l-2 4 2 4H5" ${F}/>`,
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4"/>',
  dumbbell: '<path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11"/>',
  foot: `<path d="M8 3.5c2 0 3 2.2 3 4.8S9.8 12.5 8 12.5 5 11 5 8.3 6 3.5 8 3.5z"/><path d="M6.3 14.6h3.4v1.4a1.7 1.7 0 0 1-3.4 0z" ${F}/><path d="M16 7.5c2 0 3 2.2 3 4.8s-1.2 4.2-3 4.2-3-1.5-3-4.2 1-4.8 3-4.8z"/><path d="M14.3 18.6h3.4v.4a1.7 1.7 0 0 1-3.4 0z" ${F}/>`,
  plane: '<path d="M3 13.5l18-8-5 15-3.5-6.2z"/><path d="M12.5 14.3l8.5-8.8"/>',
  pin: `<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3" ${F}/>`,
  bulb: '<path d="M9 17.5h6M10 20.5h4"/><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.3v1.9h6v-1.9c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3.5z"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  // 화면용
  home: '<path d="M4 10.6l8-6.8 8 6.8v8.6a1.8 1.8 0 0 1-1.8 1.8H14v-5.4h-4V21H5.8A1.8 1.8 0 0 1 4 19.2z"/>',
  homeOn: `<path d="M4 10.6l8-6.8 8 6.8v8.6a1.8 1.8 0 0 1-1.8 1.8H14v-5.4h-4V21H5.8A1.8 1.8 0 0 1 4 19.2z" ${F}/>`,
  box: '<rect x="3" y="4" width="18" height="4.4" rx="1.4"/><path d="M4.6 8.4v10a2.4 2.4 0 0 0 2.4 2.4h10a2.4 2.4 0 0 0 2.4-2.4v-10"/><path d="M10 12.4h4"/>',
  boxOn: `<rect x="3" y="4" width="18" height="4.4" rx="1.4" ${F}/><path d="M4.6 8.4v10a2.4 2.4 0 0 0 2.4 2.4h10a2.4 2.4 0 0 0 2.4-2.4v-10" ${F}/><path d="M10 12.4h4" stroke="#F6F3EC"/>`,
  settings: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.6"/><circle cx="8" cy="17" r="2.6"/>',
  search: '<circle cx="11" cy="11" r="6.4"/><path d="M16 16l4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 4v10.5M7.5 10l4.5 4.5 4.5-4.5M5 19.5h14"/>',
  share: '<path d="M12 14.5V4M7.8 8.2L12 4l4.2 4.2M5 12.5v6a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6v-6"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.6h5V7M6.5 7l1 12.6a1.6 1.6 0 0 0 1.6 1.4h5.8a1.6 1.6 0 0 0 1.6-1.4l1-12.6"/>',
  check: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7.5 12.3l3 3 6-6.3" stroke="#fff" stroke-width="2.4"/>',
} as const;

export type LineIconName = keyof typeof LINE_ICONS;

export function isLineIconName(name: string): name is LineIconName {
  return Object.prototype.hasOwnProperty.call(LINE_ICONS, name);
}

interface LineIconProps {
  name: LineIconName;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const LineIcon: React.FC<LineIconProps> = ({ name, size = 24, color = 'currentColor', className = '', strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    style={{ color, flex: 'none' }}
    aria-hidden="true"
  >
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: LINE_ICONS[name] }}
    />
  </svg>
);
