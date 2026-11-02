import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * 받침이 있으면 앞엣것, 없으면 뒤엣것. "일기을" 같은 말이 나오지 않게 한다.
 * 카테고리 이름은 사용자가 지어서 무엇이 올지 모르므로 꼭 필요하다.
 * 한글이 아닌 글자로 끝나면 받침 있는 쪽으로 둔다(숫자·영문은 읽는 사람마다 달라서,
 * 어느 쪽이든 어색하면 이름 자체를 바꾸는 편이 낫다).
 */
function josa(word: string, withFinal: string, withoutFinal: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return withFinal;
  return (code - 0xac00) % 28 === 0 ? withoutFinal : withFinal;
}

/**
 * 기록을 지우기 전 한 번 묻는다.
 *
 * Q.T(MeditationView)에만 이 확인이 있었고 일기·감사·기도·커스텀 기록은 누르는 즉시
 * 지워졌다. 되돌릴 방법도 없어서, 삭제하기를 잘못 누르면 그대로 날아갔다.
 * 화면마다 따로 쓰면 또 빠지는 곳이 생기므로 한 곳에 둔다.
 */
export const DeleteRecordDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** '묵상', '일기' 처럼 무엇을 지우는지. 문장에 그대로 들어간다. */
  label: string;
  onConfirm: () => void;
}> = ({ open, onOpenChange, label, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {label}{josa(label, '을', '를')} 삭제하시겠어요?
        </AlertDialogTitle>
        <AlertDialogDescription>
          삭제된 {label}{josa(label, '은', '는')} 복구할 수 없습니다.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>취소</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>삭제</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
