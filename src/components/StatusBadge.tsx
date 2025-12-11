import { Check } from 'lucide-react';

type StatusBadgeProps = {
  completed: boolean;
  variant?: 'default' | 'compact';
};

export function StatusBadge({ completed, variant = 'default' }: StatusBadgeProps) {
  if (variant === 'compact') {
    return (
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
        completed ? 'bg-[#7DB87D]' : 'bg-[#E8E6E1]'
      }`}>
        {completed && <Check size={12} className="text-white" strokeWidth={3} />}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      completed 
        ? 'bg-[#7DB87D]/10 text-[#7DB87D]' 
        : 'bg-[#E8E6E1] text-[#7E7C78]'
    }`}>
      {completed ? (
        <>
          <Check size={12} strokeWidth={2.5} />
          <span>완료</span>
        </>
      ) : (
        <span>미작성</span>
      )}
    </div>
  );
}
