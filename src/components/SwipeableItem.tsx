import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DeleteRecordDialog } from './DeleteRecordDialog';

type SwipeableItemProps = {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editColor?: string;
  deleteColor?: string;
  /**
   * 무엇을 지우는지('Q.T 기록' 등). 주면 지우기 전에 한 번 묻는다.
   * 전에는 목록 화면에서 밀어서 휴지통을 누르면 확인 없이 바로 지워졌다.
   */
  deleteLabel?: string;
};

export function SwipeableItem({ 
  children, 
  onEdit, 
  onDelete,
  editColor = '#6BAAB8',
  deleteColor = '#E06B6B',
  deleteLabel,
}: SwipeableItemProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-120, -60, 0], [1, 1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = -60;
    if (info.offset.x < threshold) {
      setIsRevealed(true);
    } else {
      setIsRevealed(false);
    }
  };

  const handleEdit = () => {
    setIsRevealed(false);
    onEdit?.();
  };

  const handleDelete = () => {
    setIsRevealed(false);
    if (deleteLabel) setConfirmOpen(true);
    else onDelete?.();
  };

  return (
    <div className="relative overflow-hidden">
      {/* 배경 버튼들 */}
      <motion.div 
        className="absolute right-0 top-0 h-full flex items-center gap-2 pr-3"
        style={{ opacity }}
      >
        {onEdit && (
          <button
            onClick={handleEdit}
            className="w-14 h-full min-h-[56px] rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: editColor }}
          >
            <Pencil className="w-5 h-5 text-white" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="w-14 h-full min-h-[56px] rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: deleteColor }}
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        )}
      </motion.div>

      {/* 스와이프 가능한 콘텐츠 */}
      <motion.div
        drag="x"
        dragConstraints={{ left: onEdit && onDelete ? -140 : onDelete ? -70 : onEdit ? -70 : 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isRevealed ? (onEdit && onDelete ? -140 : -70) : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ x }}
        className="relative bg-[#FAF9F7]"
      >
        {children}
      </motion.div>
      {deleteLabel && (
        <DeleteRecordDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          label={deleteLabel}
          onConfirm={() => onDelete?.()}
        />
      )}
    </div>
  );
}
