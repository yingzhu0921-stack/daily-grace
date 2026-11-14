import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TimePicker } from './TimePicker';
import { AppIcon, type IconName } from '@/components/ui/AppIcon';
import { tintColor } from '@/utils/tintColor';

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

  // 색은 홈·기록 메뉴의 기본 카테고리 색과 같게 둔다(Index.tsx·Records.tsx·CategoryManager.tsx).
  const categories = [
    { icon: 'bookOpen' as IconName, color: '#7DB87D', name: 'Q.T', desc: '오늘의 말씀을 나눠보세요', time: qtTime, setTime: setQtTime },
    { icon: 'hands' as IconName, color: '#A57DB8', name: '기도', desc: '하루의 기도를 적어보세요', time: prayerTime, setTime: setPrayerTime },
    { icon: 'sun' as IconName, color: '#E8C87D', name: '감사', desc: '감사했던 순간을 떠올려보세요', time: gratitudeTime, setTime: setGratitudeTime },
  ];

  return (
    // 1·3단계처럼 가운데 폭을 제한한다. 제한이 없으면 데스크톱(약 1024px)에서
    // 카드와 '다음' 버튼이 화면 끝까지 늘어나 오른쪽이 잘린 것처럼 보인다.
    <div className="flex flex-col h-full px-6 py-6 bg-[#F6F3EC] items-center">
      <div className="flex-1 w-full max-w-[420px] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-[22px] font-bold leading-[30px] tracking-[-0.02em] text-[#1E1C1A] mb-1.5">
            하루를 어떻게<br />하나님과 함께하고 싶나요?
          </h2>
          <p className="text-[13.5px] text-[#6E675E]">
            알림 받을 시간을 선택하세요
          </p>
          {/* 2026-11-14 사용자: 알림 기능은 현재 준비 중(앱을 열어 둔 동안에만 온다)이라고 미리 알린다. */}
          <p className="mt-3 rounded-xl bg-white border border-[rgba(30,28,26,0.12)] px-3.5 py-2.5 text-[12.5px] leading-5 text-[#6E675E]">
            <span className="font-bold text-[#1E1C1A]">알림 기능은 현재 준비 중이에요.</span> 지금은 앱을 열어 둔 동안에만 알림이 와요.
          </p>
        </div>

        <div className="space-y-3">
          {categories.map(({ icon, color, name, desc, time, setTime }) => (
            // 한 줄 카드. 전에는 시간 버튼이 카드마다 큰 한 줄을 차지해서 세 장이 한 화면에 안 들어갔다
            // (아이폰 14 사파리에서 감사 카드가 잘리고, SE 에선 두 장만 보였다).
            <div
              key={name}
              className="relative rounded-2xl bg-white px-4 py-3.5 flex items-center gap-3 border border-[rgba(30,28,26,0.12)]"
            >
              {/* 기록 종류 색은 아이콘 칸에만(홈 루틴과 같게) */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: tintColor(color) }}
              >
                <AppIcon name={icon} size={20} color="#1E1C1A" />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-[#1E1C1A] mb-0.5">{name}</h3>
                <p className="text-[12px] text-[#8A8278] truncate">{desc}</p>
              </div>
              <div className="shrink-0">
                <TimePicker value={time} onChange={setTime} compact />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 w-full max-w-[420px]">
        <Button
          onClick={handleNext}
          className="w-full h-12 rounded-full bg-[#1E1C1A] hover:bg-[#333] text-white text-[15px] font-semibold"
        >
          다음
        </Button>
      </div>
    </div>
  );
};
