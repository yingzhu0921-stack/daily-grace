import type { UnifiedRecord } from './recordsQuery';
import { remove as removeMeditation } from './meditationStorage';
import { remove as removePrayer } from './prayerStorage';
import { remove as removeGratitude } from './gratitudeStorage';
import { remove as removeDiary } from './diaryStorage';
import { deleteCustomRecord } from './customRecordSync';

/**
 * 보관함·홈·캘린더처럼 여러 종류 기록이 섞인 목록에서 '수정'과 '삭제'를 한 곳에서 처리한다.
 * 종류별 목록 화면은 각자 자기 저장소를 쓰지만, 섞인 목록은 기록마다 갈 곳이 달라서 따로 모은다.
 */
type RecordRef = Pick<UnifiedRecord, 'id' | 'type' | 'categoryId'>;

/** 수정 화면 주소. */
export function recordEditPath(record: RecordRef): string {
  switch (record.type) {
    case 'meditation': return `/meditation/${record.id}/edit`;
    case 'prayer': return `/prayer/${record.id}/edit`;
    case 'gratitude': return `/gratitude/${record.id}/edit`;
    case 'diary': return `/diary/${record.id}/edit`;
    default: return `/custom/${record.categoryId || record.type}/edit/${record.id}`;
  }
}

/**
 * 기록을 지운다. 종류별 저장소의 remove 를 그대로 쓴다 — 로컬 삭제 표시와 서버 삭제까지 거기서 한다.
 * 커스텀 기록은 customRecordSync.deleteCustomRecord — 삭제 표시를 남기고 서버에 바로 보낸다.
 */
export async function deleteRecord(record: RecordRef): Promise<void> {
  switch (record.type) {
    case 'meditation': return removeMeditation(record.id);
    case 'prayer': return removePrayer(record.id);
    case 'gratitude': return removeGratitude(record.id);
    case 'diary': return removeDiary(record.id);
    default: return deleteCustomRecord(record.id);
  }
}
