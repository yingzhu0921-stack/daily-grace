export const routes = {
  home: '/',
  today: '/today',
  calendar: '/calendar',
  search: '/search',

  records: '/records',
  qt: '/meditation',
  prayer: '/prayer',
  thanks: '/gratitude',
  diary: '/diary',
  
  meditationNew: '/meditation/new',
  prayerNew: '/prayer/new',
  gratitudeNew: '/gratitude/new',
  diaryNew: '/diary/new',
  
  cardsVault: '/cards/vault',
  cardDesigner: '/cards/designer',
  
  settings: '/settings',
  profileEdit: '/settings/account',
  notificationSettings: '/settings/notifications',
  help: '/help',
  auth: '/auth',
} as const;

export type RouteKey = keyof typeof routes;
