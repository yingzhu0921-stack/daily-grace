/**
 * 사용자 데이터 백업/내보내기 유틸리티
 */

import { getAllCards } from './verseCardDB';
import * as meditationStorage from './meditationStorage';
import * as prayerStorage from './prayerStorage';
import * as gratitudeStorage from './gratitudeStorage';
import * as diaryStorage from './diaryStorage';
import * as categoryStorage from './categoryStorage';
import * as XLSX from 'xlsx';

export interface BackupData {
  exportDate: string;
  version: string;
  user: {
    email: string;
    id: string;
  };
  data: {
    meditations: any[];
    prayers: any[];
    gratitudes: any[];
    diaries: any[];
    categories: any[];
    customRecords: any[];
    verseCards: any[];
  };
}

function readLocalArray(key: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

async function getCurrentUser() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

function toExportRecord(record: any) {
  return {
    ...record,
    created_at: record.created_at || record.createdAt,
    updated_at: record.updated_at || record.updatedAt,
  };
}

/**
 * 모든 사용자 데이터를 JSON으로 내보내기
 */
export async function exportAllData(): Promise<BackupData> {
  const user = await getCurrentUser();
  const categories = await categoryStorage.list();
  const verseCards = await getAllCards();

  const backupData: BackupData = {
    exportDate: new Date().toISOString(),
    version: '1.0.0',
    user: {
      email: user?.email || '',
      id: user?.id || '',
    },
    data: {
      meditations: meditationStorage.list().map(toExportRecord),
      prayers: prayerStorage.list().map(toExportRecord),
      gratitudes: gratitudeStorage.list().map(toExportRecord),
      diaries: diaryStorage.listAll().map(toExportRecord),
      categories: categories.map(toExportRecord),
      customRecords: readLocalArray('custom_records').map(toExportRecord),
      verseCards,
    },
  };

  return backupData;
}

/**
 * 백업 데이터를 JSON 파일로 다운로드
 */
export async function downloadBackup(): Promise<void> {
  const backupData = await exportAllData();

  // JSON 문자열로 변환 (보기 좋게 포맷팅)
  const jsonStr = JSON.stringify(backupData, null, 2);

  // Blob 생성
  const blob = new Blob([jsonStr], { type: 'application/json' });

  // 다운로드 링크 생성
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // 파일명: dailygrace-backup-2024-01-15.json
  const date = new Date().toISOString().split('T')[0];
  link.download = `dailygrace-backup-${date}.json`;

  // 다운로드 실행
  document.body.appendChild(link);
  link.click();

  // 정리
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 백업 데이터 통계 가져오기
 */
export async function getBackupStats() {
  const backupData = await exportAllData();

  return {
    totalRecords:
      backupData.data.meditations.length +
      backupData.data.prayers.length +
      backupData.data.gratitudes.length +
      backupData.data.diaries.length +
      backupData.data.customRecords.length +
      backupData.data.verseCards.length,
    meditations: backupData.data.meditations.length,
    prayers: backupData.data.prayers.length,
    gratitudes: backupData.data.gratitudes.length,
    diaries: backupData.data.diaries.length,
    customRecords: backupData.data.customRecords.length,
    verseCards: backupData.data.verseCards.length,
    categories: backupData.data.categories.length,
  };
}

/**
 * Excel 형식으로 다운로드
 */
export async function downloadAsExcel(): Promise<void> {
  const backupData = await exportAllData();
  const date = new Date().toISOString().split('T')[0];

  // 워크북 생성
  const wb = XLSX.utils.book_new();

  // Q.T 노트 시트
  if (backupData.data.meditations.length > 0) {
    const meditationData = backupData.data.meditations.map((m: any) => ({
      작성일: new Date(m.created_at).toLocaleDateString('ko-KR'),
      제목: m.title,
      본문: m.passage || '',
      묵상내용: m.content,
      적용사항: m.application || '',
      적용완료: m.apply_checked ? '완료' : '미완료',
    }));
    const ws = XLSX.utils.json_to_sheet(meditationData);
    XLSX.utils.book_append_sheet(wb, ws, 'Q.T');
  }

  // 기도 제목 시트
  if (backupData.data.prayers.length > 0) {
    const prayerData = backupData.data.prayers.map((p: any) => ({
      작성일: new Date(p.created_at).toLocaleDateString('ko-KR'),
      제목: p.title,
      내용: p.content,
      응답여부: p.answered ? '응답됨' : '기도중',
      응답일: p.answered_at ? new Date(p.answered_at).toLocaleDateString('ko-KR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(prayerData);
    XLSX.utils.book_append_sheet(wb, ws, '기도');
  }

  // 감사 노트 시트
  if (backupData.data.gratitudes.length > 0) {
    const gratitudeData = backupData.data.gratitudes.map((g: any) => ({
      작성일: new Date(g.created_at).toLocaleDateString('ko-KR'),
      감사목록: g.items.join(', '),
    }));
    const ws = XLSX.utils.json_to_sheet(gratitudeData);
    XLSX.utils.book_append_sheet(wb, ws, '감사');
  }

  // 일기 시트
  if (backupData.data.diaries.length > 0) {
    const diaryData = backupData.data.diaries.map((d: any) => ({
      작성일: new Date(d.created_at).toLocaleDateString('ko-KR'),
      내용: d.content,
    }));
    const ws = XLSX.utils.json_to_sheet(diaryData);
    XLSX.utils.book_append_sheet(wb, ws, '일기');
  }

  // 커스텀 레코드 시트
  if (backupData.data.customRecords.length > 0) {
    const customData = backupData.data.customRecords.map((r: any) => ({
      작성일: new Date(r.created_at).toLocaleDateString('ko-KR'),
      카테고리ID: r.category_id,
      데이터: JSON.stringify(r.data, null, 2),
    }));
    const ws = XLSX.utils.json_to_sheet(customData);
    XLSX.utils.book_append_sheet(wb, ws, '커스텀기록');
  }

  // 파일 다운로드
  XLSX.writeFile(wb, `dailygrace-backup-${date}.xlsx`);
}

/**
 * CSV 형식으로 다운로드 (모든 데이터를 하나의 CSV로)
 */
export async function downloadAsCSV(): Promise<void> {
  const backupData = await exportAllData();
  const date = new Date().toISOString().split('T')[0];

  // 모든 데이터를 하나의 배열로 합치기
  const allRecords: any[] = [];

  backupData.data.meditations.forEach((m: any) => {
    allRecords.push({
      카테고리: 'Q.T',
      작성일: new Date(m.created_at).toLocaleDateString('ko-KR'),
      제목: m.title,
      내용: m.content,
      추가정보: `본문: ${m.passage || ''}, 적용: ${m.application || ''}`,
    });
  });

  backupData.data.prayers.forEach((p: any) => {
    allRecords.push({
      카테고리: '기도',
      작성일: new Date(p.created_at).toLocaleDateString('ko-KR'),
      제목: p.title,
      내용: p.content,
      추가정보: p.answered ? '응답됨' : '기도중',
    });
  });

  backupData.data.gratitudes.forEach((g: any) => {
    allRecords.push({
      카테고리: '감사',
      작성일: new Date(g.created_at).toLocaleDateString('ko-KR'),
      제목: '감사 목록',
      내용: g.items.join(', '),
      추가정보: '',
    });
  });

  backupData.data.diaries.forEach((d: any) => {
    allRecords.push({
      카테고리: '일기',
      작성일: new Date(d.created_at).toLocaleDateString('ko-KR'),
      제목: '일기',
      내용: d.content,
      추가정보: '',
    });
  });

  // CSV 생성
  const ws = XLSX.utils.json_to_sheet(allRecords);
  const csv = XLSX.utils.sheet_to_csv(ws);

  // 다운로드
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM 추가
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dailygrace-backup-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 텍스트 형식으로 다운로드
 */
export async function downloadAsText(): Promise<void> {
  const backupData = await exportAllData();
  const date = new Date().toISOString().split('T')[0];

  let text = `Daily Grace 백업\n`;
  text += `내보내기 날짜: ${new Date(backupData.exportDate).toLocaleString('ko-KR')}\n`;
  text += `사용자: ${backupData.user.email}\n`;
  text += `\n${'='.repeat(60)}\n\n`;

  // Q.T 노트
  if (backupData.data.meditations.length > 0) {
    text += `📖 Q.T 노트 (${backupData.data.meditations.length}개)\n`;
    text += `${'='.repeat(60)}\n\n`;
    backupData.data.meditations.forEach((m: any, i: number) => {
      text += `[${i + 1}] ${m.title}\n`;
      text += `작성일: ${new Date(m.created_at).toLocaleString('ko-KR')}\n`;
      if (m.passage) text += `본문: ${m.passage}\n`;
      text += `묵상:\n${m.content}\n`;
      if (m.application) text += `적용: ${m.application}\n`;
      text += `\n${'-'.repeat(40)}\n\n`;
    });
  }

  // 기도 제목
  if (backupData.data.prayers.length > 0) {
    text += `🙏 기도 제목 (${backupData.data.prayers.length}개)\n`;
    text += `${'='.repeat(60)}\n\n`;
    backupData.data.prayers.forEach((p: any, i: number) => {
      text += `[${i + 1}] ${p.title}\n`;
      text += `작성일: ${new Date(p.created_at).toLocaleString('ko-KR')}\n`;
      text += `${p.content}\n`;
      text += `상태: ${p.answered ? '응답됨' : '기도중'}\n`;
      if (p.answered_at) text += `응답일: ${new Date(p.answered_at).toLocaleString('ko-KR')}\n`;
      text += `\n${'-'.repeat(40)}\n\n`;
    });
  }

  // 감사 노트
  if (backupData.data.gratitudes.length > 0) {
    text += `✨ 감사 노트 (${backupData.data.gratitudes.length}개)\n`;
    text += `${'='.repeat(60)}\n\n`;
    backupData.data.gratitudes.forEach((g: any, i: number) => {
      text += `[${i + 1}] ${new Date(g.created_at).toLocaleDateString('ko-KR')}\n`;
      g.items.forEach((item: string, idx: number) => {
        text += `  ${idx + 1}. ${item}\n`;
      });
      text += `\n${'-'.repeat(40)}\n\n`;
    });
  }

  // 일기
  if (backupData.data.diaries.length > 0) {
    text += `📝 일기 (${backupData.data.diaries.length}개)\n`;
    text += `${'='.repeat(60)}\n\n`;
    backupData.data.diaries.forEach((d: any, i: number) => {
      text += `[${i + 1}] ${new Date(d.created_at).toLocaleDateString('ko-KR')}\n`;
      text += `${d.content}\n`;
      text += `\n${'-'.repeat(40)}\n\n`;
    });
  }

  // 다운로드
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dailygrace-backup-${date}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type ExportFormat = 'json' | 'excel' | 'csv' | 'text';

/**
 * 선택한 형식으로 다운로드
 */
export async function downloadInFormat(format: ExportFormat): Promise<void> {
  switch (format) {
    case 'json':
      return downloadBackup();
    case 'excel':
      return downloadAsExcel();
    case 'csv':
      return downloadAsCSV();
    case 'text':
      return downloadAsText();
    default:
      throw new Error('Unknown format');
  }
}
