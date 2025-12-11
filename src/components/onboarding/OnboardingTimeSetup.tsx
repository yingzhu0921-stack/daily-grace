import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TimePicker } from './TimePicker';
import { BookOpen, Sparkles, Heart } from 'lucide-react';

interface OnboardingTimeSetupProps {
  onNext: () => void;
}

export const OnboardingTimeSetup: React.FC<OnboardingTimeSetupProps> = ({ onNext }) => {
  const [qtTime, setQtTime] = useState<string>('09:00');
  const [prayerTime, setPrayerTime] = useState<string>('21:00');
  const [gratitudeTime, setGratitudeTime] = useState<string>('22:00');

  const handleNext = async () => {
    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // 각 카테고리별 알림 설정 저장
    localStorage.setItem('qt_reminder_enabled', 'true');
    localStorage.setItem('qt_reminder_time', qtTime);
    localStorage.setItem('prayer_reminder_enabled', 'true');
    localStorage.setItem('prayer_reminder_time', prayerTime);
    localStorage.setItem('gratitude_reminder_enabled', 'true');
    localStorage.setItem('gratitude_reminder_time', gratitudeTime);
    
    // 레거시 호환성을 위한 저장
    localStorage.setItem('onboarding_times', JSON.stringify({
      qt: qtTime,
      prayer: prayerTime,
      gratitude: gratitudeTime
    }));
    
    onNext();
  };

  return (
    <div className="relative flex flex-col h-full px-6 py-8 overflow-hidden">
      {/* Background gradient blob */}
      <div 
        className="absolute top-1/3 right-0 w-[300px] h-[300px] rounded-full opacity-25 blur-[80px]"
        style={{ background: 'linear-gradient(135deg, #A57DB8 0%, #7DB87D 100%)' }}
      />
      
      <div className="flex-1 relative z-10">
        <div className="mb-8">
          <h2 className="text-[24px] font-bold leading-[32px] text-[#2E2E2E] mb-2">
            하루를 어떻게<br />하나님과 함께하고 싶나요?
          </h2>
          <p className="text-[15px] text-[#8B8B8B] leading-[22px]">
            알림 받을 시간을 선택하세요
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="h-[132px] rounded-[20px] px-5 py-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #7DB87D 0%, #6BA96B 100%)' }}>
            <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-white" strokeWidth={1.6} />
            </div>
            <div className="flex-1">
              <h3 className="text-[17px] font-semibold text-white mb-1">Q.T</h3>
              <p className="text-[13px] text-white/90 mb-2">오늘의 말씀을 나눠보세요</p>
              <TimePicker value={qtTime} onChange={setQtTime} />
            </div>
          </div>

          <div className="h-[132px] rounded-[20px] px-5 py-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #A57DB8 0%, #9569A8 100%)' }}>
            <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-white" strokeWidth={1.6} />
            </div>
            <div className="flex-1">
              <h3 className="text-[17px] font-semibold text-white mb-1">기도</h3>
              <p className="text-[13px] text-white/90 mb-2">하루의 기도를 적어보세요</p>
              <TimePicker value={prayerTime} onChange={setPrayerTime} />
            </div>
          </div>

          <div className="h-[132px] rounded-[20px] px-5 py-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #E8C87D 0%, #D9B66B 100%)' }}>
            <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-white" strokeWidth={1.6} />
            </div>
            <div className="flex-1">
              <h3 className="text-[17px] font-semibold text-white mb-1">감사</h3>
              <p className="text-[13px] text-white/90 mb-2">감사했던 순간을 떠올려보세요</p>
              <TimePicker value={gratitudeTime} onChange={setGratitudeTime} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full pt-4 relative z-10">
        <Button
          onClick={handleNext}
          className="w-full h-12 rounded-full bg-[#7DB87D] hover:bg-[#6da76d] text-white text-[15px] font-semibold shadow-md"
        >
          다음
        </Button>
      </div>
    </div>
  );
};
