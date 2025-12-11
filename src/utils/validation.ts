import { z } from 'zod';

// Meditation note validation schema
export const meditationSchema = z.object({
  title: z.string().max(200, '제목은 200자 이하로 입력해주세요'),
  passage: z.string().max(2000, '본문은 2000자 이하로 입력해주세요'),
  content: z.string().max(5000, '내용은 5000자 이하로 입력해주세요'),
  application: z.string().max(2000, '적용은 2000자 이하로 입력해주세요'),
});

// Diary entry validation schema
export const diarySchema = z.object({
  content: z.string()
    .trim()
    .min(1, '내용을 입력해주세요')
    .max(10000, '일기는 10000자 이하로 입력해주세요'),
});

// Gratitude entry validation schema
export const gratitudeItemSchema = z.string()
  .trim()
  .min(1, '감사 항목을 입력해주세요')
  .max(200, '감사 항목은 200자 이하로 입력해주세요');

export const gratitudeSchema = z.object({
  items: z.array(gratitudeItemSchema)
    .min(1, '최소 1개 이상의 감사 항목을 입력해주세요')
    .max(20, '감사 항목은 20개까지 입력 가능합니다'),
});

// Prayer note validation schema
export const prayerSchema = z.object({
  title: z.string()
    .trim()
    .min(1, '기도 제목을 입력해주세요')
    .max(500, '기도 제목은 500자 이하로 입력해주세요'),
  content: z.string()
    .trim()
    .min(1, '기도 내용을 입력해주세요')
    .max(2000, '기도 내용은 2000자 이하로 입력해주세요'),
});
