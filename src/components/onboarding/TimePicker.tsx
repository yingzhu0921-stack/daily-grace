import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const [hour, setHour] = useState(value?.split(':')[0] || '09');
  const [minute, setMinute] = useState(value?.split(':')[1] || '00');
  const [isOpen, setIsOpen] = useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleConfirm = () => {
    onChange(`${hour}:${minute}`);
    setIsOpen(false);
  };

  const displayTime = value || `${hour}:${minute}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-14 rounded-xl bg-[#F7F6F4] hover:bg-[#E8E7E5] text-[#2E2E2E] border border-[#E8E7E5] flex items-center justify-center gap-2 text-base"
        >
          <Clock size={18} className="text-[#7DB87D]" />
          <span className="font-medium">{displayTime}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-5 pointer-events-auto" align="center">
        <div className="space-y-5">
          <div className="text-base font-semibold text-center">시간 설정</div>
          <div className="flex gap-3 items-center justify-center">
            <div className="flex flex-col gap-2">
              <div className="text-sm text-muted-foreground text-center font-medium">시</div>
              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="w-20 h-12 p-3 text-base rounded-lg border-2 border-[#E8E7E5] bg-[#F7F6F4] text-[#2E2E2E] text-center focus:outline-none focus:ring-2 focus:ring-[#7DB87D] cursor-pointer"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-3xl font-bold mt-6">:</div>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-muted-foreground text-center font-medium">분</div>
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="w-20 h-12 p-3 text-base rounded-lg border-2 border-[#E8E7E5] bg-[#F7F6F4] text-[#2E2E2E] text-center focus:outline-none focus:ring-2 focus:ring-[#7DB87D] cursor-pointer"
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={handleConfirm}
            className="w-full h-12 bg-[#7DB87D] hover:bg-[#6da76d] text-white text-base font-medium"
          >
            확인
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
