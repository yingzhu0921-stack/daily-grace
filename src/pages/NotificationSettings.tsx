import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, HelpCircle, Bell, Trash2, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { TimePicker } from '@/components/onboarding/TimePicker';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [qtEnabled, setQtEnabled] = useState(false);
  const [qtTime, setQtTime] = useState('07:00');
  const [prayerEnabled, setPrayerEnabled] = useState(false);
  const [prayerTime, setPrayerTime] = useState('09:00');
  const [gratitudeEnabled, setGratitudeEnabled] = useState(false);
  const [gratitudeTime, setGratitudeTime] = useState('21:00');
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [applicationReminders, setApplicationReminders] = useState<Record<string, any>>({});

  useEffect(() => {
    // 안전하게 Notification API 지원 여부 체크
    try {
      if ('Notification' in window) {
        setNotificationSupported(true);
        setPermissionGranted(Notification.permission === 'granted');
      }
    } catch (error) {
      console.error('Notification API check failed:', error);
      setNotificationSupported(false);
    }

    // 저장된 설정 로드
    try {
      const qtReminder = localStorage.getItem('qt_reminder_time');
      const prayerReminder = localStorage.getItem('prayer_reminder_time');
      const gratitudeReminder = localStorage.getItem('gratitude_reminder_time');

      if (qtReminder) {
        setQtEnabled(true);
        setQtTime(qtReminder);
      }
      if (prayerReminder) {
        setPrayerEnabled(true);
        setPrayerTime(prayerReminder);
      }
      if (gratitudeReminder) {
        setGratitudeEnabled(true);
        setGratitudeTime(gratitudeReminder);
      }

      // 적용 알림 로드
      const reminders = JSON.parse(
        localStorage.getItem('application_reminders') || '{}'
      );
      setApplicationReminders(reminders);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }, []);

  const handleToggle = async (
    type: 'qt' | 'prayer' | 'gratitude',
    enabled: boolean,
    setEnabled: (value: boolean) => void
  ) => {
    if (!notificationSupported) {
      alert('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }

    // 사용자가 토글을 켰을 때만 권한 요청
    if (enabled && !permissionGranted) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('알림 권한이 필요합니다. 브라우저 설정에서 알림을 허용해주세요.');
          return;
        }
        setPermissionGranted(true);
      } catch (error) {
        console.error('Permission request failed:', error);
        alert('알림 권한 요청에 실패했습니다.');
        return;
      }
    }

    setEnabled(enabled);

    // 로컬스토리지에 저장
    const storageKey = `${type}_reminder_time`;
    if (enabled) {
      const time = type === 'qt' ? qtTime : type === 'prayer' ? prayerTime : gratitudeTime;
      localStorage.setItem(storageKey, time);
    } else {
      localStorage.removeItem(storageKey);
    }
  };

  const handleTimeChange = (
    type: 'qt' | 'prayer' | 'gratitude',
    time: string,
    setTime: (value: string) => void
  ) => {
    setTime(time);
    const storageKey = `${type}_reminder_time`;
    localStorage.setItem(storageKey, time);
  };

  const handleDeleteApplicationReminder = (reminderId: string) => {
    const updatedReminders = { ...applicationReminders };
    delete updatedReminders[reminderId];
    localStorage.setItem('application_reminders', JSON.stringify(updatedReminders));
    setApplicationReminders(updatedReminders);
    toast({
      title: "알림이 삭제되었습니다",
      description: "적용 알림이 제거되었습니다.",
    });
  };

  const toggleApplicationReminder = (reminderId: string) => {
    const updatedReminders = { ...applicationReminders };
    updatedReminders[reminderId].enabled = !updatedReminders[reminderId].enabled;
    localStorage.setItem('application_reminders', JSON.stringify(updatedReminders));
    setApplicationReminders(updatedReminders);
  };

  const updateApplicationReminderTime = (reminderId: string, newTime: string) => {
    const updatedReminders = { ...applicationReminders };
    updatedReminders[reminderId].time = newTime;
    localStorage.setItem('application_reminders', JSON.stringify(updatedReminders));
    setApplicationReminders(updatedReminders);
  };

  const updateApplicationFrequency = (reminderId: string, frequency: string, customDays?: number[]) => {
    const updatedReminders = { ...applicationReminders };
    updatedReminders[reminderId].frequency = frequency;
    if (customDays) {
      updatedReminders[reminderId].customDays = customDays;
    }
    localStorage.setItem('application_reminders', JSON.stringify(updatedReminders));
    setApplicationReminders(updatedReminders);
  };

  const getFrequencyLabel = (reminder: any) => {
    if (!reminder.frequency || reminder.frequency === 'today') return '오늘만';
    if (reminder.frequency === 'daily') return '매일';
    if (reminder.frequency === 'custom' && reminder.customDays) {
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      return reminder.customDays.map((d: number) => dayNames[d]).join(', ');
    }
    return '오늘만';
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#F0EFED]">
        <button onClick={() => navigate('/settings')} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-[#2E2E2E]" />
        </button>
        <h1 className="text-base font-medium text-[#2E2E2E] absolute left-1/2 transform -translate-x-1/2">
          알림 설정
        </h1>
        <div className="w-10" />
      </header>

      <div className="px-5 py-6 space-y-6">
        {!notificationSupported && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">
              이 브라우저는 알림 기능을 지원하지 않습니다.
            </p>
          </div>
        )}

        {/* Q.T 알림 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#7DB87D]/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#7DB87D]" />
              </div>
              <span className="text-[15px] font-medium text-[#2E2E2E]">Q.T 알림</span>
            </div>
            <Switch
              checked={qtEnabled}
              onCheckedChange={(checked) => handleToggle('qt', checked, setQtEnabled)}
              disabled={!notificationSupported}
            />
          </div>
          {qtEnabled && (
            <div className="ml-10 pl-4 border-l-2 border-[#E8E7E5]">
              <TimePicker
                value={qtTime}
                onChange={(time) => handleTimeChange('qt', time, setQtTime)}
              />
            </div>
          )}
        </div>

        {/* 기도 알림 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#A57DB8]/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#A57DB8]" />
              </div>
              <span className="text-[15px] font-medium text-[#2E2E2E]">기도 알림</span>
            </div>
            <Switch
              checked={prayerEnabled}
              onCheckedChange={(checked) => handleToggle('prayer', checked, setPrayerEnabled)}
              disabled={!notificationSupported}
            />
          </div>
          {prayerEnabled && (
            <div className="ml-10 pl-4 border-l-2 border-[#E8E7E5]">
              <TimePicker
                value={prayerTime}
                onChange={(time) => handleTimeChange('prayer', time, setPrayerTime)}
              />
            </div>
          )}
        </div>

        {/* 감사 알림 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E8C87D]/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#E8C87D]" />
              </div>
              <span className="text-[15px] font-medium text-[#2E2E2E]">감사 알림</span>
            </div>
            <Switch
              checked={gratitudeEnabled}
              onCheckedChange={(checked) => handleToggle('gratitude', checked, setGratitudeEnabled)}
              disabled={!notificationSupported}
            />
          </div>
          {gratitudeEnabled && (
            <div className="ml-10 pl-4 border-l-2 border-[#E8E7E5]">
              <TimePicker
                value={gratitudeTime}
                onChange={(time) => handleTimeChange('gratitude', time, setGratitudeTime)}
              />
            </div>
          )}
        </div>

        {/* 적용 알림 섹션 */}
        {Object.keys(applicationReminders).length > 0 && (
          <div className="pt-6 border-t border-[#F0EFED] space-y-4">
            <h2 className="text-[15px] font-semibold text-[#2E2E2E] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7DB87D]" />
              나의 적용 알림
            </h2>
            <div className="space-y-3">
              {Object.entries(applicationReminders).map(([reminderId, reminder]: [string, any]) => (
                <div
                  key={reminderId}
                  className="bg-white rounded-2xl p-4 space-y-3 border border-[#F0EFED]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[#2E2E2E] truncate">
                        {reminder.title || '제목 없음'}
                      </p>
                      <p className="text-[12px] text-[#8A8A8A] mt-1 truncate">
                        {reminder.application || '적용 내용 없음'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteApplicationReminder(reminderId)}
                      className="ml-2 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F0EFED]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#7DB87D]" />
                      <span className="text-[13px] text-[#5A5A5A]">{reminder.time}</span>
                      <span className="text-[12px] text-[#8A8A8A]">・{getFrequencyLabel(reminder)}</span>
                    </div>
                    <Switch
                      checked={reminder.enabled}
                      onCheckedChange={() => toggleApplicationReminder(reminderId)}
                      disabled={!notificationSupported}
                    />
                  </div>

                  {reminder.enabled && (
                    <div className="space-y-2 pt-2 border-t border-[#F0EFED]">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#5A5A5A] min-w-[60px]">시간</span>
                        <input
                          type="time"
                          value={reminder.time}
                          onChange={(e) => updateApplicationReminderTime(reminderId, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-[13px] text-[#2E2E2E] bg-[#F7F6F4] border border-[#E8E7E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7DB87D]"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#5A5A5A] min-w-[60px]">반복</span>
                        <select
                          value={reminder.frequency || 'today'}
                          onChange={(e) => updateApplicationFrequency(reminderId, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-[13px] text-[#2E2E2E] bg-[#F7F6F4] border border-[#E8E7E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7DB87D]"
                        >
                          <option value="today">오늘만</option>
                          <option value="daily">매일</option>
                          <option value="custom">요일 선택</option>
                        </select>
                      </div>

                      {reminder.frequency === 'custom' && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => {
                            const isSelected = reminder.customDays?.includes(index);
                            return (
                              <button
                                key={day}
                                onClick={() => {
                                  const currentDays = reminder.customDays || [];
                                  const newDays = isSelected
                                    ? currentDays.filter((d: number) => d !== index)
                                    : [...currentDays, index].sort();
                                  updateApplicationFrequency(reminderId, 'custom', newDays);
                                }}
                                className={`px-3 py-1.5 text-[12px] rounded-full transition-colors ${
                                  isSelected
                                    ? 'bg-[#7DB87D] text-white'
                                    : 'bg-[#F7F6F4] text-[#8A8A8A] hover:bg-[#E8E7E5]'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 시간 재설정 버튼 */}
        <div className="pt-6 border-t border-[#F0EFED]">
          <Button
            onClick={() => {
              setQtTime('09:00');
              setPrayerTime('21:00');
              setGratitudeTime('22:00');
              localStorage.setItem('qt_reminder_time', '09:00');
              localStorage.setItem('prayer_reminder_time', '21:00');
              localStorage.setItem('gratitude_reminder_time', '22:00');
              toast({
                title: "시간이 초기화되었습니다",
                description: "기본 시간으로 재설정되었습니다.",
              });
            }}
            variant="outline"
            className="w-full h-12 text-[#7E7C78] hover:text-[#2E2E2E] hover:bg-[#F7F6F4] border-[#E8E7E5]"
          >
            시간 다시 설정
          </Button>
        </div>

        {/* 도움말 */}
        <div className="pt-4">
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 text-[13px] text-[#7E7C78] hover:text-[#2E2E2E]">
                <HelpCircle className="w-4 h-4" />
                <span>알림이 오지 않나요?</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[340px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-[18px] font-semibold text-[#2E2E2E]">
                  알림 설정 도움말
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-[14px] text-[#5A5A5A] leading-relaxed">
                <p>알림을 받으려면 다음을 확인해주세요:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>브라우저의 알림 권한이 허용되어 있는지 확인</li>
                  <li>기기의 방해금지 모드가 꺼져있는지 확인</li>
                  <li>브라우저 탭이 완전히 닫히지 않도록 유지</li>
                  <li>앱을 자주 방문하여 활성 상태 유지</li>
                </ul>
                <p className="text-[12px] text-[#8A8A8A] pt-2">
                  * 일부 모바일 브라우저에서는 알림이 제한될 수 있습니다.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
