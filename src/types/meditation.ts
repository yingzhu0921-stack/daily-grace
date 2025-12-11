export interface MeditationNote {
  id: string;
  title: string;
  passage: string;
  content: string;
  application: string;
  applyChecked?: boolean;
  applyCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
  fullText?: string;
}

export interface MeditationDraft {
  id: string;
  content: string;
  updatedAt: string;
}
