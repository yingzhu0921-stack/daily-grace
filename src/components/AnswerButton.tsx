import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function AnswerButton({
  answered,
  onToggle,
}: {
  answered: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[14px] font-medium transition-all duration-200
        ${
          answered
            ? 'bg-[#333333] text-white border border-[#333333]'
            : 'bg-white text-[#333333] border border-[#E3E2E0] hover:bg-[#F3F2F1]'
        }`}
    >
      {answered && <Check size={15} strokeWidth={2} />}
      {answered ? '응답됨' : '응답'}
    </motion.button>
  );
}
