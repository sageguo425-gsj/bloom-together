import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioState {
  isPlaying: boolean;
  volume: number;
}

export function useWhiteNoise() {
  const [audioStates, setAudioStates] = useState<Record<string, AudioState>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const initAudio = useCallback((soundId: string, audioPath: string) => {
    if (!audioRefs.current[soundId]) {
      console.log('创建音频对象:', soundId, audioPath);
      const audio = new Audio();
      audio.loop = true;
      audio.volume = 0.5;
      audio.preload = 'none'; // 不预加载，等到播放时再加载

      audioRefs.current[soundId] = audio;

      setAudioStates((prev) => ({
        ...prev,
        [soundId]: { isPlaying: false, volume: 0.5 },
      }));

      // 延迟设置 src，避免立即加载
      setTimeout(() => {
        if (audioRefs.current[soundId]) {
          audioRefs.current[soundId].src = audioPath;
        }
      }, 100);
    }
  }, []);

  const togglePlay = useCallback(async (soundId: string, audioPath: string) => {
    console.log('togglePlay 被调用:', soundId);

    // 如果音频对象不存在，创建它
    if (!audioRefs.current[soundId]) {
      console.log('创建新的音频对象');
      const audio = new Audio(audioPath);
      audio.loop = true;
      audio.volume = audioStates[soundId]?.volume || 0.5;
      audioRefs.current[soundId] = audio;
    }

    const audio = audioRefs.current[soundId];
    console.log('音频对象:', audio);

    if (!audio) {
      console.error('音频对象不存在:', soundId);
      return;
    }

    try {
      if (audio.paused) {
        console.log('尝试播放音频...');
        await audio.play();
        console.log('音频播放成功');
        setAudioStates((prev) => ({
          ...prev,
          [soundId]: { ...prev[soundId], isPlaying: true },
        }));
      } else {
        console.log('暂停音频');
        audio.pause();
        setAudioStates((prev) => ({
          ...prev,
          [soundId]: { ...prev[soundId], isPlaying: false },
        }));
      }
    } catch (error) {
      console.error('播放音频失败:', error);
    }
  }, [audioStates]);

  const setVolume = useCallback((soundId: string, volume: number) => {
    const audio = audioRefs.current[soundId];
    if (!audio) return;

    audio.volume = volume;
    setAudioStates((prev) => ({
      ...prev,
      [soundId]: { ...prev[soundId], volume },
    }));
  }, []);

  const stopAll = useCallback(() => {
    Object.values(audioRefs.current).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    setAudioStates((prev) => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach((key) => {
        newStates[key].isPlaying = false;
      });
      return newStates;
    });
  }, []);

  const getCurrentMix = useCallback(() => {
    return Object.entries(audioStates)
      .filter(([_, state]) => state.isPlaying)
      .map(([soundId, state]) => ({
        soundId,
        volume: state.volume,
      }));
  }, [audioStates]);

  const loadMix = useCallback(async (mix: { soundId: string; volume: number }[]) => {
    stopAll();

    for (const item of mix) {
      const audio = audioRefs.current[item.soundId];
      if (audio) {
        audio.volume = item.volume;
        try {
          await audio.play();
          setAudioStates((prev) => ({
            ...prev,
            [item.soundId]: { isPlaying: true, volume: item.volume },
          }));
        } catch (error) {
          console.error('加载混音失败:', error);
        }
      }
    }
  }, [stopAll]);

  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  return {
    audioStates,
    initAudio,
    togglePlay,
    setVolume,
    stopAll,
    getCurrentMix,
    loadMix,
  };
}
