export type PrayerNote = {
  id: string;
  title: string;
  content: string;
  answered: boolean;
  answeredAt: string | null;
  answeredDetail?: string;
  createdAt: string;
  updatedAt: string;
};
