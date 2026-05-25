export function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch((error) => {
      console.warn('播放通知音效失败:', error);
    });
  } catch (error) {
    console.error('创建音频失败:', error);
  }
}

export function playSuccessSound() {
  try {
    const audio = new Audio('/sounds/success.mp3');
    audio.volume = 0.6;
    audio.play().catch((error) => {
      console.warn('播放成功音效失败:', error);
    });
  } catch (error) {
    console.error('创建音频失败:', error);
  }
}

export function playTickSound() {
  try {
    const audio = new Audio('/sounds/tick.mp3');
    audio.volume = 0.3;
    audio.play().catch((error) => {
      console.warn('播放滴答音效失败:', error);
    });
  } catch (error) {
    console.error('创建音频失败:', error);
  }
}
