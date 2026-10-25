import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TimePicker } from './TimePicker';
import { BookOpen, Heart, Star } from 'lucide-react';

interface OnboardingTimeSetupProps {
  onNext: () => void;
}

export const OnboardingTimeSetup: React.FC<OnboardingTimeSetupProps> = ({ onNext }) => {
  const [qtTime, setQtTime] = useState<string>('09:00');
  const [prayerTime, setPrayerTime] = useState<string>('21:00');
  const [gratitudeTime, setGratitudeTime] = useState<string>('22:00');

  const handleNext = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    localStorage.setItem('qt_reminder_enabled', 'true');
    localStorage.setItem('qt_reminder_time', qtTime);
    localStorage.setItem('prayer_reminder_enabled', 'true');
    localStorage.setItem('prayer_reminder_time', prayerTime);
    localStorage.setItem('gratitude_reminder_enabled', 'true');
    localStorage.setItem('gratitude_reminder_time', gratitudeTime);
    localStorage.setItem('onboarding_times', JSON.stringify({ qt: qtTime, prayer: prayerTime, gratitude: gratitudeTime }));
    onNext();
  };

  const categories = [
    { icon: BookOpen, color: '#4F8A5B', name: 'Q.T', desc: '오늘의 말씀을 나눠보세요', time: qtTime, setTime: setQtTime },
    { icon: Heart, color: '#7A6BB8', name: '기도', desc: '하루의 기도를 적어보세요', time: prayerTime, setTime: setPrayerTime },
    { icon: Star, color: '#C89B3C', name: '감사', desc: '감사했던 순간을 떠올려보세요', time: gratitudeTime, setTime: setGratitudeTime },
  ];

  return (
    // 1·3단계처럼 가운데 폭을 제한한다. 제한이 없으면 데스크톱(약 1024px)에서
    // 카드와 '다음' 버튼이 화면 끝까지 늘어나 오른쪽이 잘린 것처럼 보인다.
    <div className="flex flex-col h-full px-6 py-8 bg-[#FAFAF9] items-center">
      <div className="flex-1 w-full max-w-[420px] overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-[24px] font-bold leading-[32px] text-[#1F1F1F] mb-2">
            하루를 어떻게<br />하나님과 함께하고 싶나요?
          </h2>
          <p className="text-[14px] text-[#7A7A7A]">
            알림 받을 시간을 선택하세요
          </p>
        </div>

        <div className="space-y-3">
          {categories.map(({ icon: Icon, color, name, desc, time, setTime }) => (
            <div
              key={name}
              className="relative rounded-2xl bg-white overflow-hidden px-5 py-4 flex items-center gap-4"
              style={{ border: '1px solid #EFEFEF' }}
            >
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-[4px]" style={{ backgroundColor: color }} />
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-1"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />
              </div>
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-[#1F1F1F] mb-0.5">{name}</h3>
                <p className="text-[12px] text-[#7A7A7A] mb-2">{desc}</p>
                <TimePicker value={time} onChange={setTime} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 w-full max-w-[420px]">
        <Button
          onClick={handleNext}
          className="w-full h-12 rounded-full bg-[#1F1F1F] hover:bg-[#333] text-white text-[15px] font-semibold"
        >
          다음
        </Button>
      </div>
    </div>
  );
};
