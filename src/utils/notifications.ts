// 알림 관련 유틸리티 함수

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('이 브라우저는 알림을 지원하지 않습니다.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
  }
};

export const scheduleNotification = (title: string, body: string, time: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0
  );

  // 이미 지난 시간이면 다음날로 설정
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delay = scheduledTime.getTime() - now.getTime();

  setTimeout(() => {
    showNotification(title, { body });
    // 다음날 같은 시간에도 알림 (재귀)
    scheduleNotification(title, body, time);
  }, delay);
};

export const initializeDailyReminders = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  const isEnabled = localStorage.getItem('qt_reminder_enabled') === 'true';
  const reminderTime = localStorage.getItem('qt_reminder_time') || '09:00';

  if (isEnabled && Notification.permission === 'granted') {
    scheduleNotification(
      'Q.T 시간입니다 ⏰',
      '오늘의 말씀으로 하루를 시작해보세요.',
      reminderTime
    );
  }
};

// 적용 알림 체크
const checkApplicationReminders = () => {
  // 브라우저 환경 체크
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  const applicationReminders = JSON.parse(
    localStorage.getItem('application_reminders') || '{}'
  );

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const today = now.toISOString().split('T')[0];

  Object.entries(applicationReminders).forEach(([noteId, reminder]: [string, any]) => {
    if (!reminder.enabled) return;
    
    const [hours, minutes] = reminder.time.split(':').map(Number);
    const frequency = reminder.frequency || 'today';
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // 반복 주기 확인
    let shouldNotify = false;
    if (frequency === 'today') {
      const reminderDate = reminder.createdAt.split('T')[0];
      shouldNotify = reminderDate === today;
    } else if (frequency === 'daily') {
      shouldNotify = true;
    } else if (frequency === 'custom' && reminder.customDays) {
      shouldNotify = reminder.customDays.includes(dayOfWeek);
    }
    
    if (!shouldNotify) return;
    
    // 설정된 시간과 현재 시간이 일치하면 알림 표시
    if (currentHours === hours && currentMinutes === minutes) {
      const shownKey = `application_reminder_shown_${noteId}_${today}`;
      const lastShown = localStorage.getItem(shownKey);
      
      // 오늘 이미 알림을 보냈다면 다시 보내지 않음
      if (lastShown !== today) {
        showNotification('💡 오늘의 적용을 실천해보세요', {
          body: reminder.application || '작성한 적용 내용을 확인해보세요.',
          icon: '/favicon.ico',
          requireInteraction: true,
        });
        localStorage.setItem(shownKey, today);
        
        // 'today'인 경우에만 비활성화
        if (frequency === 'today') {
          reminder.enabled = false;
          localStorage.setItem('application_reminders', JSON.stringify(applicationReminders));
        }
      }
    }
  });
};

// 온보딩에서 설정한 매일 Q.T 알림 체크
const checkDailyQTReminder = () => {
  // 브라우저 환경 체크
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  const isEnabled = localStorage.getItem('qt_reminder_enabled') === 'true';
  const reminderTime = localStorage.getItem('qt_reminder_time') || '09:00';
  
  if (!isEnabled) return;

  const [hours, minutes] = reminderTime.split(':').map(Number);
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  // 설정된 시간과 현재 시간이 일치하면 알림 표시
  if (currentHours === hours && currentMinutes === minutes) {
    const lastShown = localStorage.getItem('last_daily_qt_reminder_shown');
    const today = now.toISOString().split('T')[0];

    // 오늘 이미 알림을 보냈다면 다시 보내지 않음
    if (lastShown !== today) {
      showNotification('Q.T 시간입니다 ⏰', {
        body: '오늘의 말씀으로 하루를 시작해보세요.',
        icon: '/favicon.ico',
        requireInteraction: false,
      });
      localStorage.setItem('last_daily_qt_reminder_shown', today);
    }
  }
};

// 매일 기도 알림 체크
const checkDailyPrayerReminder = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  const isEnabled = localStorage.getItem('prayer_reminder_enabled') === 'true';
  const reminderTime = localStorage.getItem('prayer_reminder_time') || '21:00';
  
  if (!isEnabled) return;

  const [hours, minutes] = reminderTime.split(':').map(Number);
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (currentHours === hours && currentMinutes === minutes) {
    const lastShown = localStorage.getItem('last_daily_prayer_reminder_shown');
    const today = now.toISOString().split('T')[0];

    if (lastShown !== today) {
      showNotification('기도 시간입니다 🙏', {
        body: '오늘 하루를 돌아보며 기도해보세요.',
        icon: '/favicon.ico',
        requireInteraction: false,
      });
      localStorage.setItem('last_daily_prayer_reminder_shown', today);
    }
  }
};

// 매일 감사 알림 체크
const checkDailyGratitudeReminder = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  const isEnabled = localStorage.getItem('gratitude_reminder_enabled') === 'true';
  const reminderTime = localStorage.getItem('gratitude_reminder_time') || '22:00';
  
  if (!isEnabled) return;

  const [hours, minutes] = reminderTime.split(':').map(Number);
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (currentHours === hours && currentMinutes === minutes) {
    const lastShown = localStorage.getItem('last_daily_gratitude_reminder_shown');
    const today = now.toISOString().split('T')[0];

    if (lastShown !== today) {
      showNotification('감사 시간입니다 ✨', {
        body: '오늘 감사했던 순간을 기록해보세요.',
        icon: '/favicon.ico',
        requireInteraction: false,
      });
      localStorage.setItem('last_daily_gratitude_reminder_shown', today);
    }
  }
};

// 앱 시작 시 알림 체크
export const checkAndShowReminder = () => {
  // 브라우저 환경 체크
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  try {
    checkDailyQTReminder(); // 매일 Q.T 알림
    checkDailyPrayerReminder(); // 매일 기도 알림
    checkDailyGratitudeReminder(); // 매일 감사 알림
    checkApplicationReminders(); // 적용 알림
  } catch (error) {
    console.error('알림 체크 중 오류:', error);
  }
};
