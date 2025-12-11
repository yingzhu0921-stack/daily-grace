export interface ApplicationItem {
  text: string;
  checked: boolean;
}

export interface MeditationNote {
  id: string;
  title: string;
  passage: string;
  content: string;
  application: string;
  applications?: ApplicationItem[]; // 새로운 배열 형식
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
