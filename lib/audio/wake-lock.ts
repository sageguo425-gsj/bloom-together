// Wake Lock 管理器 - 防止设备休眠
class WakeLockManager {
  private wakeLock: any = null;

  // 请求保持屏幕唤醒
  async request() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');

        console.log('Wake Lock 已激活');

        // 监听释放事件
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake Lock 已释放');
        });

        // 页面可见性变化时重新请求
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible' && this.wakeLock === null) {
            await this.request();
          }
        });
      }
    } catch (err) {
      console.error('Wake Lock 请求失败:', err);
    }
  }

  // 释放 Wake Lock
  release() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }
}

export const wakeLockManager = new WakeLockManager();
