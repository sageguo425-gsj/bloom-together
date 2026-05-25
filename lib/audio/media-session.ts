// 后台音频播放管理器
class BackgroundAudioManager {
  private audioContext: AudioContext | null = null;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  public isPlaying: boolean = false;

  // 初始化 Media Session
  initMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: '专注白噪音',
        artist: '规划助手',
        album: '番茄钟',
        artwork: [
          { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      // 设置控制按钮
      navigator.mediaSession.setActionHandler('play', () => {
        this.resumeAll();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        this.pauseAll();
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        this.stopAll();
      });

      // 更新播放状态
      navigator.mediaSession.playbackState = 'playing';
    }
  }

  // 创建音频上下文
  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // 恢复音频上下文（如果被暂停）
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  // 加载音频文件
  async loadAudio(soundId: string, audioUrl: string): Promise<AudioBuffer> {
    // 如果已经加载过，直接返回
    if (this.audioBuffers.has(soundId)) {
      return this.audioBuffers.get(soundId)!;
    }

    const audioContext = await this.initAudioContext();
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    this.audioBuffers.set(soundId, audioBuffer);
    return audioBuffer;
  }

  // 播放白噪音
  async play(soundId: string, audioUrl: string, volume: number = 0.5) {
    const audioContext = await this.initAudioContext();
    const audioBuffer = await this.loadAudio(soundId, audioUrl);

    // 如果已经在播放，先停止
    if (this.sources.has(soundId)) {
      this.stop(soundId);
    }

    // 创建音频源
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true; // 循环播放

    // 创建音量控制
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;

    // 连接节点
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 开始播放
    source.start(0);

    // 保存引用
    this.sources.set(soundId, source);
    this.gainNodes.set(soundId, gainNode);

    this.isPlaying = true;

    // 初始化 Media Session
    this.initMediaSession();

    return { source, gainNode };
  }

  // 停止播放
  stop(soundId: string) {
    const source = this.sources.get(soundId);
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // 已经停止了，忽略错误
      }
      this.sources.delete(soundId);
      this.gainNodes.delete(soundId);
    }

    // 如果没有音频在播放，更新状态
    if (this.sources.size === 0) {
      this.isPlaying = false;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  }

  // 调整音量
  setVolume(soundId: string, volume: number) {
    const gainNode = this.gainNodes.get(soundId);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }

  // 暂停所有
  pauseAll() {
    if (this.audioContext) {
      this.audioContext.suspend();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  }

  // 恢复所有
  resumeAll() {
    if (this.audioContext) {
      this.audioContext.resume();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    }
  }

  // 停止所有
  stopAll() {
    this.sources.forEach((source, soundId) => {
      this.stop(soundId);
    });

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // 获取当前播放的声音列表
  getPlayingSounds(): string[] {
    return Array.from(this.sources.keys());
  }
}

// 导出单例
export const audioManager = new BackgroundAudioManager();
