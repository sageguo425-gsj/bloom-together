export function vibrate(pattern: number | number[]) {
  if (!('vibrate' in navigator)) {
    console.warn('设备不支持震动 API');
    return false;
  }

  try {
    return navigator.vibrate(pattern);
  } catch (error) {
    console.error('震动失败:', error);
    return false;
  }
}

export const vibrationPatterns = {
  short: 200,
  medium: 400,
  long: 600,
  success: [200, 100, 200],
  warning: [100, 50, 100, 50, 100],
  error: [400, 200, 400],
  notification: [200, 100, 200, 100, 200],
};

export function vibrateSuccess() {
  return vibrate(vibrationPatterns.success);
}

export function vibrateWarning() {
  return vibrate(vibrationPatterns.warning);
}

export function vibrateError() {
  return vibrate(vibrationPatterns.error);
}

export function vibrateNotification() {
  return vibrate(vibrationPatterns.notification);
}
